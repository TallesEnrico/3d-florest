import type { FaceMeasurement, NeutralPose, Vec2 } from '../types/index.ts'

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b)
  const middle = sorted.length >> 1
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2
}

/**
 * Collects the first N valid measurements and takes their median as the neutral pose
 * (robust to a blink or a bad frame). Call reset() to recalibrate.
 */
export class NeutralCalibration {
  private readonly sampleCount: number
  private samples: FaceMeasurement[] = []
  private pose: NeutralPose | null = null

  constructor(sampleCount: number) {
    this.sampleCount = sampleCount
  }

  /** Adds a sample while calibrating; returns the neutral pose once it is ready. */
  add(measurement: FaceMeasurement): NeutralPose | null {
    if (this.pose) return this.pose
    this.samples.push(measurement)
    if (this.samples.length >= this.sampleCount) {
      this.pose = {
        center: {
          x: median(this.samples.map((s) => s.center.x)),
          y: median(this.samples.map((s) => s.center.y)),
        },
        ipd: median(this.samples.map((s) => s.ipd)),
        pitch: median(this.samples.map((s) => s.pitch ?? 0)),
      }
      this.samples = []
    }
    return this.pose
  }

  get neutral(): NeutralPose | null {
    return this.pose
  }

  reset(): void {
    this.samples = []
    this.pose = null
  }
}

export interface OffsetParams {
  rangeX: number
  rangeY: number
  deadZone: number
  softLimitKnee: number
}

/** Small motions read as zero; beyond the dead zone the response ramps in without a step. */
export function applyDeadZone(value: number, deadZone: number): number {
  const magnitude = Math.max(0, Math.abs(value) - deadZone) / (1 - deadZone)
  return Math.sign(value) * magnitude
}

/** Linear up to `knee`, then eases asymptotically into ±1 instead of hitting a hard stop. */
export function softLimit(value: number, knee: number): number {
  const magnitude = Math.abs(value)
  if (magnitude <= knee) return value
  return Math.sign(value) * (knee + (1 - knee) * Math.tanh((magnitude - knee) / (1 - knee)))
}

/**
 * Head displacement from the neutral pose → normalized view offset (−1..1).
 * Measured in inter-pupillary distances (current IPD) so sensitivity does not depend on how far
 * the viewer sits. The webcam image is not mirrored: moving to your right moves the face left in
 * the image, hence the sign flip on x; image y grows downward, hence the flip on y.
 */
export function measurementToOffset(
  measurement: FaceMeasurement,
  neutral: NeutralPose,
  params: OffsetParams,
): Vec2 {
  const ipd = Math.max(measurement.ipd, 1)
  const dx = (measurement.center.x - neutral.center.x) / ipd
  const dy = (measurement.center.y - neutral.center.y) / ipd
  return {
    x: softLimit(applyDeadZone(-dx / params.rangeX, params.deadZone), params.softLimitKnee),
    y: softLimit(applyDeadZone(-dy / params.rangeY, params.deadZone), params.softLimitKnee),
  }
}
