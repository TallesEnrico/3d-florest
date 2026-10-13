import {
  type BufferGeometry,
  DoubleSide,
  Float32BufferAttribute,
  FrontSide,
  Group,
  type Material,
  Mesh,
  MeshLambertMaterial,
  MeshStandardMaterial,
  type Object3D,
  RepeatWrapping,
  SRGBColorSpace,
  type Texture,
  type Vector3,
} from 'three'
import { layoutTrees, layoutUndergrowth, type Placement } from '../procedural/layout.ts'
import { createRng } from '../procedural/random.ts'
import { createRiver } from '../procedural/river.ts'
import { buildGround, buildTrail, createTerrain } from '../procedural/terrain.ts'
import type { ForestConfig } from '../types/index.ts'
import { bakeParts, reachBelow } from './bakeParts.ts'
import { createLodBatches, type LodInstance, type LodModel } from './lodBatches.ts'
import { buildCabin, type Cabin, type CabinTextures } from './cabin.ts'
import { solidCrown } from './solidCrown.ts'
import { createWater } from './water.ts'
import { yieldToMain } from './yieldToMain.ts'

/** Color, normal and AO/roughness/metal maps of one ground material, already loaded. */
export interface LoadedTextureSet {
  color: Texture
  normal: Texture
  arm: Texture
}

export interface RealisticForestInput {
  config: ForestConfig
  /** Root of the trees GLB (nodes `<model>_lod0`, `<model>_lod1`, … one per `lod.trees` distance). */
  trees: Object3D
  /** Root of the ground-cover GLB (ferns, rocks, stump, fallen trunk, roots). */
  props: Object3D
  ground: { litter: LoadedTextureSet; trail: LoadedTextureSet }
  /** 1 = full forest; lower on small screens. */
  density: number
}

export interface RealisticForest {
  group: Group
  /**
   * Per frame: level of detail from the camera position (`detail` < 1 shortens the distances;
   * `delta` = seconds since the last frame, for the dissolves) and the river's flow (`elapsed`
   * seconds; keep it constant to stop the water). `foliage` = most detailed tree model drawn.
   */
  update: (camera: Vector3, detail: number, delta: number, elapsed: number, reach: number, foliage: number) => void
  /** On while the static shadow map is drawn: every tree and prop at a fixed level of detail. */
  shadowPass: (on: boolean) => void
  /**
   * Second stage: places the cabin (yard props, furniture GLB roots and its materials) in the
   * clearing, on the forest's terrain. Returns the cabin's group, for warming it up.
   */
  addCabin: (cabinProps: Object3D, cabinInterior: Object3D, textures: CabinTextures) => Group
  removeCabin: () => void
  stats: () => Record<string, { instances: number; visible: number; triangles: number }>
  dispose: () => void
}

const FERNS = ['fern_02_a', 'fern_02_b', 'fern_02_c', 'fern_02_d']
const ROCKS = [1, 2, 3, 4, 5, 6].map((n) => `rock_moss_set_01_rock0${n}`)
const ROOTS = ['pine_roots_a', 'pine_roots_b']
/**
 * The extra, simplest tree level (only drawn when `foliage` asks for it, on the slowest devices):
 * no needles, a third of the far model's cards as plain opaque rectangles.
 */
const CROWN = { keep: 0.5, needles: 4, width: 0.3, spread: 0.6, shade: [0.45, 0.9] as [number, number] }
const CROWN_COLOR = '#2f3b27'
/** Head height used to measure how far low branches reach toward the paths. */
const HEAD_HEIGHT = 4

function prepareTextures(set: LoadedTextureSet) {
  set.color.colorSpace = SRGBColorSpace
  for (const texture of [set.color, set.normal, set.arm]) {
    texture.wrapS = texture.wrapT = RepeatWrapping
    texture.anisotropy = 8
    texture.needsUpdate = true
  }
}

function groundMaterial(set: LoadedTextureSet, extra: Partial<MeshStandardMaterial> = {}) {
  return new MeshStandardMaterial({
    map: set.color,
    normalMap: set.normal,
    aoMap: set.arm,
    roughnessMap: set.arm,
    metalness: 0,
    vertexColors: true,
    ...extra,
  })
}

/** Trunk materials (tree c's trunk shares the dead-branch bark): these get the extra girth. */
const isTrunk = (material: Material) => /trunk_[ab]$|dead_branches$/.test(material.name)

/**
 * Darkens the foot of a trunk, in model space (base at y = 0): real trunks are darker where they
 * meet the ground (contact shade, damp soil, moss), and the flared roots — widened by the girth
 * and facing up — otherwise catch the full sky light and read as a grey ring. Vertex colors
 * (multiplied with the bark photo and the instance tint).
 */
function shadeTrunkFoot(geometry: BufferGeometry) {
  const position = geometry.getAttribute('position')
  const normal = geometry.getAttribute('normal')
  const colors = new Float32Array(position.count * 3)
  for (let i = 0; i < position.count; i++) {
    const y = position.getY(i)
    const t = Math.min(1, Math.max(0, y / 2.2))
    const height = t * t * (3 - 2 * t)
    // Root flare tops face the sky: they get mossy-dark, not light.
    const upward = Math.max(0, normal.getY(i)) * (1 - height)
    const v = (0.42 + 0.58 * height) * (1 - 0.35 * upward)
    colors[i * 3] = v * (0.92 + 0.08 * height)
    colors[i * 3 + 1] = v * (0.94 + 0.06 * height)
    colors[i * 3 + 2] = v * (0.82 + 0.18 * height)
  }
  geometry.setAttribute('color', new Float32BufferAttribute(colors, 3))
}

/**
 * Material tweaks for real time: alpha-to-coverage on foliage cards (soft, antialiased edges),
 * needles less glossy and a touch deeper green (the enlarged cards otherwise catch the hazy sky
 * like straw), single-sided trunks.
 */
function tuneMaterials(models: LodModel[]) {
  for (const part of models.flatMap((m) => m.lods.flat())) {
    if (!isTrunk(part.material)) continue
    shadeTrunkFoot(part.geometry)
    if (part.material instanceof MeshStandardMaterial) part.material.vertexColors = true
  }
  const materials = new Set<Material>(models.flatMap((m) => m.lods.flat().map((p) => p.material)))
  for (const material of materials) {
    if (material.alphaTest > 0) material.alphaToCoverage = true
    if (/trunk_[ab]$/.test(material.name)) material.side = FrontSide
    // One needle material per level of detail (fir_tree_01_twig_lod0…2), each with its own atlas.
    if (material instanceof MeshStandardMaterial && material.name.includes('twig')) {
      material.color.set(NEEDLE_TINT)
      material.roughnessMap = null
      material.roughness = 0.92
      material.envMapIntensity = 0.7
      keepFoliageNormals(material)
    }
  }
}
const NEEDLE_TINT = '#7f9468'

/**
 * The twig cards' normals point out of the crown (set in the asset pipeline). Double-sided
 * materials flip the normal on back faces, which would turn every card seen from behind dark;
 * foliage keeps the crown normal on both sides instead.
 */
function keepFoliageNormals(material: Material) {
  const previous = material.onBeforeCompile.bind(material)
  material.onBeforeCompile = (shader, renderer) => {
    previous(shader, renderer)
    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <normal_fragment_begin>',
      '#include <normal_fragment_begin>\n#ifdef DOUBLE_SIDED\n  normal *= faceDirection;\n#endif',
    )
  }
  const previousKey = material.customProgramCacheKey.bind(material)
  material.customProgramCacheKey = () => `${previousKey()}|foliage-normals`
}

/**
 * Assembles the photoreal forest from the loaded assets: seeded placement (corridor, clearing,
 * river, framing trees), scanned trees/plants/rocks drawn in batches with distance-based detail,
 * the textured ground with the worn trail and the river between chapters 3 and 4. The log cabin
 * in the clearing at the end comes later, through `addCabin`.
 */
export async function buildRealisticForest({ config, trees, props, ground, density }: RealisticForestInput): Promise<RealisticForest> {
  const { layout, lod, palette, shots } = config
  const rng = createRng(layout.seed)
  const river = createRiver(layout)
  const terrain = createTerrain(layout.seed + 1, layout, river)

  // Each step is a few tens of milliseconds at most; between them the page keeps scrolling.
  const crownMaterial = new MeshLambertMaterial({ name: 'fir_crown_solid', color: CROWN_COLOR, vertexColors: true, side: DoubleSide })
  keepFoliageNormals(crownMaterial)
  const treeModels: LodModel[] = []
  for (const species of layout.species) {
    const lods = []
    for (let k = 0; k < lod.trees.length; k++) {
      lods.push(bakeParts(trees, `${species.model}_lod${k}`))
      await yieldToMain()
    }
    lods.push(solidCrown(lods[lods.length - 1], (part) => part.material.name.includes('twig'), crownMaterial, { ...CROWN, seed: layout.seed + 11 }))
    await yieldToMain()
    treeModels.push({ name: species.model, lods })
  }
  const shapes = treeModels.map((model, i) => ({
    lowReach: Math.max(
      ...model.lods[0].map((part) => reachBelow([part], HEAD_HEIGHT / layout.species[i].scale[0]) * (isTrunk(part.material) ? layout.girth : 1)),
    ),
  }))
  const single = (name: string): LodModel => ({ name, lods: [bakeParts(props, name)] })
  // Ferns have one detail level; their switch is "near model / hidden", scaled with detail.
  const fernModels = FERNS.map(single)
  const rockModels = ROCKS.map(single)
  const rootModels = ROOTS.map(single)
  const stump = single('tree_stump_01')
  const log = single('dead_tree_trunk_02')
  tuneMaterials([...treeModels, ...fernModels])
  await yieldToMain()

  const treeLayout = layoutTrees(rng, terrain, layout, shots, shapes, river, density)
  await yieldToMain()
  const plants = layoutUndergrowth(
    rng,
    terrain,
    layout,
    treeLayout,
    { ferns: fernModels.length, rocks: rockModels.length, roots: rootModels.length },
    river,
    density,
  )

  const asInstances = (items: (Placement & { variant?: number })[], offset = 0): LodInstance[] =>
    items.map((placement) => ({ model: offset + (placement.variant ?? 0), placement }))
  const propModels = [...rockModels, stump, log, ...rootModels]
  await yieldToMain()
  const treeBatches = createLodBatches('trees', treeModels, asInstances(treeLayout.trees), lod.trees, lod.fadeSeconds, { hueAmount: 0.05, castShadow: true, girth: (m) => (isTrunk(m) ? layout.girth : 1) })
  await yieldToMain()
  const fernBatches = createLodBatches('ferns', fernModels, asInstances(plants.ferns), [lod.plants], lod.fadeSeconds, { hueAmount: 0.12 })
  await yieldToMain()
  const batches = {
    trees: treeBatches,
    ferns: fernBatches,
    props: createLodBatches(
      'props',
      propModels,
      [
        ...asInstances(plants.rocks),
        ...asInstances(plants.stumps, rockModels.length),
        ...asInstances(plants.logs, rockModels.length + 1),
        ...asInstances(plants.roots, rockModels.length + 2),
      ],
      [lod.props],
      lod.fadeSeconds,
      { castShadow: true },
    ),
  }

  await yieldToMain()
  prepareTextures(ground.litter)
  prepareTextures(ground.trail)
  const { litter, trail } = config.assets.ground
  const floor = new Mesh(
    buildGround(terrain, layout, palette.ground, treeLayout.occlusion, litter.tile, layout.seed + 3, river),
    groundMaterial(ground.litter),
  )
  floor.name = 'ground'
  floor.receiveShadow = true
  const path = new Mesh(
    buildTrail(terrain, layout, trail.tile, layout.seed + 4, river),
    groundMaterial(ground.trail, { transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 }),
  )
  path.name = 'trail'
  path.receiveShadow = true

  const group = new Group()
  group.name = 'realistic-forest'
  await yieldToMain()
  const water = createWater(river, palette.water, layout.bounds.xHalf, layout.seed + 5)
  const stream = new Mesh(water.geometry, water.material)
  stream.name = 'river'
  stream.receiveShadow = true

  group.add(floor, path, stream, batches.trees.group, batches.ferns.group, batches.props.group)

  let lodge: Cabin | null = null
  let finestTrees = 0
  const removeCabin = () => {
    if (!lodge) return
    group.remove(lodge.group)
    lodge.dispose()
    lodge = null
  }

  const baked = [...treeModels, ...fernModels, ...propModels].flatMap((m) => m.lods.flat().map((p) => p.geometry))
  return {
    group,
    addCabin: (cabinProps, cabinInterior, textures) => {
      removeCabin()
      lodge = buildCabin(
        layout.cabin,
        textures,
        cabinProps,
        cabinInterior,
        props.getObjectByName('tree_stump_01') ?? null,
        terrain.height(layout.cabin.center[0], layout.cabin.center[1]),
        config.atmosphere.fog.density,
      )
      group.add(lodge.group)
      return lodge.group
    },
    removeCabin,
    shadowPass: (on) => {
      // Mid-level trees: full silhouettes everywhere, a fraction of the near-level triangles.
      batches.trees.forceLod(on ? Math.max(1, finestTrees) : null)
      batches.props.forceLod(on ? 0 : null)
    },
    update: (camera, detail, delta, elapsed, reach, foliage) => {
      finestTrees = foliage
      water.update(elapsed)
      lodge?.update(elapsed, camera)
      batches.trees.update(camera, detail, delta, reach, foliage)
      batches.ferns.update(camera, 1, delta, reach)
      batches.props.update(camera, detail, delta, reach)
    },
    stats: () => ({ trees: batches.trees.stats(), ferns: batches.ferns.stats(), props: batches.props.stats() }),
    dispose: () => {
      Object.values(batches).forEach((b) => b.dispose())
      water.dispose()
      removeCabin()
      baked.forEach((g) => g.dispose())
      crownMaterial.dispose()
      for (const mesh of [floor, path]) {
        mesh.geometry.dispose()
        ;(mesh.material as Material).dispose()
      }
    },
  }
}
