import type { CameraShot, ForestLayoutConfig } from '../types/index.ts'
import { between, createNoise2D, type Rng } from './random.ts'
import { smoothstep } from './geometry.ts'
import { cabinContains, cabinWallDistance, cabinYard } from '../models/cabin.ts'
import type { River } from './river.ts'
import type { Terrain } from './terrain.ts'

/** Transform and tint of one instance. */
export interface Placement {
  x: number
  y: number
  z: number
  yaw: number
  scale: number
  /** Extra horizontal scale (girth) over `scale`. */
  widen: number
  tiltX: number
  tiltZ: number
  /** Brightness multiplier and hue nudge (−1 cooler … +1 warmer) for the instance color. */
  tint: number
  hue: number
}

/** A placement of one of several variants (fern clump, rock, tree species…). */
export interface VariantPlacement extends Placement {
  variant: number
}

/** What the layout needs to know about each species' model (measured from the geometry). */
export interface TreeShape {
  /** Horizontal reach of branches below ~4 m, at scale 1 (keeps the camera corridor clear). */
  lowReach: number
}

/** Uniform grid of points for fast "anything within r?" queries. */
class SpatialHash<T extends { x: number; z: number }> {
  private cells = new Map<string, T[]>()
  private cell: number
  constructor(cell: number) {
    this.cell = cell
  }
  private key(cx: number, cz: number) {
    return `${cx},${cz}`
  }
  add(item: T) {
    const k = this.key(Math.floor(item.x / this.cell), Math.floor(item.z / this.cell))
    const list = this.cells.get(k)
    if (list) list.push(item)
    else this.cells.set(k, [item])
  }
  near(x: number, z: number, radius: number, visit: (item: T) => void) {
    const r = Math.ceil(radius / this.cell)
    const cx = Math.floor(x / this.cell)
    const cz = Math.floor(z / this.cell)
    for (let i = cx - r; i <= cx + r; i++) {
      for (let j = cz - r; j <= cz + r; j++) this.cells.get(this.key(i, j))?.forEach(visit)
    }
  }
}

interface PlacedTree extends VariantPlacement {
  spacing: number
}

export interface TreeLayout {
  /** `variant` is the index into `layout.species`. */
  trees: VariantPlacement[]
  /** 0 (open) .. 1 (deep shade) at ground point (x, z): soft contact shadow under the trees. */
  occlusion: (x: number, z: number) => number
  /** Distance from (x, z) to the nearest trunk surface (approx.), up to `max`. */
  trunkClearance: (x: number, z: number, max: number) => number
}

/** Trunk spacing at scale 1: crowns may touch, trunks never crowd together. */
const SPACING = 2.2

/**
 * Scatters the trees with seeded dart throwing (random positions, minimum spacing): no rows,
 * no grid. Keeps the camera corridor and the clearing open and frames each chapter shot with a
 * large tree at the edge of the frame. Detail (near/far model) is chosen at runtime by distance.
 */
export function layoutTrees(
  rng: Rng,
  terrain: Terrain,
  layout: ForestLayoutConfig,
  shots: CameraShot[],
  shapes: TreeShape[],
  river: River,
  density: number,
): TreeLayout {
  const { bounds, corridor, clearing, nearBand, species } = layout
  const hash = new SpatialHash<PlacedTree>(8)
  const placed: PlacedTree[] = []
  const totalWeight = species.reduce((sum, s) => sum + s.weight, 0)
  const pickSpecies = () => {
    let r = rng() * totalWeight
    for (let i = 0; i < species.length; i++) {
      r -= species[i].weight
      if (r <= 0) return i
    }
    return species.length - 1
  }

  // The corridor's edge wanders (0–3 m extra) so trunks never line up along it like an avenue.
  const edge = createNoise2D(layout.seed + 9)
  const blocked = (x: number, z: number, reach: number) => {
    // Corridor: every camera path must stay clear of trunks and low branches.
    const extra = 3 * edge(z * 0.09, x > 0 ? 1.5 : 7.5)
    if (z > corridor.end && Math.abs(x) < corridor.halfWidth + extra + reach) return true
    // No trunk in the water or on its banks; crowns may lean over it.
    if (river.distance(x, z) < river.halfWidth + 1.5 + reach * 0.6) return true
    if (cabinContains(layout.cabin, x, z, 3 + reach)) return true
    return Math.hypot(x - clearing.center[0], z - clearing.center[1]) < clearing.radius + reach
  }
  const crowded = (x: number, z: number, spacing: number) => {
    let hit = false
    hash.near(x, z, spacing * 2.5, (other) => {
      if (!hit && Math.hypot(other.x - x, other.z - z) < (spacing + other.spacing) * 0.85) hit = true
    })
    return hit
  }
  /** `size` 0..1 picks within the species' scale range; `tight` < 1 packs trunks closer (distance). */
  const place = (variant: number, x: number, z: number, size: number, tight = 1) => {
    const [min, max] = species[variant].scale
    const scale = min + (max - min) * size
    const widen = between(rng, 0.92, 1.08)
    const reach = shapes[variant].lowReach * scale * widen
    const spacing = SPACING * scale * widen * tight
    if (blocked(x, z, reach) || crowded(x, z, spacing)) return false
    const tree: PlacedTree = {
      variant,
      spacing,
      x,
      z,
      // Sink the root flare a little into the ground (slopes would show a gap otherwise).
      y: terrain.height(x, z) - 0.12 * scale,
      yaw: rng() * Math.PI * 2,
      scale,
      widen,
      tiltX: between(rng, -0.02, 0.02),
      tiltZ: between(rng, -0.02, 0.02),
      tint: between(rng, 0.62, 0.9),
      hue: between(rng, -1, 1),
    }
    placed.push(tree)
    hash.add(tree)
    return true
  }

  // 1 · Framing: a big tree just outside the frame edge, ahead of each shot, alternating sides.
  //     It passes close by while scrolling (strong parallax, trunk partly out of frame).
  //     Shots past the trail (at the cabin) get none and must not draw from `rng`: one draw more
  //     or less here reshuffles the whole forest after it.
  shots.forEach((shot, i) => {
    if (shot.position[2] - 5 < corridor.end) return
    const side = i % 2 === 0 ? -1 : 1
    const z = shot.position[2] - between(rng, 5, 8)
    if (z < corridor.end) return
    const first = pickSpecies()
    const reach = shapes[first].lowReach * species[first].scale[1] * 1.08
    place(first, side * (corridor.halfWidth + reach + between(rng, 0.3, 1)), z, 1)
    place(pickSpecies(), -side * between(rng, 8, 11), z - between(rng, 4, 8), between(rng, 0.6, 1))
  })

  // 2 · Near band: both sides of the corridor and the forest behind the clearing.
  const nearTarget = Math.round(layout.trees.near * Math.max(0.6, density))
  for (let tries = 0, count = 0; count < nearTarget && tries < nearTarget * 80; tries++) {
    const x = between(rng, -nearBand, nearBand)
    const z = between(rng, bounds.zFar + 8, bounds.zNear)
    if (place(pickSpecies(), x, z, rng())) count++
  }

  // 3 · Far band: fills the sides and the distance; mostly seen through fog.
  const farTarget = Math.round(layout.trees.far * density)
  for (let tries = 0, count = 0; count < farTarget && tries < farTarget * 60; tries++) {
    const x = between(rng, -bounds.xHalf + 2, bounds.xHalf - 2)
    const z = between(rng, bounds.zFar + 2, bounds.zNear)
    if (Math.abs(x) < nearBand && z > bounds.zFar + 8) continue
    // Seen only through the haze: packed closer, so trunks keep layering into the distance.
    if (place(pickSpecies(), x, z, rng(), 0.6)) count++
  }

  const occlusion = (x: number, z: number) => {
    let shade = 0
    hash.near(x, z, 8, (tree) => {
      const d2 = (tree.x - x) ** 2 + (tree.z - z) ** 2
      const crown = 2.4 * tree.scale
      const base = tree.scale * tree.widen * layout.girth
      // Wide soft shade under the crown + tight contact shadow at the trunk.
      shade += 0.4 * Math.exp(-d2 / (2 * crown * crown)) + 0.6 * Math.exp(-d2 / (2 * base * base))
    })
    return smoothstep(0, 1.3, shade)
  }
  const trunkClearance = (x: number, z: number, max: number) => {
    let nearest = max
    hash.near(x, z, max + 2, (tree) => {
      nearest = Math.min(nearest, Math.hypot(tree.x - x, tree.z - z) - 0.35 * tree.scale * layout.girth)
    })
    return nearest
  }

  return { trees: placed, occlusion, trunkClearance }
}

export interface UndergrowthLayout {
  ferns: VariantPlacement[]
  rocks: VariantPlacement[]
  logs: Placement[]
  stumps: Placement[]
  /** Exposed roots at the base of the trees close to the paths. */
  roots: VariantPlacement[]
}

/**
 * Ferns, mossy rocks, fallen trunks, stumps and exposed roots. Ferns are densest along the
 * corridor edges and in the clearing (where the camera sees the ground), never on the trail
 * itself or inside a trunk; fallen trunks lie beside the paths, never across them.
 */
export function layoutUndergrowth(
  rng: Rng,
  terrain: Terrain,
  layout: ForestLayoutConfig,
  trees: TreeLayout,
  variants: { ferns: number; rocks: number; roots: number },
  river: River,
  density: number,
): UndergrowthLayout {
  const { bounds, clearing, undergrowth, corridor } = layout
  const xHalf = 26
  const zFar = bounds.zFar + 16
  const toTrail = (x: number, z: number) => Math.abs(x - terrain.trailX(z))
  const toClearing = (x: number, z: number) => Math.hypot(x - clearing.center[0], z - clearing.center[1])
  const common = () => ({
    yaw: rng() * Math.PI * 2,
    widen: between(rng, 0.9, 1.1),
    tiltX: between(rng, -0.06, 0.06),
    tiltZ: between(rng, -0.06, 0.06),
    tint: between(rng, 0.8, 1.1),
    hue: between(rng, -1, 1),
  })
  const scatter = <T extends Placement>(
    count: number,
    accept: (x: number, z: number) => number,
    make: (x: number, z: number) => Omit<T, 'x' | 'y' | 'z'> & { sink: number },
  ): T[] => {
    const items: T[] = []
    const target = Math.round(count * density)
    for (let tries = 0; items.length < target && tries < target * 40; tries++) {
      const x = between(rng, -xHalf, xHalf)
      const z = between(rng, zFar, bounds.zNear)
      if (rng() > accept(x, z)) continue
      const { sink, ...rest } = make(x, z)
      items.push({ ...rest, x, z, y: terrain.height(x, z) - sink } as unknown as T)
    }
    return items
  }

  // Ground cover follows the light: thick at the corridor edges and in the clearing,
  // thinner deep in the shade, none on the trail.
  const patches = createNoise2D(layout.seed + 11)
  const toRiver = (x: number, z: number) => river.distance(x, z)
  const fernDensity = (x: number, z: number) => {
    const d = toTrail(x, z)
    const water = toRiver(x, z) - river.halfWidth
    if (d < 1 || water < 0.8 || trees.trunkClearance(x, z, 1.5) < 0.3) return 0
    // Nothing inside the cabin; its front yard is trodden, almost bare.
    if (cabinContains(layout.cabin, x, z, 0.5)) return 0
    if (cabinYard(layout.cabin, x, z)) return 0.04
    // Lush along the banks, except where the trail reaches the water (the view stays open).
    if (water < 4) return d < 4 ? 0.12 : 0.9
    const edge = smoothstep(1, 2.6, d) * (1 - 0.5 * smoothstep(10, 24, Math.abs(x)))
    const glade = 1 - smoothstep(clearing.radius * 0.7, clearing.radius * 1.5, toClearing(x, z))
    // Ferns grow in drifts, not evenly sprinkled.
    const drift = smoothstep(0.3, 0.7, patches(x * 0.14, z * 0.14))
    return Math.max(edge * (0.15 + 0.85 * drift), glade)
  }
  const ferns = scatter<VariantPlacement>(undergrowth.ferns, fernDensity, () => ({
    ...common(),
    variant: Math.floor(rng() * variants.ferns),
    // The scanned clumps are ~1 m; sword ferns in old forests reach 1.5–2 m.
    scale: between(rng, 1.1, 2.6),
    sink: 0.04,
  }))
  // Ferns hugging the cabin are shrunk so their fronds stop at the logs (the camera goes inside;
  // 0.53 m = the widest scanned clump's reach at scale 1). Done after scattering, not in the
  // density: the random sequence, and so the rest of the forest, stays the same.
  for (const fern of ferns) fern.scale = Math.min(fern.scale, cabinWallDistance(layout.cabin, fern.x, fern.z) / 0.53)

  const rocks = scatter<VariantPlacement>(
    undergrowth.rocks,
    (x, z) =>
      toTrail(x, z) < 1.6 || toRiver(x, z) < river.halfWidth + 1 || trees.trunkClearance(x, z, 2) < 1 || cabinContains(layout.cabin, x, z, 1.5) || cabinYard(layout.cabin, x, z)
        ? 0
        : 1,
    () => {
      const scale = 0.25 + Math.pow(rng(), 2) * 0.9 // mostly small stones, a few boulders
      // The scanned rock is light; in the damp shade it reads darker.
      return { ...common(), tint: between(rng, 0.5, 0.72), variant: Math.floor(rng() * variants.rocks), scale, sink: scale * 0.3 }
    },
  )

  // Mossy stones along the waterline, some half submerged.
  const bankRocks = scatter<VariantPlacement>(
    undergrowth.bankRocks,
    (x, z) => {
      const water = toRiver(x, z) - river.halfWidth
      return water > -1.2 && water < 1.6 && Math.abs(x) < 34 && toTrail(x, z) > 1.6 ? 1 : 0
    },
    () => {
      const scale = 0.35 + Math.pow(rng(), 1.5) * 0.8
      return { ...common(), tint: between(rng, 0.5, 0.72), variant: Math.floor(rng() * variants.rocks), scale, sink: scale * 0.35 }
    },
  )

  // Stepping stones where the trail crosses the river: tops just above the water.
  const steppingStones: VariantPlacement[] = []
  const crossing = river.centerZ(terrain.trailX(river.centerZ(0)))
  const reach = river.halfWidth + 0.4
  for (let z = crossing + reach; z > crossing - reach; z -= between(rng, 1, 1.25)) {
    const x = terrain.trailX(z) + between(rng, -0.3, 0.3)
    if (river.distance(x, z) > river.halfWidth - 0.3) continue
    const scale = between(rng, 0.3, 0.4)
    // The scanned rocks reach ~0.8 above their origin: leave ~12 cm above the surface.
    steppingStones.push({ ...common(), tiltX: 0, tiltZ: 0, tint: between(rng, 0.55, 0.7), variant: Math.floor(rng() * variants.rocks), scale, x, z, y: river.level + 0.12 - 0.8 * scale })
  }

  // Fallen trunks (the scanned log is ~4 m): beside the paths, turned so they never cross them.
  const logs = scatter<Placement>(
    undergrowth.logs,
    (x, z) =>
      Math.abs(x) < corridor.halfWidth + 1.8 ||
      toClearing(x, z) < clearing.radius ||
      toRiver(x, z) < river.halfWidth + 4 ||
      cabinContains(layout.cabin, x, z, 4) ||
      trees.trunkClearance(x, z, 2.5) < 2
        ? 0
        : 1,
    (x) => {
      const scale = between(rng, 1.1, 1.8)
      const room = Math.abs(x) - corridor.halfWidth
      const maxCos = Math.min(1, room / (2.1 * scale))
      const yaw = Math.acos(maxCos * rng()) * (rng() < 0.5 ? -1 : 1)
      return { ...common(), yaw, tiltX: 0, tiltZ: 0, scale, sink: 0.12 * scale }
    },
  )

  const stumps = scatter<Placement>(
    undergrowth.stumps,
    (x, z) =>
      toTrail(x, z) < 2 || toRiver(x, z) < river.halfWidth + 2 || cabinContains(layout.cabin, x, z, 3) || trees.trunkClearance(x, z, 2) < 1.5 ? 0 : 1,
    () => ({ ...common(), scale: between(rng, 1, 1.6), sink: 0.06 }),
  )

  // Roots spread from the base of trees near the paths (the ones the camera passes close to).
  const roots: VariantPlacement[] = trees.trees
    .filter((tree) => Math.abs(tree.x) < corridor.halfWidth + 10 && rng() < 0.75)
    .map((tree) => ({
      ...common(),
      x: tree.x,
      z: tree.z,
      y: terrain.height(tree.x, tree.z) - 0.05,
      variant: Math.floor(rng() * variants.roots),
      scale: tree.scale * layout.girth * between(rng, 0.55, 0.75),
      tiltX: 0,
      tiltZ: 0,
    }))

  return { ferns, rocks: [...rocks, ...bankRocks, ...steppingStones], logs, stumps, roots }
}
