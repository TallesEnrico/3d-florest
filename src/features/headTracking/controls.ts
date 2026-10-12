import { useHeadTrackingStore } from './store/headTrackingStore.ts'
import type { HeadTrackingControls } from './types/index.ts'

// The mounted HeadTrackingController registers its controls here so CTAs elsewhere on the page
// (header, final call to action) can start the camera without prop drilling or a Context.
let registered: HeadTrackingControls | null = null

export function registerHeadTrackingControls(controls: HeadTrackingControls): () => void {
  registered = controls
  return () => {
    if (registered === controls) registered = null
  }
}

/**
 * Turns the opt-in head navigation mode on or off. Turning it on also starts the camera (call it
 * inside a click).
 */
export function setHeadNavigation(enabled: boolean): void {
  useHeadTrackingStore.setState({
    navigation: enabled,
    gesture: { direction: null, progress: 0, engaged: false, intensity: 0 },
  })
  if (enabled) requestCamera()
}

/**
 * Starts the camera from any click handler. Call it synchronously inside the click so the
 * permission request keeps the user gesture. Does nothing if the camera is already on or asking.
 */
export function requestCamera(): void {
  const { webcam } = useHeadTrackingStore.getState()
  if (webcam === 'active' || webcam === 'requesting') return
  void registered?.start()
}
