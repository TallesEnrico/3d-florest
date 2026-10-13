import { BufferAttribute, BufferGeometry, type Material, Vector3 } from 'three'
import { createRng } from '../procedural/random.ts'
import type { ModelPart } from './bakeParts.ts'

/** Groups triangles into cards: triangles sharing vertices belong to the same card. */
function cardsOf(index: ArrayLike<number>, vertexCount: number): number[][] {
  const parent = new Int32Array(vertexCount).map((_, i) => i)
  const find = (v: number): number => {
    while (parent[v] !== v) {
      parent[v] = parent[parent[v]]
      v = parent[v]
    }
    return v
  }
  for (let t = 0; t < index.length; t += 3) {
    const a = find(index[t])
    parent[find(index[t + 1])] = a
    parent[find(index[t + 2])] = a
  }
  const cards = new Map<number, number[]>()
  for (let t = 0; t < index.length; t += 3) {
    const root = find(index[t])
    const card = cards.get(root)
    if (card) card.push(t)
    else cards.set(root, [t])
  }
  return [...cards.values()]
}

/** Main direction of a set of points (power iteration on the covariance). */
function mainAxis(points: Vector3[], center: Vector3, normal: Vector3): Vector3 {
  const m = [0, 0, 0, 0, 0, 0, 0, 0, 0]
  const d = new Vector3()
  for (const p of points) {
    d.subVectors(p, center)
    const v = [d.x, d.y, d.z]
    for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) m[i * 3 + j] += v[i] * v[j]
  }
  const axis = new Vector3(1, 0.31, 0.17).projectOnPlane(normal).normalize()
  for (let k = 0; k < 8; k++) {
    axis.set(
      m[0] * axis.x + m[1] * axis.y + m[2] * axis.z,
      m[3] * axis.x + m[4] * axis.y + m[5] * axis.z,
      m[6] * axis.x + m[7] * axis.y + m[8] * axis.z,
    )
    if (axis.lengthSq() < 1e-12) return new Vector3(0, 1, 0).projectOnPlane(normal).normalize()
    axis.normalize()
  }
  return axis
}

export interface SolidCrownOptions {
  /** Share of the needle cards kept. */
  keep: number
  /** Needles drawn per kept card, alternating sides of the twig. */
  needles: number
  /** Needle width at the base, relative to the needle length. */
  width: number
  /** Angle between needle and twig, in radians. */
  spread: number
  /** Brightness range of the needles, lowest at the bottom of the crown. */
  shade: [min: number, max: number]
  seed: number
}

function needleCards(geometry: BufferGeometry, options: SolidCrownOptions): BufferGeometry {
  const { keep, needles, width, spread, shade, seed } = options
  const index = geometry.getIndex()!.array
  const position = geometry.getAttribute('position')
  const normal = geometry.getAttribute('normal')
  geometry.computeBoundingBox()
  const { min, max } = geometry.boundingBox!
  const rng = createRng(seed)
  const positions: number[] = []
  const normals: number[] = []
  const colors: number[] = []
  const center = new Vector3()
  const facing = new Vector3()
  const side = new Vector3()
  const base = new Vector3()
  const dir = new Vector3()
  const across = new Vector3()
  const push = (p: Vector3, value: number) => {
    positions.push(p.x, p.y, p.z)
    normals.push(facing.x, facing.y, facing.z)
    colors.push(value * 0.9, value, value * 0.75)
  }
  for (const card of cardsOf(index, position.count)) {
    if (rng() >= keep) continue
    const vertices = [...new Set(card.flatMap((t) => [index[t], index[t + 1], index[t + 2]]))]
    const points = vertices.map((v) => new Vector3().fromBufferAttribute(position, v))
    center.set(0, 0, 0)
    facing.set(0, 0, 0)
    for (let i = 0; i < vertices.length; i++) {
      center.addScaledVector(points[i], 1 / vertices.length)
      facing.x += normal.getX(vertices[i])
      facing.y += normal.getY(vertices[i])
      facing.z += normal.getZ(vertices[i])
    }
    if (facing.lengthSq() < 1e-12) facing.set(0, 1, 0)
    facing.normalize()
    const axis = mainAxis(points, center, facing)
    side.crossVectors(facing, axis).normalize()
    let a0 = Infinity, a1 = -Infinity, b = 0
    for (const p of points) {
      dir.subVectors(p, center)
      a0 = Math.min(a0, dir.dot(axis))
      a1 = Math.max(a1, dir.dot(axis))
      b = Math.max(b, Math.abs(dir.dot(side)))
    }
    const length = Math.min(b / Math.sin(spread), (a1 - a0) * 0.8)
    const height = (center.y - min.y) / Math.max(1e-6, max.y - min.y)
    const tone = shade[0] + (shade[1] - shade[0]) * height
    for (let n = 0; n < needles; n++) {
      const t = (n + 0.5) / needles
      const sign = n % 2 === 0 ? 1 : -1
      const angle = spread * (0.8 + 0.4 * rng())
      const size = length * (1 - 0.45 * t) * (0.8 + 0.4 * rng())
      base.copy(center).addScaledVector(axis, a0 + (a1 - a0 - size * Math.cos(angle)) * t)
      dir.copy(axis).multiplyScalar(Math.cos(angle)).addScaledVector(side, sign * Math.sin(angle))
      across.crossVectors(facing, dir).multiplyScalar((size * width) / 2)
      const value = tone * (0.8 + 0.4 * rng())
      push(base.clone().add(across), value)
      push(base.clone().sub(across), value)
      push(base.clone().addScaledVector(dir, size), value)
    }
  }
  const result = new BufferGeometry()
  result.setAttribute('position', new BufferAttribute(new Float32Array(positions), 3))
  result.setAttribute('normal', new BufferAttribute(new Float32Array(normals), 3))
  result.setAttribute('color', new BufferAttribute(new Float32Array(colors), 3))
  result.setIndex(Array.from({ length: positions.length / 3 }, (_, i) => i))
  result.computeBoundingSphere()
  return result
}

/**
 * The cheapest crown, for the slowest devices: no needle texture at all. A share of the far
 * model's needle cards becomes a few thin opaque needles fanning out of the twig axis
 * (`material`, solid color per vertex, darker low in the crown), so there is no texture fetch,
 * no alpha test and little overdraw. Trunk and branches are shared with the source model.
 */
export function solidCrown(
  parts: ModelPart[],
  isFoliage: (part: ModelPart) => boolean,
  material: Material,
  options: SolidCrownOptions,
): ModelPart[] {
  return parts.map((part) => (isFoliage(part) ? { geometry: needleCards(part.geometry, options), material } : part))
}
