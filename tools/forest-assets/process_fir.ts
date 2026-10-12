// Turns Poly Haven's fir_tree_01 (3 trees, 7.8 M triangles, 478 MB) into a web-ready GLB:
// per tree three levels of detail (near / mid / far), needles as pruned/enlarged alpha cards, simplified trunks,
// cylindrical UVs for the trunk that has none, WebP textures, meshopt compression.
// Needles: the scanned single-needle cards become twig cards (whole twigs from the same atlas):
// natural size up close, fewer and larger farther away, each level with its own atlas from
// twig_clusters.py (twigs redrawn as clusters of smaller twigs for the larger cards).
// Usage: bun process_fir.ts <src.gltf> <webp dir> <out.glb> <twig atlas dir>  (see README.md)
import { NodeIO, type Primitive } from '@gltf-transform/core'
import { ALL_EXTENSIONS, EXTTextureWebP, KHRMaterialsIOR, KHRMaterialsSpecular } from '@gltf-transform/extensions'
import { dedup, meshopt, prune } from '@gltf-transform/functions'
import { MeshoptEncoder, MeshoptSimplifier } from 'meshoptimizer'
import { readFileSync } from 'node:fs'
import { basename, join } from 'node:path'

const [srcPath, webpDir, outPath, twigDir] = process.argv.slice(2)
await MeshoptSimplifier.ready
await MeshoptEncoder.ready

interface Lod {
  name: string
  trunk: number // index ratio kept
  bark: number
  dead: number // 0 = drop
  twigs: number // share of the needle cards that become a twig card
  twigScale: number // twig card size over natural size (its atlas is redrawn to match)
  stems: number // fraction of twig stems kept
}
// Fewer, larger twig cards with distance: twigs × twigScale² stays ~constant (same coverage).
const LODS: Lod[] = [
  { name: 'lod0', trunk: 0.18, bark: 0.3, dead: 0.5, twigs: 1 / 70, twigScale: 1, stems: 0.07 },
  { name: 'lod1', trunk: 0.06, bark: 0.06, dead: 0.2, twigs: 1 / 137, twigScale: 1.4, stems: 0.008 },
  { name: 'lod2', trunk: 0.012, bark: 0.02, dead: 0, twigs: 1 / 280, twigScale: 2, stems: 0 },
]
/** The twig sprites are drawn at ~45 px per 10 cm needle in the 1k atlas. */
const METERS_PER_ATLAS_PX = 0.1 / 45

const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ 'meshopt.encoder': MeshoptEncoder })
const doc = await io.read(srcPath)
const root = doc.getRoot()
const buffer = root.listBuffers()[0]

// Deterministic random for pruning.
let seed = 1234567
const rand = () => {
  seed = (seed + 0x6d2b79f5) >>> 0
  let t = seed
  t = Math.imul(t ^ (t >>> 15), t | 1)
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296
}

interface Arrays {
  position: Float32Array
  normal: Float32Array
  uv: Float32Array | null
  index: Uint32Array
}
const read = (p: Primitive): Arrays => ({
  position: p.getAttribute('POSITION')!.getArray() as Float32Array,
  normal: p.getAttribute('NORMAL')!.getArray() as Float32Array,
  uv: (p.getAttribute('TEXCOORD_0')?.getArray() as Float32Array | undefined) ?? null,
  index: Uint32Array.from(p.getIndices()!.getArray()!),
})

/** Keeps only the vertices referenced by `index` (renumbered). */
function compact(a: Arrays, index: Uint32Array): Arrays {
  const remap = new Int32Array(a.position.length / 3).fill(-1)
  let count = 0
  for (const i of index) if (remap[i] < 0) remap[i] = count++
  const position = new Float32Array(count * 3)
  const normal = new Float32Array(count * 3)
  const uv = a.uv ? new Float32Array(count * 2) : null
  remap.forEach((to, from) => {
    if (to < 0) return
    position.set(a.position.subarray(from * 3, from * 3 + 3), to * 3)
    normal.set(a.normal.subarray(from * 3, from * 3 + 3), to * 3)
    if (uv && a.uv) uv.set(a.uv.subarray(from * 2, from * 2 + 2), to * 2)
  })
  return { position, normal, uv, index: index.map((i) => remap[i]) }
}

function simplify(a: Arrays, ratio: number, error: number): Arrays {
  const target = Math.max(3, Math.floor((a.index.length * ratio) / 3) * 3)
  const [index] = MeshoptSimplifier.simplify(a.index, a.position, 3, target, error, ['ErrorAbsolute'])
  return compact(a, index)
}

/** Connected components of the triangle list (needle cards and twig stems). */
function components(a: Arrays) {
  const n = a.position.length / 3
  const parent = new Int32Array(n).map((_, i) => i)
  const find = (x: number) => {
    while (parent[x] !== x) {
      parent[x] = parent[parent[x]]
      x = parent[x]
    }
    return x
  }
  for (let t = 0; t < a.index.length; t += 3) {
    const r = find(a.index[t])
    parent[find(a.index[t + 1])] = r
    parent[find(a.index[t + 2])] = find(r)
  }
  const groups = new Map<number, number[]>() // root → triangle starts
  for (let t = 0; t < a.index.length; t += 3) {
    const r = find(a.index[t])
    const list = groups.get(r)
    if (list) list.push(t)
    else groups.set(r, [t])
  }
  return [...groups.values()]
}

/**
 * Stochastic pruning: keep a fraction of the needle cards and enlarge each kept card around its
 * center so the crown keeps most of its coverage (area ∝ kept × scale²), with far fewer triangles.
 */
interface TwigSprite {
  /** Box in the atlas, glTF UV (top-left origin): u0, v0, u1, v1. */
  uv: [number, number, number, number]
  /** Box size in atlas pixels (1k atlas). */
  px: [number, number]
}

type V3 = [number, number, number]
const sub = (a: V3, b: V3): V3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]]
const add = (a: V3, b: V3, k = 1): V3 => [a[0] + b[0] * k, a[1] + b[1] * k, a[2] + b[2] * k]
const dot = (a: V3, b: V3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2]
const cross = (a: V3, b: V3): V3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]
const norm = (a: V3): V3 => {
  const l = Math.hypot(a[0], a[1], a[2]) || 1
  return [a[0] / l, a[1] / l, a[2] / l]
}

/**
 * Twig cards: the scanned needles are single-needle cards (~10 cm, ~1 M per tree). A share of
 * them (`twigs`) each become one card showing a whole twig sprite, `scale` × its natural size:
 * based where the needle meets its twig (the end nearer the trunk), pointing the needle's way,
 * in the needle card's plane. Normals lean outward from the crown for soft foliage lighting.
 */
function twigCards(a: Arrays, twigs: number, scale: number, sprites: TwigSprite[]): Arrays {
  const position: number[] = []
  const normal: number[] = []
  const uv: number[] = []
  const index: number[] = []
  const at = (v: number): V3 => [a.position[v * 3], a.position[v * 3 + 1], a.position[v * 3 + 2]]
  for (const tris of components(a)) {
    if (tris.length > 6 || rand() > twigs) continue
    const verts = [...new Set(tris.flatMap((t) => [a.index[t], a.index[t + 1], a.index[t + 2]]))].map(at)
    const c = verts.reduce((sum, p) => add(sum, p, 1 / verts.length), [0, 0, 0] as V3)
    const p0 = verts.reduce((best, p) => (dot(sub(p, c), sub(p, c)) > dot(sub(best, c), sub(best, c)) ? p : best))
    const p1 = verts.reduce((best, p) => (dot(sub(p, p0), sub(p, p0)) > dot(sub(best, p0), sub(best, p0)) ? p : best))
    const radial = (p: V3) => Math.hypot(p[0], p[2])
    const [base, tip] = radial(p0) < radial(p1) ? [p0, p1] : [p1, p0]
    const d = norm(sub(tip, base))
    const t0 = tris[0]
    let n = norm(cross(sub(at(a.index[t0 + 1]), at(a.index[t0])), sub(at(a.index[t0 + 2]), at(a.index[t0]))))
    n = norm(add(n, d, -dot(n, d)))
    if (!Number.isFinite(n[0]) || Math.abs(dot(n, d)) > 0.99) n = norm(cross(d, [0, 1, 0]))
    const side = norm(cross(d, n))
    const sprite = sprites[Math.floor(rand() * sprites.length)]
    const k = METERS_PER_ATLAS_PX * scale * (0.8 + 0.4 * rand())
    const w = sprite.px[0] * k
    const h = sprite.px[1] * k
    const origin = add(base, d, -h * 0.06)
    const bl = add(origin, side, -w / 2)
    const br = add(origin, side, w / 2)
    const tr = add(br, d, h)
    const tl = add(bl, d, h)
    const outward = norm([c[0], Math.max(0.35, Math.hypot(c[0], c[2]) * 0.5), c[2]])
    const shade = norm(add(n, outward, 2.2))
    const [u0, v0, u1, v1] = sprite.uv
    const flip = rand() < 0.5
    const first = position.length / 3
    for (const [p, u, v] of [
      [bl, flip ? u1 : u0, v1],
      [br, flip ? u0 : u1, v1],
      [tr, flip ? u0 : u1, v0],
      [tl, flip ? u1 : u0, v0],
    ] as [V3, number, number][]) {
      position.push(...p)
      normal.push(...shade)
      uv.push(u, v)
    }
    index.push(first, first + 1, first + 2, first, first + 2, first + 3)
  }
  return { position: new Float32Array(position), normal: new Float32Array(normal), uv: new Float32Array(uv), index: new Uint32Array(index) }
}

/** Keeps a random share of the twig stems (components with more than a card's triangles). */
function pruneStems(a: Arrays, stems: number): Arrays {
  const keep: number[] = []
  for (const tris of components(a)) if (tris.length > 6 && rand() <= stems) keep.push(...tris)
  const index = new Uint32Array(keep.length * 3)
  keep.forEach((t, i) => index.set(a.index.subarray(t, t + 3), i * 3))
  return compact(a, index)
}

/** Concatenates two meshes of the same attributes. */
function concat(a: Arrays, b: Arrays): Arrays {
  const offset = a.position.length / 3
  const index = new Uint32Array(a.index.length + b.index.length)
  index.set(a.index)
  index.set(b.index.map((i) => i + offset), a.index.length)
  const join = (x: Float32Array, y: Float32Array) => {
    const out = new Float32Array(x.length + y.length)
    out.set(x)
    out.set(y, x.length)
    return out
  }
  return { position: join(a.position, b.position), normal: join(a.normal, b.normal), uv: a.uv && b.uv ? join(a.uv, b.uv) : null, index }
}

/** Cylindrical UVs (bark tiles ~1.1 m tall), de-indexed so triangles across the seam wrap correctly. */
function cylindricalUv(a: Arrays): Arrays {
  const count = a.index.length
  const position = new Float32Array(count * 3)
  const normal = new Float32Array(count * 3)
  const uv = new Float32Array(count * 2)
  for (let t = 0; t < count; t += 3) {
    const us: number[] = []
    for (let k = 0; k < 3; k++) {
      const v = a.index[t + k]
      position.set(a.position.subarray(v * 3, v * 3 + 3), (t + k) * 3)
      normal.set(a.normal.subarray(v * 3, v * 3 + 3), (t + k) * 3)
      us.push((Math.atan2(a.position[v * 3 + 2], a.position[v * 3]) / (Math.PI * 2) + 0.5) * 2)
      uv[(t + k) * 2 + 1] = a.position[v * 3 + 1] / 1.1
    }
    const max = Math.max(...us)
    for (let k = 0; k < 3; k++) uv[(t + k) * 2] = max - us[k] > 1 ? us[k] + 2 : us[k]
  }
  return { position, normal, uv, index: Uint32Array.from({ length: count }, (_, i) => i) }
}

function write(p: Primitive, a: Arrays) {
  const accessor = (type: 'VEC3' | 'VEC2' | 'SCALAR', array: Float32Array | Uint32Array) =>
    doc.createAccessor().setType(type).setArray(array).setBuffer(buffer)
  for (const semantic of p.listSemantics()) p.setAttribute(semantic, null)
  p.setAttribute('POSITION', accessor('VEC3', a.position))
  p.setAttribute('NORMAL', accessor('VEC3', a.normal))
  if (a.uv) p.setAttribute('TEXCOORD_0', accessor('VEC2', a.uv))
  p.setIndices(accessor('SCALAR', a.index))
}

// The trunk of tree c has no UVs: give it the tiling bark (like Blender's generated coordinates).
const bark = root.listMaterials().find((m) => m.getName() === 'fir_tree_01_bark')!
const trunkC = root.listMaterials().find((m) => m.getName() === 'fir_tree_01_trunk_c')!
trunkC.setBaseColorTexture(bark.getBaseColorTexture()).setNormalTexture(bark.getNormalTexture())
trunkC.setOcclusionTexture(bark.getOcclusionTexture()).setMetallicRoughnessTexture(bark.getMetallicRoughnessTexture())
for (const info of [trunkC.getBaseColorTextureInfo(), trunkC.getNormalTextureInfo(), trunkC.getOcclusionTextureInfo(), trunkC.getMetallicRoughnessTextureInfo()]) {
  info?.setExtension('KHR_texture_transform', null)
}

// One needle material per level: its atlas matches that level's twig card scale (logged below;
// pass the same scales to twig_clusters.py). Normal, AO and roughness maps are dropped: at card
// scale they no longer match the redrawn needles, and the site uses a constant roughness.
const sprites: TwigSprite[] = JSON.parse(readFileSync(join(twigDir, 'twig_sprites.json'), 'utf8'))
const twig = root.listMaterials().find((m) => m.getName() === 'fir_tree_01_twig')!
const twigByLod = new Map<string, ReturnType<typeof twig.clone>>()
for (const lod of LODS) {
  const material = twig.clone().setName(`fir_tree_01_twig_${lod.name}`)
  const atlas = doc
    .createTexture(`fir_tree_01_twig_${lod.name}`)
    .setImage(new Uint8Array(readFileSync(join(twigDir, `fir_tree_01_twig_${lod.name}.webp`))))
    .setMimeType('image/webp')
    .setURI(`fir_tree_01_twig_${lod.name}.webp`)
  material.setBaseColorTexture(atlas).setNormalTexture(null).setOcclusionTexture(null).setMetallicRoughnessTexture(null)
  twigByLod.set(lod.name, material)
  console.log(`${lod.name}: 1 twig card per ${Math.round(1 / lod.twigs)} needles, ${lod.twigScale}× natural size`)
}

const scene = root.listScenes()[0]
const stats: string[] = []
for (const node of [...root.listNodes()]) {
  const letter = node.getName().match(/fir_tree_01_([abc])_/)![1]
  const source = node.getMesh()!
  const sourcePrims = source.listPrimitives().map((p) => ({ p, kind: p.getMaterial()!.getName().replace('fir_tree_01_', ''), arrays: read(p) }))
  for (const lod of LODS) {
    const mesh = doc.createMesh(`fir_${letter}_${lod.name}`)
    let tris = 0
    for (const { p, kind, arrays } of sourcePrims) {
      let out: Arrays | null
      const coarse = lod.name === 'lod0' ? 1 : lod.name === 'lod1' ? 3 : 15
      if (kind.startsWith('trunk')) out = simplify(arrays, lod.trunk, 0.02 * coarse)
      else if (kind === 'bark') out = simplify(arrays, lod.bark, 0.03 * coarse)
      else if (kind === 'dead_branches') out = lod.dead > 0 ? simplify(arrays, lod.dead, 0.03) : null
      else out = concat(twigCards(arrays, lod.twigs, lod.twigScale, sprites), pruneStems(arrays, lod.stems))
      if (!out || out.index.length === 0) continue
      if (kind === 'trunk_c') out = cylindricalUv(out)
      const material = kind === 'twig' ? twigByLod.get(lod.name)! : p.getMaterial()
      const prim = doc.createPrimitive().setMaterial(material)
      write(prim, out)
      mesh.addPrimitive(prim)
      tris += out.index.length / 3
    }
    scene.addChild(doc.createNode(`fir_${letter}_${lod.name}`).setMesh(mesh))
    stats.push(`fir_${letter}_${lod.name}: ${tris.toLocaleString()} triangles`)
  }
  node.dispose()
  source.listPrimitives().forEach((p) => p.dispose())
  source.dispose()
}

// Materials: plain metal/rough (no specular/IOR → MeshStandardMaterial in three), needles as
// alpha-tested cards (BLEND would need sorting and the JPG had no alpha at all).
doc.createExtension(KHRMaterialsSpecular).dispose()
doc.createExtension(KHRMaterialsIOR).dispose()
for (const material of root.listMaterials()) {
  if (material.getName().includes('twig')) material.setAlphaMode('MASK').setAlphaCutoff(0.4)
}

// Textures → WebP (twig color carries the alpha).
doc.createExtension(EXTTextureWebP).setRequired(true)
for (const texture of root.listTextures()) {
  if (texture.getMimeType() === 'image/webp') continue // the needle atlases already are
  const name = basename(texture.getURI()).replace(/\.(jpg|png)$/, '.webp')
  texture.setImage(new Uint8Array(readFileSync(join(webpDir, name)))).setMimeType('image/webp').setURI(name)
}

await doc.transform(prune(), dedup(), meshopt({ encoder: MeshoptEncoder, level: 'medium' }))
await io.write(outPath, doc)
console.log(stats.join('\n'))
