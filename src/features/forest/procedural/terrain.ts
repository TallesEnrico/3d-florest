import { BufferGeometry, Color, Float32BufferAttribute, PlaneGeometry } from 'three'
import type { ForestLayoutConfig, GroundPalette } from '../types/index.ts'
import { createNoise2D } from './random.ts'
import type { River } from './river.ts'
import { paintVertices, smoothstep } from './geometry.ts'

export interface Terrain {
  /** Ground height at (x, z). Flat along the camera corridor, rising into banks on the sides. */
  height: (x: number, z: number) => number
  /** Center of the trail at depth z (a gentle meander around x = 0). */
  trailX: (z: number) => number
}

export function createTerrain(seed: number, layout: ForestLayoutConfig, river: River): Terrain {
  const noise = createNoise2D(seed)
  const detail = createNoise2D(seed + 17)
  const [clearX, clearZ] = layout.clearing.center
  const trailX = (z: number) => Math.sin(z * 0.045 + 1.3) * 0.6 + Math.sin(z * 0.11 + 0.4) * 0.22

  const height = (x: number, z: number) => {
    const fromTrail = Math.abs(x - trailX(z))
    // Undulation, flattened near the trail (the shots assume eye height above y = 0).
    const relief = (noise(x * 0.055, z * 0.055) - 0.5) * 1.6 + (detail(x * 0.21, z * 0.21) - 0.5) * 0.35
    let y = relief * smoothstep(1.5, 10, fromTrail)
    // Banks on both sides and a gentle rise beyond the clearing: far trees climb, the forest
    // stacks up in layers instead of ending on a flat horizon.
    y += Math.pow(Math.max(0, Math.abs(x) - 12), 1.2) * 0.035
    y += Math.max(0, clearZ - 10 - z) * 0.06
    // The clearing itself is a shallow, level bowl.
    const inClearing = 1 - smoothstep(layout.clearing.radius * 0.6, layout.clearing.radius * 1.3, Math.hypot(x - clearX, z - clearZ))
    y = y * (1 - inClearing) - 0.08 * inClearing
    // The river runs along a shallow valley (its water is flat, the land around it is not),
    // then cuts its own channel: banks near y = 0, bed `depth` below.
    const toRiver = river.distance(x, z)
    y *= smoothstep(river.halfWidth + 3, river.halfWidth + 16, toRiver)
    return y - river.depth * (1 - smoothstep(river.halfWidth * 0.55, river.halfWidth + 1.8, toRiver))
  }
  return { height, trailX }
}

/**
 * Ground mesh: relief from `terrain`, UVs in meters (one texture tile every `tile` m) and tints
 * baked per vertex that multiply the photographed litter texture: damp moss patches, sunlit
 * patches (stronger in the clearing) and soft contact shade under every tree.
 * `occlusion(x, z)` returns 0 (open) .. 1 (fully shaded by trunks and crowns).
 */
export function buildGround(
  terrain: Terrain,
  layout: ForestLayoutConfig,
  palette: GroundPalette,
  occlusion: (x: number, z: number) => number,
  tile: number,
  seed: number,
  river: River,
) {
  const { xHalf, zNear, zFar } = layout.bounds
  const width = xHalf * 2
  const depth = zNear - zFar
  // ~1 vertex per meter: enough for relief and baked shading, cheap to draw.
  const geometry = new PlaneGeometry(width, depth, Math.round(width), Math.round(depth))
  geometry.rotateX(-Math.PI / 2)
  geometry.translate(0, 0, zNear - depth / 2)
  const position = geometry.getAttribute('position')
  const uv = geometry.getAttribute('uv')
  for (let i = 0; i < position.count; i++) {
    const x = position.getX(i)
    const z = position.getZ(i)
    position.setY(i, terrain.height(x, z))
    uv.setXY(i, x / tile, -z / tile)
  }
  geometry.computeVertexNormals()

  const noise = createNoise2D(seed)
  const patches = createNoise2D(seed + 5)
  const base = new Color(palette.base)
  const moss = new Color(palette.moss)
  const sunlit = new Color(palette.sunlit)
  const shade = new Color(palette.shade)
  const [clearX, clearZ] = layout.clearing.center
  paintVertices(geometry, (p, _n, c) => {
    // Moss in irregular patches, more of it away from the trail where nobody walks.
    const away = smoothstep(1.5, 5, Math.abs(p.x - terrain.trailX(p.z)))
    const mossy = smoothstep(0.42, 0.72, noise(p.x * 0.16, p.z * 0.16)) * (0.35 + 0.65 * away)
    c.copy(base).lerp(moss, mossy * 0.85)
    // Sunlit patches, stronger in the clearing.
    const inClearing = 1 - smoothstep(0, layout.clearing.radius * 1.3, Math.hypot(p.x - clearX, p.z - clearZ))
    const sun = smoothstep(0.65, 0.9, patches(p.x * 0.12, p.z * 0.12)) * 0.4 + inClearing * 0.7
    c.lerp(sunlit, Math.min(1, sun) * 0.5)
    c.lerp(shade, occlusion(p.x, p.z) * 0.75)
    // Damp, darker earth along the banks; the bed under the water darker still.
    const toRiver = river.distance(p.x, p.z)
    c.multiplyScalar(1 - 0.35 * (1 - smoothstep(river.halfWidth - 0.5, river.halfWidth + 2.5, toRiver)) - 0.25 * (1 - smoothstep(river.halfWidth * 0.4, river.halfWidth, toRiver)))
  })
  return geometry
}

/**
 * The worn trail: a ribbon following `trailX`, a few centimeters above the ground, with the
 * bare-soil texture and soft, irregular edges (vertex alpha). Interrupted by the river (crossed
 * on stepping stones); ends at the clearing.
 */
export function buildTrail(terrain: Terrain, layout: ForestLayoutConfig, tile: number, seed: number, river: River) {
  const noise = createNoise2D(seed)
  const across = [-1, -0.55, 0, 0.55, 1]
  const step = 0.5
  const zStart = layout.bounds.zNear
  // The trail crosses the river (on stepping stones) and ends at the clearing.
  const zEnd = layout.corridor.end
  const rows = Math.ceil((zStart - zEnd) / step) + 1
  const positions: number[] = []
  const uvs: number[] = []
  const colors: number[] = []
  const index: number[] = []
  for (let r = 0; r < rows; r++) {
    const z = zStart - r * step
    const center = terrain.trailX(z)
    const halfWidth = 0.75 + 0.35 * noise(z * 0.25, 1.7)
    // Fades out where the trail ends, and gives way to the water where it crosses the river.
    const fade = smoothstep(zEnd, zEnd + 6, z) * smoothstep(river.halfWidth + 0.1, river.halfWidth + 1.4, river.distance(center, z))
    across.forEach((a, k) => {
      const wobble = (noise(z * 0.9, k * 3.1) - 0.5) * 0.25
      const x = center + a * halfWidth + wobble
      positions.push(x, terrain.height(x, z) + 0.025, z)
      uvs.push(x / tile, -z / tile)
      const edge = 1 - Math.abs(a)
      colors.push(1, 1, 1, smoothstep(0, 0.6, edge) * (0.65 + 0.35 * noise(x * 1.3, z * 1.3)) * fade)
    })
    if (r < rows - 1) {
      for (let k = 0; k < across.length - 1; k++) {
        const a = r * across.length + k
        const b = a + across.length
        index.push(a, b, a + 1, a + 1, b, b + 1)
      }
    }
  }
  const geometry = new BufferGeometry()
  geometry.setAttribute('position', new Float32BufferAttribute(positions, 3))
  geometry.setAttribute('uv', new Float32BufferAttribute(uvs, 2))
  geometry.setAttribute('color', new Float32BufferAttribute(colors, 4))
  geometry.setIndex(index)
  geometry.computeVertexNormals()
  return geometry
}
