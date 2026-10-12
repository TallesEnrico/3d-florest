/** A seeded pseudo-random generator: the same seed always builds the same forest. */
export type Rng = () => number

/** mulberry32: tiny, fast and good enough for scattering geometry. */
export function createRng(seed: number): Rng {
  let state = seed >>> 0
  return () => {
    state = (state + 0x6d2b79f5) >>> 0
    let t = state
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export const between = (rng: Rng, min: number, max: number) => min + (max - min) * rng()

export const pick = <T>(rng: Rng, items: readonly T[]): T => items[Math.floor(rng() * items.length)]

const smooth = (t: number) => t * t * (3 - 2 * t)

export type Noise2D = (x: number, y: number) => number

/** Smooth 2D value noise in [0, 1] (lattice hash + smoothstep interpolation). */
export function createNoise2D(seed: number): Noise2D {
  const hash = (ix: number, iy: number) => {
    const s = Math.sin(ix * 127.1 + iy * 311.7 + seed * 74.7) * 43758.5453
    return s - Math.floor(s)
  }
  return (x, y) => {
    const ix = Math.floor(x)
    const iy = Math.floor(y)
    const fx = smooth(x - ix)
    const fy = smooth(y - iy)
    const a = hash(ix, iy)
    const b = hash(ix + 1, iy)
    const c = hash(ix, iy + 1)
    const d = hash(ix + 1, iy + 1)
    return a + (b - a) * fx + (c - a) * fy + (a - b - c + d) * fx * fy
  }
}
