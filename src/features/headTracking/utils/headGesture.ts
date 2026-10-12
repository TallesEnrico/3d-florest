import type { GestureDirection } from '../types/index.ts'

export interface GestureParams {
  thresholdDeg: number
  releaseDeg: number
  holdMs: number
  /** Tilt (degrees) that reaches full intensity once engaged. */
  fullSpeedDeg: number
}

export interface GestureReading {
  /** Direction being held, or null when idle. */
  direction: GestureDirection | null
  /** 0..1 of the arming hold; 1 while engaged. */
  progress: number
  /** Past the hold: keeps going for as long as the head stays tilted. */
  engaged: boolean
  /** 0..1 while engaged: how far past the release angle (drives the scroll speed). */
  intensity: number
}

const IDLE: GestureReading = { direction: null, progress: 0, engaged: false, intensity: 0 }

/**
 * Tilt-hold-and-keep gesture on the head pitch (+ = looking down):
 * 1. arm: tilt past `thresholdDeg` and hold for `holdMs` (protects against accidental starts:
 *    a quick nod, looking around, reading). Once armed it stays armed down to `releaseDeg`
 *    (hysteresis), so jitter near the threshold doesn't reset the hold;
 * 2. engaged: stays on while the head stays tilted the same way past `releaseDeg`, with an
 *    intensity that grows up to `fullSpeedDeg`;
 * 3. back near neutral (or the face lost / unreliable) → idle; starting again needs a new hold.
 */
export class HoldGesture {
  private readonly params: GestureParams
  private armed: GestureDirection | null = null
  private armedAt = 0
  private engaged: GestureDirection | null = null

  constructor(params: GestureParams) {
    this.params = params
  }

  update(pitch: number, timeMs: number, valid: boolean): GestureReading {
    const { thresholdDeg, releaseDeg, holdMs, fullSpeedDeg } = this.params
    const magnitude = Math.abs(pitch)
    const direction: GestureDirection = pitch > 0 ? 'down' : 'up'
    const intensity = Math.min(1, Math.max(0, (magnitude - releaseDeg) / (fullSpeedDeg - releaseDeg)))

    if (this.engaged) {
      if (valid && direction === this.engaged && magnitude >= releaseDeg) {
        return { direction, progress: 1, engaged: true, intensity }
      }
      this.engaged = null
      this.armed = null
      return IDLE
    }
    if (!valid) {
      this.armed = null
      return IDLE
    }

    const keepsArmed = this.armed === direction && magnitude >= releaseDeg
    if (!keepsArmed) {
      if (magnitude < thresholdDeg) {
        this.armed = null
        return IDLE
      }
      this.armed = direction
      this.armedAt = timeMs
    }

    const progress = Math.min(1, (timeMs - this.armedAt) / holdMs)
    if (progress < 1) return { direction, progress, engaged: false, intensity: 0 }

    this.engaged = direction
    this.armed = null
    return { direction, progress: 1, engaged: true, intensity }
  }

  reset(): void {
    this.armed = null
    this.engaged = null
  }
}
