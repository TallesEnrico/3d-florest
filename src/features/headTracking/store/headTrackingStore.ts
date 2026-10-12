import { create } from 'zustand'
import type { HeadTrackingState } from '../types/index.ts'

export const initialHeadTrackingState: HeadTrackingState = {
  webcam: 'idle',
  tracking: 'idle',
  source: 'mouse',
  offset: { x: 0, y: 0 },
  active: false,
  confidence: 0,
  pitch: 0,
  navigation: false,
  gesture: { direction: null, progress: 0, engaged: false, intensity: 0 },
  inferenceMs: 0,
  delegate: null,
  errorDetail: null,
}

/**
 * Input state shared with the rest of the app. High-frequency fields (offset, confidence) are
 * written outside React and read with getState() in the render loop; components should only
 * subscribe to low-frequency fields (statuses). The debug panel is the exception.
 */
export const useHeadTrackingStore = create<HeadTrackingState>(() => initialHeadTrackingState)
