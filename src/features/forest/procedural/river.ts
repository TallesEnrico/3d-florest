import type { ForestLayoutConfig } from '../types/index.ts'

export interface River {
  /** Depth (z) of the centerline at x: the river crosses the forest from side to side. */
  centerZ: (x: number) => number
  /** Approximate distance from (x, z) to the centerline, in meters. */
  distance: (x: number, z: number) => number
  halfWidth: number
  /** Height of the water surface. */
  level: number
  /** Depth of the bed below the surrounding ground, at the centerline. */
  depth: number
}

/** A gently meandering river across the end of the walk (layout.river). */
export function createRiver(layout: ForestLayoutConfig): River {
  const { z, halfWidth, meander, wavelength, level, depth } = layout.river
  const k = (Math.PI * 2) / wavelength
  const centerZ = (x: number) => z + meander * Math.sin(x * k + 0.7) + meander * 0.35 * Math.sin(x * k * 2.3 + 2.1)
  const slope = (x: number) => meander * k * Math.cos(x * k + 0.7) + meander * 0.35 * k * 2.3 * Math.cos(x * k * 2.3 + 2.1)
  // Vertical distance to the curve, projected on its normal (exact enough for gentle bends).
  const distance = (x: number, zz: number) => Math.abs(zz - centerZ(x)) / Math.sqrt(1 + slope(x) ** 2)
  return { centerZ, distance, halfWidth, level, depth }
}
