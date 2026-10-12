import type { FaceLandmarker, Matrix, NormalizedLandmark } from '@mediapipe/tasks-vision'
import { trackingConfig } from '../config/trackingConfig.ts'
import type { Delegate, FaceMeasurement } from '../types/index.ts'

// Iris centers (only present in the 478-landmark model) and outer eye corners as a fallback.
const IRIS_A = 468
const IRIS_B = 473
const EYE_CORNER_A = 33
const EYE_CORNER_B = 263
// The face is "comfortably inside" once its box is this far (fraction of the frame) from the edge.
const EDGE_COMFORT = 0.08

const RAD_TO_DEG = 180 / Math.PI

/**
 * Head pitch from the facial transformation matrix (canonical face → camera space, +y up,
 * face looking along +z toward the camera). The face's forward axis is the matrix's 3rd column;
 * looking down tips it toward −y. The flattened layout is detected from where the translation
 * sits (its z, the distance to the camera, is by far the largest magnitude).
 */
function pitchFromMatrix(matrix: Matrix | undefined): number | null {
  const d = matrix?.data
  if (!d || d.length !== 16) return null
  const columnMajor = Math.abs(d[14]) >= Math.abs(d[11])
  const forwardY = columnMajor ? d[9] : d[6]
  const forwardZ = d[10]
  return Math.atan2(-forwardY, forwardZ) * RAD_TO_DEG
}

export interface FaceTracker {
  readonly delegate: Delegate
  /** Detects one face in the current video frame; null when no face is found. */
  detect(video: HTMLVideoElement): FaceMeasurement | null
  close(): void
}

function measure(
  landmarks: NormalizedLandmark[],
  matrix: Matrix | undefined,
  width: number,
  height: number,
): FaceMeasurement {
  const hasIris = landmarks.length > IRIS_B
  const a = landmarks[hasIris ? IRIS_A : EYE_CORNER_A]
  const b = landmarks[hasIris ? IRIS_B : EYE_CORNER_B]
  const ax = a.x * width
  const ay = a.y * height
  const bx = b.x * width
  const by = b.y * height

  let minX = 1
  let maxX = 0
  let minY = 1
  let maxY = 0
  for (const point of landmarks) {
    if (point.x < minX) minX = point.x
    if (point.x > maxX) maxX = point.x
    if (point.y < minY) minY = point.y
    if (point.y > maxY) maxY = point.y
  }
  const edgeDistance = Math.min(minX, 1 - maxX, minY, 1 - maxY)

  return {
    center: { x: (ax + bx) / 2, y: (ay + by) / 2 },
    ipd: Math.hypot(bx - ax, by - ay),
    edgeFactor: Math.min(1, Math.max(0, edgeDistance / EDGE_COMFORT)),
    pitch: pitchFromMatrix(matrix),
  }
}

/**
 * Loads MediaPipe on demand (separate chunk, only after the user opts in) from the self-hosted
 * files in public/mediapipe, trying the GPU delegate first.
 */
export async function createFaceTracker(): Promise<FaceTracker> {
  const { FaceLandmarker, FilesetResolver } = await import('@mediapipe/tasks-vision')
  const { mediapipe } = trackingConfig
  const fileset = await FilesetResolver.forVisionTasks(mediapipe.wasmPath)

  let landmarker: FaceLandmarker | null = null
  let delegate: Delegate = mediapipe.delegates[0]
  let lastError: unknown = null
  for (const candidate of mediapipe.delegates) {
    try {
      landmarker = await FaceLandmarker.createFromOptions(fileset, {
        baseOptions: { modelAssetPath: mediapipe.modelPath, delegate: candidate },
        runningMode: 'VIDEO',
        numFaces: 1,
        minFaceDetectionConfidence: mediapipe.minFaceDetectionConfidence,
        minFacePresenceConfidence: mediapipe.minFacePresenceConfidence,
        minTrackingConfidence: mediapipe.minTrackingConfidence,
        outputFaceBlendshapes: false,
        // Head pose: needed for the pitch used by head navigation (small extra cost).
        outputFacialTransformationMatrixes: true,
      })
      delegate = candidate
      break
    } catch (error) {
      lastError = error
    }
  }
  if (!landmarker) throw lastError ?? new Error('Face Landmarker failed to load')

  const instance = landmarker
  let lastTimestamp = 0

  return {
    delegate,
    detect(video) {
      // detectForVideo requires strictly increasing timestamps.
      const timestamp = Math.max(performance.now(), lastTimestamp + 1)
      lastTimestamp = timestamp
      const result = instance.detectForVideo(video, timestamp)
      const landmarks = result.faceLandmarks[0]
      if (!landmarks) return null
      const matrix = result.facialTransformationMatrixes[0]
      return measure(landmarks, matrix, video.videoWidth, video.videoHeight)
    },
    close() {
      instance.close()
    },
  }
}
