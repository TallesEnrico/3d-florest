import { useCallback, useEffect, useMemo, useRef } from 'react'
import { trackingConfig } from '../config/trackingConfig.ts'
import { createFaceTracker, type FaceTracker } from '../services/mediapipe.ts'
import { closeWebcam, openWebcam, WebcamError } from '../services/webcam.ts'
import { initialHeadTrackingState, useHeadTrackingStore } from '../store/headTrackingStore.ts'
import type { FaceMeasurement, HeadTrackingControls } from '../types/index.ts'
import { measurementToOffset, NeutralCalibration } from '../utils/calibration.ts'
import { HoldGesture } from '../utils/headGesture.ts'
import { OneEuroFilter } from '../utils/oneEuroFilter.ts'

const { video: videoOptions, calibration, sensitivity, filter, faceLostTimeoutMs, offscreenReleaseMs } =
  trackingConfig
const ZERO = { x: 0, y: 0 }
const NO_GESTURE = { direction: null, progress: 0, engaged: false, intensity: 0 }
const setState = useHeadTrackingStore.setState
// Back to the mouse (camera off, denied, failed, or tab hidden).
const MOUSE_INPUT = {
  source: 'mouse',
  active: false,
  offset: ZERO,
  confidence: 0,
  pitch: 0,
  gesture: NO_GESTURE,
} as const

/** Mutable session state; lives in a ref, never in React state. */
interface Runtime {
  video: HTMLVideoElement | null
  tracker: FaceTracker | null
  /** In-flight model load, shared so two starts never create two landmarkers. */
  trackerLoad: Promise<FaceTracker> | null
  cancelFrame: (() => void) | null
  /** Bumped on every start/stop: async work from an older start must not apply. */
  token: number
  /** A start() is between its first await and the loop starting. */
  starting: boolean
  /** The user asked for the camera (survives hiding the tab). */
  wantsCamera: boolean
  disposed: boolean
  calibration: NeutralCalibration
  filterX: OneEuroFilter
  filterY: OneEuroFilter
  filterPitch: OneEuroFilter
  gesture: HoldGesture
  presence: boolean[]
  lastSeen: number
}

function createRuntime(): Runtime {
  return {
    video: null,
    tracker: null,
    trackerLoad: null,
    cancelFrame: null,
    token: 0,
    starting: false,
    wantsCamera: false,
    disposed: false,
    calibration: new NeutralCalibration(calibration.samples),
    filterX: new OneEuroFilter(filter),
    filterY: new OneEuroFilter(filter),
    filterPitch: new OneEuroFilter(trackingConfig.gesture.filter),
    gesture: new HoldGesture(trackingConfig.gesture),
    presence: [],
    lastSeen: 0,
  }
}

function resetSignal(runtime: Runtime) {
  runtime.calibration.reset()
  runtime.filterX.reset()
  runtime.filterY.reset()
  runtime.filterPitch.reset()
  runtime.gesture.reset()
  runtime.presence = []
  runtime.lastSeen = performance.now()
}

function releaseCamera(runtime: Runtime) {
  runtime.cancelFrame?.()
  runtime.cancelFrame = null
  closeWebcam(runtime.video)
  runtime.video = null
}

/** Loads the landmarker once; concurrent callers share the same promise. */
function loadTracker(runtime: Runtime): Promise<FaceTracker> {
  if (runtime.tracker) return Promise.resolve(runtime.tracker)
  runtime.trackerLoad ??= createFaceTracker().then(
    (tracker) => {
      runtime.trackerLoad = null
      if (runtime.disposed) {
        tracker.close()
        throw new Error('Head tracking was unmounted while the model loaded')
      }
      runtime.tracker = tracker
      return tracker
    },
    (error: unknown) => {
      runtime.trackerLoad = null
      throw error
    },
  )
  return runtime.trackerLoad
}

/**
 * Releases the camera but keeps the user's intent, so returning (tab visible, hero back in
 * view) restarts it without another click. Cancels an in-flight start through the token.
 */
function suspendCamera(runtime: Runtime) {
  runtime.token++
  runtime.starting = false
  releaseCamera(runtime)
  setState({ ...MOUSE_INPUT, webcam: 'idle', tracking: 'idle' })
}

/** Turns one detection into store updates: calibration → offset → filter, or face-lost handling. */
function processFrame(runtime: Runtime, measurement: FaceMeasurement | null, elapsedMs: number) {
  const now = performance.now()
  const presence = runtime.presence
  presence.push(measurement !== null)
  if (presence.length > trackingConfig.confidence.window) presence.shift()
  const presenceRatio = presence.filter(Boolean).length / presence.length
  const inferenceMs = useHeadTrackingStore.getState().inferenceMs * 0.9 + elapsedMs * 0.1

  if (!measurement) {
    if (now - runtime.lastSeen > faceLostTimeoutMs) {
      // Let the scene ease back to neutral; restart the filter so reacquiring doesn't lag.
      runtime.filterX.reset()
      runtime.filterY.reset()
      runtime.filterPitch.reset()
      runtime.gesture.reset()
      setState({
        tracking: 'searching',
        offset: ZERO,
        confidence: 0,
        pitch: 0,
        gesture: NO_GESTURE,
        inferenceMs,
      })
    }
    return
  }

  runtime.lastSeen = now
  const confidence = presenceRatio * measurement.edgeFactor
  const neutral = runtime.calibration.add(measurement)
  if (!neutral) {
    setState({ tracking: 'calibrating', offset: ZERO, confidence, inferenceMs })
    return
  }
  const raw = measurementToOffset(measurement, neutral, sensitivity)
  const offset = { x: runtime.filterX.filter(raw.x, now), y: runtime.filterY.filter(raw.y, now) }
  const pitch =
    measurement.pitch === null ? 0 : runtime.filterPitch.filter(measurement.pitch - neutral.pitch, now)
  setState({ tracking: 'tracking', offset, confidence, pitch, inferenceMs })

  // Head navigation (opt-in): tilt-hold-and-keep gesture, only on trustworthy frames.
  if (!useHeadTrackingStore.getState().navigation) return
  const valid = measurement.pitch !== null && confidence >= trackingConfig.gesture.minConfidence
  setState({ gesture: runtime.gesture.update(pitch, now, valid) })
}

/** Any failure falls back to the mouse with a calm status; details go to the debug panel. */
function failTracking(runtime: Runtime, error: unknown) {
  runtime.wantsCamera = false
  releaseCamera(runtime)
  setState({
    ...MOUSE_INPUT,
    navigation: false,
    webcam: error instanceof WebcamError ? error.status : 'error',
    tracking: 'idle',
    errorDetail: error instanceof Error ? error.message : String(error),
  })
}

/**
 * Runs detection once per new video frame (≤ camera fps), never per render frame.
 * Also fails over to the mouse if the camera goes away (unplugged, revoked, taken by another app).
 */
function startLoop(runtime: Runtime, video: HTMLVideoElement, tracker: FaceTracker) {
  const useVideoFrames = 'requestVideoFrameCallback' in video
  const tracks = (video.srcObject as MediaStream).getTracks()
  let handle = 0
  let lastVideoTime = -1
  let stopped = false

  const stop = () => {
    stopped = true
    tracks.forEach((track) => track.removeEventListener('ended', onTrackEnded))
    if (useVideoFrames) video.cancelVideoFrameCallback(handle)
    else cancelAnimationFrame(handle)
  }
  const onTrackEnded = () => {
    failTracking(runtime, new WebcamError('unavailable', 'The camera track ended'))
  }

  const step = () => {
    if (stopped) return
    if (video.readyState >= 2 && video.currentTime !== lastVideoTime) {
      lastVideoTime = video.currentTime
      const start = performance.now()
      try {
        processFrame(runtime, tracker.detect(video), performance.now() - start)
      } catch (error) {
        // The landmarker itself may be broken (e.g. GPU context lost): drop it so a retry
        // reloads it and can fall back to the CPU delegate.
        tracker.close()
        runtime.tracker = null
        failTracking(runtime, error)
        return
      }
    }
    handle = useVideoFrames ? video.requestVideoFrameCallback(step) : requestAnimationFrame(step)
  }

  tracks.forEach((track) => track.addEventListener('ended', onTrackEnded))
  runtime.cancelFrame = stop
  step()
}

interface UseHeadTrackingOptions {
  /** Whether the scene is on screen; off screen, detection pauses and the camera is released. */
  inView?: boolean
}

/**
 * Webcam + MediaPipe head tracking. Publishes a normalized offset to headTrackingStore.
 * The camera is only requested by start() (a user gesture) and is released on stop(), when the
 * tab is hidden or the scene stays off screen (both resume on return), and on unmount.
 */
export function useHeadTracking({ inView = true }: UseHeadTrackingOptions = {}): HeadTrackingControls {
  const runtimeRef = useRef<Runtime | null>(null)
  const getRuntime = useCallback(() => (runtimeRef.current ??= createRuntime()), [])
  const inViewRef = useRef(inView)

  const start = useCallback(async () => {
    const runtime = getRuntime()
    const token = ++runtime.token
    runtime.wantsCamera = true
    runtime.starting = true
    releaseCamera(runtime)
    setState({ webcam: 'requesting', errorDetail: null })

    try {
      const video = await openWebcam(videoOptions)
      if (token !== runtime.token) return closeWebcam(video)
      if (document.hidden) {
        // Granted while the tab was hidden: don't keep the light on; resume on return.
        closeWebcam(video)
        setState({ ...MOUSE_INPUT, webcam: 'idle', tracking: 'idle' })
        return
      }
      runtime.video = video
      setState({ webcam: 'active' })

      if (!runtime.tracker) setState({ tracking: 'loading' })
      const tracker = await loadTracker(runtime)
      if (token !== runtime.token) return

      resetSignal(runtime)
      setState({
        source: 'webcam',
        active: true,
        tracking: 'calibrating',
        offset: ZERO,
        delegate: tracker.delegate,
      })
      // Scrolled away while loading: the in-view effect starts the loop on return.
      if (inViewRef.current) startLoop(runtime, video, tracker)
    } catch (error) {
      if (token === runtime.token && !runtime.disposed) failTracking(runtime, error)
    } finally {
      if (token === runtime.token) runtime.starting = false
    }
  }, [getRuntime])

  const stop = useCallback(() => {
    const runtime = getRuntime()
    runtime.token++
    runtime.starting = false
    runtime.wantsCamera = false
    releaseCamera(runtime)
    setState({ ...MOUSE_INPUT, navigation: false, webcam: 'idle', tracking: 'idle' })
  }, [getRuntime])

  const recalibrate = useCallback(() => {
    const runtime = getRuntime()
    if (!runtime.cancelFrame) return
    resetSignal(runtime)
    setState({ tracking: 'calibrating', offset: ZERO })
  }, [getRuntime])

  // Hidden tab: release the camera (light off), hand control back to the mouse, and resume
  // when the user comes back.
  useEffect(() => {
    const onVisibilityChange = () => {
      const runtime = getRuntime()
      if (document.hidden) {
        if (runtime.video || runtime.starting) suspendCamera(runtime)
      } else if (runtime.wantsCamera && !runtime.video && !runtime.starting && inViewRef.current) {
        void start()
      }
    }
    document.addEventListener('visibilitychange', onVisibilityChange)
    return () => document.removeEventListener('visibilitychange', onVisibilityChange)
  }, [getRuntime, start])

  // Scene off screen: stop detecting at once, release the camera after a grace period.
  // Back on screen: resume the loop, or reopen the camera if it was released.
  useEffect(() => {
    inViewRef.current = inView
    const runtime = getRuntime()
    if (inView) {
      if (runtime.video && runtime.tracker && !runtime.cancelFrame) {
        runtime.filterX.reset()
        runtime.filterY.reset()
        runtime.lastSeen = performance.now()
        startLoop(runtime, runtime.video, runtime.tracker)
      } else if (runtime.wantsCamera && !runtime.video && !runtime.starting && !document.hidden) {
        void start()
      }
      return
    }
    runtime.cancelFrame?.()
    runtime.cancelFrame = null
    if (!runtime.video && !runtime.starting) return
    const timer = window.setTimeout(() => suspendCamera(runtime), offscreenReleaseMs)
    return () => window.clearTimeout(timer)
  }, [inView, getRuntime, start])

  // Unmount: stop everything and free the model.
  useEffect(
    () => () => {
      const runtime = runtimeRef.current
      if (!runtime) return
      runtime.token++
      runtime.wantsCamera = false
      runtime.disposed = true
      releaseCamera(runtime)
      runtime.tracker?.close()
      runtime.tracker = null
      runtimeRef.current = null
      setState(initialHeadTrackingState)
    },
    [],
  )

  return useMemo(() => ({ start, stop, recalibrate }), [start, stop, recalibrate])
}
