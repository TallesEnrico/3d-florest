const MEDIAPIPE = `${import.meta.env.BASE_URL}mediapipe`

/**
 * Single place to tune head tracking. Pipeline and rationale: docs/engineering/head-tracking.md
 */
export const trackingConfig = {
  video: {
    // Low resolution is plenty for landmarks and keeps decode + inference cheap.
    width: 640,
    height: 480,
    frameRate: 30,
  },

  mediapipe: {
    wasmPath: `${MEDIAPIPE}/wasm`,
    modelPath: `${MEDIAPIPE}/models/face_landmarker.task`,
    // Tried in order; GPU is much faster, CPU always works.
    delegates: ['GPU', 'CPU'] as const,
    minFaceDetectionConfidence: 0.5,
    minFacePresenceConfidence: 0.5,
    minTrackingConfidence: 0.5,
  },

  calibration: {
    // Valid frames whose median becomes the neutral pose (~0.7 s at 30 fps).
    samples: 20,
  },

  // SENSITIVITY — head movement (in inter-pupillary distances, 1 IPD ≈ 6.3 cm) that drives the
  // offset to ~0.93 of full. Smaller = more sensitive. The scene's motion.maxEye sets how far the
  // view actually travels; vertical travel is kept smaller there.
  sensitivity: {
    rangeX: 1.6,
    rangeY: 1.6,
    // Offset below this (fraction of full range) reads as "still"; ramps in smoothly.
    deadZone: 0.03,
    // Linear up to this fraction of full range, then eases into ±1 (no hard stop).
    softLimitKnee: 0.7,
  },

  // One Euro filter (per axis, on the normalized offset). See the tuning table in the doc.
  filter: {
    minCutoff: 1, // Hz — lower = steadier at rest, more lag
    beta: 2, // higher = faster response to quick moves
    dCutoff: 1, // Hz — speed estimate smoothing
  },

  // Face missing for longer than this → status "searching" and the view eases back to neutral.
  faceLostTimeoutMs: 300,

  // For a scene that passes `inView` (useHeadTracking): off screen, detection pauses at once and
  // the camera is released after this grace period (light off), resuming on return. The landing
  // page keeps tracking on everywhere (decision D6, revised 2026-10-12), so it doesn't use this.
  offscreenReleaseMs: 5000,

  confidence: {
    // Frames considered for the presence ratio.
    window: 15,
  },

  // HEAD NAVIGATION (opt-in mode): tilt the head down/up past the threshold and hold it to start
  // scrolling; keep it tilted to keep scrolling; back near neutral to stop. Angles are relative
  // to the calibrated neutral pitch.
  gesture: {
    thresholdDeg: 12, // pitch that arms a gesture
    releaseDeg: 6, // once armed/engaged, stays on down to this angle; under it = stop
    holdMs: 450, // how long to hold past the threshold before scrolling starts
    fullSpeedDeg: 26, // tilt that reaches full scroll speed
    // Scroll speed in viewport heights per second, from just engaged to full tilt.
    speed: { min: 0.25, max: 1.1 },
    minConfidence: 0.6, // tracking quality needed to count a frame
    // One Euro on the pitch in degrees: steady at rest, quick on a deliberate tilt.
    filter: { minCutoff: 1.5, beta: 0.05, dCutoff: 1 },
  },
}
