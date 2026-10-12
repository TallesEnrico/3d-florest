import {
  BufferGeometry,
  Color,
  DataTexture,
  Float32BufferAttribute,
  LinearFilter,
  LinearMipmapLinearFilter,
  MeshStandardMaterial,
  RepeatWrapping,
  RGBAFormat,
  UnsignedByteType,
  Vector2,
} from 'three'
import type { River } from '../procedural/river.ts'
import { createRng } from '../procedural/random.ts'
import type { WaterPalette } from '../types/index.ts'

/** One wave texture tile every this many meters. */
const TILE = 5
/** Flow speed along the river (texture tiles per second) for the two wave layers. */
const FLOW = [0.05, 0.032]

/**
 * Tileable normal map of small water ripples, built from data (no image file): a sum of
 * wrapped value-noise octaves as a height field, turned into normals by central differences.
 */
function createRippleNormals(seed: number, size = 256): DataTexture {
  const rng = createRng(seed)
  const height = new Float32Array(size * size)
  const octave = (period: number, amount: number) => {
    const lattice = Array.from({ length: period * period }, () => rng())
    const at = (ix: number, iy: number) => lattice[(iy % period) * period + (ix % period)]
    const cell = size / period
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const gx = x / cell
        const gy = y / cell
        const ix = Math.floor(gx)
        const iy = Math.floor(gy)
        const fx = (gx - ix) * (gx - ix) * (3 - 2 * (gx - ix))
        const fy = (gy - iy) * (gy - iy) * (3 - 2 * (gy - iy))
        const a = at(ix, iy)
        const b = at(ix + 1, iy)
        const c = at(ix, iy + 1)
        const d = at(ix + 1, iy + 1)
        height[y * size + x] += (a + (b - a) * fx + (c - a) * fy + (a - b - c + d) * fx * fy) * amount
      }
    }
  }
  // Ripples stretched along the flow (u): more octaves across than along.
  octave(4, 1)
  octave(8, 0.55)
  octave(16, 0.3)
  octave(32, 0.15)
  const data = new Uint8Array(size * size * 4)
  const h = (x: number, y: number) => height[((y + size) % size) * size + ((x + size) % size)]
  const strength = 6
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dx = (h(x + 1, y) - h(x - 1, y)) * strength
      const dy = (h(x, y + 1) - h(x, y - 1)) * strength
      const length = Math.hypot(dx, dy, 1)
      const i = (y * size + x) * 4
      data[i] = Math.round(((-dx / length) * 0.5 + 0.5) * 255)
      data[i + 1] = Math.round(((-dy / length) * 0.5 + 0.5) * 255)
      data[i + 2] = Math.round(((1 / length) * 0.5 + 0.5) * 255)
      data[i + 3] = 255
    }
  }
  const texture = new DataTexture(data, size, size, RGBAFormat, UnsignedByteType)
  texture.wrapS = texture.wrapT = RepeatWrapping
  texture.magFilter = LinearFilter
  texture.minFilter = LinearMipmapLinearFilter
  texture.generateMipmaps = true
  texture.anisotropy = 8
  texture.needsUpdate = true
  return texture
}

/**
 * The water surface: a flat ribbon along the river's curve, slightly wider than the channel so
 * it meets the banks (the ground hides it where the bank rises). Vertex colors go from deep in
 * the middle to shallow at the edges, where it also fades out (soft shoreline).
 */
function buildWaterGeometry(river: River, palette: WaterPalette, xHalf: number): BufferGeometry {
  const deep = new Color(palette.deep)
  const shallow = new Color(palette.shallow)
  const across = [-1, -0.75, -0.45, 0, 0.45, 0.75, 1]
  const half = river.halfWidth + 1.4
  const positions: number[] = []
  const uvs: number[] = []
  const colors: number[] = []
  const index: number[] = []
  const step = 1
  const columns = Math.ceil((xHalf * 2) / step) + 1
  const c = new Color()
  for (let i = 0; i < columns; i++) {
    const x = -xHalf + i * step
    const z = river.centerZ(x)
    // Normal of the centerline in the ground plane.
    const dz = river.centerZ(x + 0.5) - river.centerZ(x - 0.5)
    const length = Math.hypot(1, dz)
    const nx = -dz / length
    const nz = 1 / length
    for (const a of across) {
      const px = x + nx * a * half
      const pz = z + nz * a * half
      positions.push(px, river.level, pz)
      uvs.push(x / TILE, (a * half) / TILE)
      const edge = Math.abs(a)
      c.copy(deep).lerp(shallow, edge * edge)
      // Clear toward the shore: the wet bed shows through, then the water fades into the bank.
      colors.push(c.r, c.g, c.b, 1 - 0.45 * Math.max(0, (edge - 0.5) / 0.32) - 0.55 * Math.max(0, (edge - 0.82) / 0.18))
    }
    if (i < columns - 1) {
      for (let k = 0; k < across.length - 1; k++) {
        const a = i * across.length + k
        const b = a + across.length
        index.push(a, a + 1, b, a + 1, b + 1, b)
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

export interface Water {
  geometry: BufferGeometry
  material: MeshStandardMaterial
  /** Advances the flow; `elapsed` in seconds (pass a frozen value to stop it). */
  update: (elapsed: number) => void
  dispose: () => void
}

/**
 * A realistic but cheap river: no planar reflection pass (that would draw the whole forest a
 * second time). A glossy material reflects the sky light (the HDR environment) with Fresnel,
 * two ripple layers flow at different speeds and angles (normal map, and a second one breaking
 * the gloss), shadows of the trees fall on it, and fog fades it like everything else.
 */
export function createWater(river: River, palette: WaterPalette, xHalf: number, seed: number): Water {
  const ripples = createRippleNormals(seed)
  const crossRipples = ripples.clone()
  crossRipples.rotation = 0.6
  crossRipples.repeat.set(1.7, 1.7)
  const material = new MeshStandardMaterial({
    name: 'river-water',
    vertexColors: true,
    transparent: true,
    opacity: 0.93,
    roughness: 0.07,
    metalness: 0,
    normalMap: ripples,
    normalScale: new Vector2(0.75, 0.75),
    envMapIntensity: 1.4,
  })
  // The second ripple layer (moving at another speed and angle) rides on the roughness: it
  // breaks the reflections without a second normal map (clear coat cost a second lighting pass).
  material.roughnessMap = crossRipples

  const geometry = buildWaterGeometry(river, palette, xHalf)
  return {
    geometry,
    material,
    update: (elapsed) => {
      ripples.offset.set(-elapsed * FLOW[0], 0)
      crossRipples.offset.set(-elapsed * FLOW[1], elapsed * FLOW[1] * 0.4)
    },
    dispose: () => {
      geometry.dispose()
      material.dispose()
      ripples.dispose()
      crossRipples.dispose()
    },
  }
}
