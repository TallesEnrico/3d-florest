/** Camera permission / stream lifecycle. `insecure`: page not served over HTTPS/localhost. */
export type WebcamStatus =
  | 'idle'
  | 'requesting'
  | 'active'
  | 'denied'
  | 'unavailable'
  | 'insecure'
  | 'error'

/** Face tracking lifecycle while the webcam is the input source. */
export type TrackingStatus = 'idle' | 'loading' | 'calibrating' | 'tracking' | 'searching'

export type InputSource = 'mouse' | 'webcam'

export type Delegate = 'GPU' | 'CPU'

export interface Vec2 {
  x: number
  y: number
}

/** One face observation, in video pixels. */
export interface FaceMeasurement {
  /** Midpoint between the iris centers. */
  center: Vec2
  /** Inter-pupillary distance: a ruler that makes motion independent of distance. */
  ipd: number
  /** 0 when the face touches the frame edge, 1 when comfortably inside. */
  edgeFactor: number
  /** Head pitch in degrees (+ = looking down), from MediaPipe's head pose; null if unavailable. */
  pitch: number | null
}

/** The calibrated rest pose: where the scene shows the reference view. */
export interface NeutralPose {
  center: Vec2
  ipd: number
  /** Resting pitch (a laptop camera below the eyes reads as "looking down"); 0 if unavailable. */
  pitch: number
}

export type GestureDirection = 'down' | 'up'

export interface HeadTrackingState {
  webcam: WebcamStatus
  tracking: TrackingStatus
  source: InputSource
  /** Normalized view offset, −1..1, mirrored (+x = viewer moved to their right). */
  offset: Vec2
  /** True while a source is driving the view (webcam on, or pointer inside the window). */
  active: boolean
  /** Heuristic 0..1: recent face presence × distance from the frame edges. */
  confidence: number
  /** Filtered head pitch relative to neutral, in degrees (+ = looking down). */
  pitch: number
  /** Opt-in "navigate with the head" mode: pitch gestures move between page sections. */
  navigation: boolean
  /**
   * Head navigation gesture: direction, 0..1 of the arming hold, whether it is engaged
   * (scrolling) and its 0..1 intensity (scroll speed).
   */
  gesture: { direction: GestureDirection | null; progress: number; engaged: boolean; intensity: number }
  /** Smoothed detection time per video frame, in ms. */
  inferenceMs: number
  delegate: Delegate | null
  /** Technical detail of the last failure (debug only, never shown as UI copy). */
  errorDetail: string | null
}

export interface HeadTrackingControls {
  start: () => Promise<void>
  stop: () => void
  recalibrate: () => void
}
