// One Euro filter (Casiez et al., CHI 2012): an adaptive low-pass filter. It smooths hard when
// the signal is still (kills jitter) and opens up when it moves fast (keeps latency low).

function smoothingFactor(cutoffHz: number, dtSeconds: number): number {
  const tau = 1 / (2 * Math.PI * cutoffHz)
  return 1 / (1 + tau / dtSeconds)
}

export interface OneEuroParams {
  minCutoff: number
  beta: number
  dCutoff: number
}

export class OneEuroFilter {
  private readonly params: OneEuroParams
  private value: number | null = null
  private derivative = 0
  private lastTimeMs = 0

  constructor(params: OneEuroParams) {
    this.params = params
  }

  filter(raw: number, timeMs: number): number {
    if (this.value === null) {
      this.value = raw
      this.lastTimeMs = timeMs
      return raw
    }
    const dt = Math.max((timeMs - this.lastTimeMs) / 1000, 1e-3)
    this.lastTimeMs = timeMs

    const rawDerivative = (raw - this.value) / dt
    this.derivative += smoothingFactor(this.params.dCutoff, dt) * (rawDerivative - this.derivative)

    const cutoff = this.params.minCutoff + this.params.beta * Math.abs(this.derivative)
    this.value += smoothingFactor(cutoff, dt) * (raw - this.value)
    return this.value
  }

  reset(): void {
    this.value = null
    this.derivative = 0
  }
}
