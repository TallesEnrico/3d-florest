import { BatchedMesh, type BufferGeometry, type Color, Euler, Group, type Material, Matrix4, Quaternion, Vector3, Vector4 } from 'three'
import type { Placement } from '../procedural/layout.ts'
import type { ModelPart } from './bakeParts.ts'
import { enableDitherFade, FADE_FULL, fadeInComplement } from './ditherFade.ts'

/** A model with one or more levels of detail: `lods[0]` is the most detailed. */
export interface LodModel {
  name: string
  lods: ModelPart[][]
}

export interface LodInstance {
  model: number
  placement: Placement
}

export interface LodBatches {
  group: Group
  /**
   * Picks each instance's level of detail from its distance to the camera; when it changes, the
   * two levels dissolve into each other over `fadeSeconds` (`delta` = seconds since the last
   * call). `detail` < 1 brings the switches between levels closer; `reach` < 1 brings the last
   * distance (where instances disappear into the haze) closer.
   */
  update: (camera: Vector3, detail: number, delta: number, reach?: number) => void
  /**
   * Shows every instance at one level (clamped to what each model has), ignoring distance and
   * skipping fades — for drawing the static shadow map; `null` returns to distance-based
   * levels at once (from the last camera position).
   */
  forceLod: (level: number | null) => void
  stats: () => { instances: number; visible: number; triangles: number }
  dispose: () => void
}

/** One material of one instance: two batch instances, so two levels can dissolve into each other. */
interface Slot {
  batch: BatchedMesh
  /** [current level, next level]; the second one is drawn only during a transition. */
  instances: [number, number]
  /** Geometry currently shown by each instance (-1 = hidden). */
  shown: [number, number]
  /** Geometry id per LOD in this batch, or -1 when the LOD has no part with this material. */
  geometries: number[]
  triangles: number[]
}

interface Tracked {
  x: number
  z: number
  tint: [r: number, g: number, b: number]
  /** Level shown (-1 = hidden, UNSET before the first update). */
  lod: number
  /** Level being dissolved into, or null when no transition is running. */
  next: number | null
  /** Transition progress 0..1. */
  t: number
  slots: Slot[]
}

const HIDDEN = -1
const UNSET = -2
/** Meters past a switch distance before switching back: no flicker at the boundary. */
const HYSTERESIS = 1.5

const triangleCount = (geometry: BufferGeometry) => (geometry.index?.count ?? geometry.getAttribute('position').count) / 3

/** Instance color: brightness × a slight warm/cool shift, so copies never look identical. */
function tint(placement: Placement, hueAmount: number): [number, number, number] {
  const h = placement.hue * hueAmount
  return [placement.tint * (1 + h * 0.5), placement.tint, placement.tint * (1 - h * 0.8)]
}

/**
 * Draws many copies of a few models with one `BatchedMesh` per material: per-instance frustum
 * culling and front-to-back sorting, and per-instance level of detail. `distances[k]` is the
 * farthest distance for LOD k (beyond the last one the instance is hidden). When an instance
 * crosses a distance, its two levels dissolve into each other over `fadeSeconds` (see
 * ditherFade.ts); beyond the last one it dissolves away. Time-based, so nothing ever rests
 * half-dissolved when the camera stops, and no pop.
 */
export function createLodBatches(
  name: string,
  models: LodModel[],
  instances: LodInstance[],
  distances: number[],
  fadeSeconds: number,
  options: {
    hueAmount?: number
    castShadow?: boolean
    /** Extra horizontal scale per material (e.g. thicker trunks, crowns unchanged). */
    girth?: (material: Material) => number
  } = {},
): LodBatches {
  const group = new Group()
  group.name = name

  // Every geometry and instance count per material.
  const byMaterial = new Map<Material, { geometries: BufferGeometry[]; vertices: number; indices: number; instances: number }>()
  models.forEach((model) =>
    model.lods.flat().forEach(({ material, geometry }) => {
      const entry = byMaterial.get(material) ?? { geometries: [], vertices: 0, indices: 0, instances: 0 }
      entry.geometries.push(geometry)
      entry.vertices += geometry.getAttribute('position').count
      entry.indices += geometry.index?.count ?? 0
      byMaterial.set(material, entry)
    }),
  )
  const usesMaterial = (model: LodModel, material: Material) => model.lods.some((parts) => parts.some((p) => p.material === material))
  for (const [material, entry] of byMaterial) {
    entry.instances = instances.filter((i) => usesMaterial(models[i.model], material)).length
  }

  const batches = new Map<Material, { batch: BatchedMesh; ids: Map<BufferGeometry, number> }>()
  for (const [material, entry] of byMaterial) {
    if (entry.instances === 0) continue
    enableDitherFade(material)
    // Two instances per placement: the level being shown and the one it dissolves into.
    const batch = new BatchedMesh(entry.instances * 2, entry.vertices, entry.indices, material)
    batch.name = `${name}:${material.name}`
    batch.castShadow = options.castShadow ?? false
    batch.receiveShadow = true
    const ids = new Map<BufferGeometry, number>()
    entry.geometries.forEach((geometry) => ids.set(geometry, batch.addGeometry(geometry)))
    batches.set(material, { batch, ids })
    group.add(batch)
  }

  const matrix = new Matrix4()
  const position = new Vector3()
  const rotation = new Quaternion()
  const euler = new Euler()
  const scale = new Vector3()
  const initialColor = new Vector4(1, 1, 1, 1)
  const tracked: Tracked[] = instances.map(({ model, placement: p }) => {
    rotation.setFromEuler(euler.set(p.tiltX, p.yaw, p.tiltZ))
    const slots: Slot[] = []
    for (const [material, { batch, ids }] of batches) {
      if (!usesMaterial(models[model], material)) continue
      const widen = p.scale * p.widen * (options.girth?.(material) ?? 1)
      matrix.compose(position.set(p.x, p.y, p.z), rotation, scale.set(widen, p.scale, widen))
      const lodParts = models[model].lods.map((parts) => parts.find((part) => part.material === material) ?? null)
      const geometries = lodParts.map((part) => (part ? ids.get(part.geometry)! : -1))
      const first = geometries.find((id) => id >= 0)!
      const pair: [number, number] = [batch.addInstance(first), batch.addInstance(first)]
      for (const instance of pair) {
        batch.setMatrixAt(instance, matrix)
        // Setting a color now creates the per-instance color texture up front: the shaders are
        // compiled (and warmed up) in their final variant, not again when the first instance
        // becomes visible mid-scroll.
        batch.setColorAt(instance, initialColor as unknown as Color)
        batch.setVisibleAt(instance, false)
      }
      slots.push({ batch, instances: pair, shown: [HIDDEN, HIDDEN], geometries, triangles: lodParts.map((part) => (part ? triangleCount(part.geometry) : 0)) })
    }
    return { x: p.x, z: p.z, tint: tint(p, options.hueAmount ?? 0.04), lod: UNSET, next: null, t: 0, slots }
  })
  batches.forEach(({ batch }) => batch.computeBoundingSphere())

  // RGBA instance color: tint in rgb, dissolve in alpha. BatchedMesh copies `color.toArray()`
  // into its RGBA texture, so a Vector4 sets all four channels.
  const rgba = new Vector4()
  const show = (slot: Slot, which: 0 | 1, geometry: number, fade: number, item: Tracked) => {
    const instance = slot.instances[which]
    if (geometry < 0) {
      if (slot.shown[which] !== HIDDEN) slot.batch.setVisibleAt(instance, false)
      slot.shown[which] = HIDDEN
      return
    }
    if (slot.shown[which] !== geometry) {
      if (slot.shown[which] === HIDDEN) slot.batch.setVisibleAt(instance, true)
      slot.batch.setGeometryIdAt(instance, geometry)
      slot.shown[which] = geometry
    }
    slot.batch.setColorAt(instance, rgba.set(item.tint[0], item.tint[1], item.tint[2], fade) as unknown as Color)
  }

  const last = distances.length - 1
  // Rank: 0 = most detailed … distances.length = hidden (beyond the last distance).
  const rank = (lod: number) => (lod === HIDDEN ? distances.length : lod)
  const fromRank = (r: number) => (r >= distances.length ? HIDDEN : r)
  const threshold = (r: number, detail: number, reach: number) => (r < last ? distances[r] * detail : distances[r] * reach)

  /** Draws `from` dissolving into `to` at progress t (t = 0: only `from`; t = 1: only `to`). */
  const apply = (item: Tracked, from: number, to: number, t: number) => {
    const keep = 1 - t
    for (const slot of item.slots) {
      const outgoing = from >= 0 && keep > 0 ? slot.geometries[from] : -1
      const incoming = to >= 0 && t > 0 ? slot.geometries[to] : -1
      show(slot, 0, outgoing, t > 0 ? keep : FADE_FULL, item)
      show(slot, 1, incoming, outgoing >= 0 ? fadeInComplement(keep) : t >= 1 ? FADE_FULL : t, item)
    }
  }

  const lastCamera = new Vector3()
  let lastDetail = 1
  let lastReach = 1
  let forced = false
  const update = (camera: Vector3, detail = 1, delta = 0, reach = 1) => {
    lastCamera.copy(camera)
    lastDetail = detail
    lastReach = reach
    if (forced) return
    for (const item of tracked) {
      const distance = Math.hypot(item.x - camera.x, item.z - camera.z)
      let target = HIDDEN
      for (let k = 0; k <= last; k++) {
        if (distance < threshold(k, detail, reach)) {
          target = k
          break
        }
      }
      if (item.lod === UNSET) {
        // First frame: start in place, no fade.
        item.lod = target
        apply(item, target, HIDDEN, 0)
        continue
      }
      if (item.next === null) {
        if (target === item.lod) continue
        // Hysteresis: only switch once clearly past the boundary between the two levels.
        const current = rank(item.lod)
        const wanted = rank(target)
        const boundary = threshold(Math.min(current, wanted), detail, reach)
        if (wanted > current ? distance < boundary + HYSTERESIS : distance > boundary - HYSTERESIS) continue
        item.next = fromRank(wanted)
        item.t = 0
      }
      item.t = Math.min(1, item.t + delta / fadeSeconds)
      if (item.t >= 1) {
        item.lod = item.next
        item.next = null
        apply(item, item.lod, HIDDEN, 0)
      } else {
        apply(item, item.lod, item.next, item.t)
      }
    }
  }

  const forceLod = (level: number | null) => {
    if (level === null) {
      forced = false
      // Back to distance-based levels, applied at once (no fades).
      for (const item of tracked) {
        item.lod = UNSET
        item.next = null
      }
      update(lastCamera, lastDetail, 0, lastReach)
      return
    }
    forced = true
    for (const item of tracked) {
      for (const slot of item.slots) {
        const geometry = slot.geometries.slice(0, level + 1).findLast((g) => g >= 0) ?? -1
        show(slot, 0, geometry, FADE_FULL, item)
        show(slot, 1, -1, FADE_FULL, item)
      }
    }
  }

  return {
    group,
    update,
    forceLod,
    stats: () => {
      let visible = 0
      let triangles = 0
      for (const item of tracked) {
        if (item.lod < 0 && item.next === null) continue
        visible++
        for (const slot of item.slots) {
          if (item.lod >= 0) triangles += slot.triangles[item.lod] ?? 0
          if (item.next !== null && item.next >= 0) triangles += slot.triangles[item.next] ?? 0
        }
      }
      return { instances: tracked.length, visible, triangles }
    },
    dispose: () => batches.forEach(({ batch }) => batch.dispose()),
  }
}
