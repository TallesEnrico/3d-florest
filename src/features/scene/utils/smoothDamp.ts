export interface SpringState {
  value: number
  velocity: number
}

/**
 * Critically damped spring toward `target` (Game Programming Gems 4, §1.10, as in Unity's
 * SmoothDamp). Unlike exponential damping, velocity stays continuous when the target jumps
 * (tracking steps, mouse ↔ webcam switches, face lost), so the camera never jerks.
 * Frame-rate independent; mutates and returns `state.value`.
 */
export function smoothDamp(
  state: SpringState,
  target: number,
  smoothTime: number,
  deltaSeconds: number,
): number {
  const omega = 2 / Math.max(smoothTime, 1e-4)
  const x = omega * deltaSeconds
  const decay = 1 / (1 + x + 0.48 * x * x + 0.235 * x * x * x)
  const change = state.value - target
  const temp = (state.velocity + omega * change) * deltaSeconds
  state.velocity = (state.velocity - omega * temp) * decay
  state.value = target + (change + temp) * decay
  return state.value
}
