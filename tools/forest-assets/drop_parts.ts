// Removes parts of a model by texture region: every connected part (vertices welded by position)
// whose triangles mostly sample the given UV box is deleted. Used on vintage_day_bed, whose scan
// includes two grey pillows (the damask squares of its atlas); on the site, the throw pillows
// sit in their place. Runs on the source glTF, before process_groups.ts.
// Usage: bun drop_parts.ts <in.gltf> <out.gltf> <u0,v0,u1,v1> [--dry]
//   UV box with glTF's top-left origin; --dry only lists the parts and what would go.
import { NodeIO } from '@gltf-transform/core'
import { ALL_EXTENSIONS } from '@gltf-transform/extensions'
import { prune } from '@gltf-transform/functions'

const [inPath, outPath, boxText, ...flags] = process.argv.slice(2)
const [u0, v0, u1, v1] = boxText.split(',').map(Number)
const dry = flags.includes('--dry')
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS)
const doc = await io.read(inPath)

for (const mesh of doc.getRoot().listMeshes()) {
  for (const prim of mesh.listPrimitives()) {
    const pos = prim.getAttribute('POSITION')
    const uv = prim.getAttribute('TEXCOORD_0')
    const indices = prim.getIndices()
    if (!pos || !uv || !indices) continue
    // Parts: union-find over vertices, joined by triangles and by equal positions (UV seams).
    const parent = Array.from({ length: pos.getCount() }, (_, i) => i)
    const find = (i: number): number => (parent[i] === i ? i : (parent[i] = find(parent[i])))
    const join = (a: number, b: number) => {
      parent[find(a)] = find(b)
    }
    const seen = new Map<string, number>()
    for (let i = 0; i < pos.getCount(); i++) {
      const key = pos.getElement(i, [0, 0, 0]).map((v) => v.toFixed(5)).join()
      const other = seen.get(key)
      if (other === undefined) seen.set(key, i)
      else join(i, other)
    }
    const triangles = indices.getCount() / 3
    for (let t = 0; t < triangles; t++) {
      join(indices.getScalar(t * 3), indices.getScalar(t * 3 + 1))
      join(indices.getScalar(t * 3), indices.getScalar(t * 3 + 2))
    }
    const parts = new Map<number, { triangles: number; inside: number }>()
    const inBox = (t: number) => {
      let u = 0
      let v = 0
      for (let k = 0; k < 3; k++) {
        const [a, b] = uv.getElement(indices.getScalar(t * 3 + k), [0, 0])
        u += a / 3
        v += b / 3
      }
      return u >= u0 && u <= u1 && v >= v0 && v <= v1
    }
    for (let t = 0; t < triangles; t++) {
      const part = parts.get(find(indices.getScalar(t * 3))) ?? { triangles: 0, inside: 0 }
      part.triangles++
      if (inBox(t)) part.inside++
      parts.set(find(indices.getScalar(t * 3)), part)
    }
    const drop = new Set([...parts].filter(([, p]) => p.inside / p.triangles > 0.5).map(([root]) => root))
    console.log(`${mesh.getName()}: ${parts.size} parts`)
    for (const [root, p] of parts) {
      console.log(`  ${p.triangles} triangles, ${((100 * p.inside) / p.triangles).toFixed(0)}% in the box${drop.has(root) ? '  → removed' : ''}`)
    }
    if (dry || drop.size === 0) continue
    const kept: number[] = []
    for (let t = 0; t < triangles; t++) {
      if (drop.has(find(indices.getScalar(t * 3)))) continue
      for (let k = 0; k < 3; k++) kept.push(indices.getScalar(t * 3 + k))
    }
    indices.setArray(new Uint32Array(kept))
  }
}
if (!dry) {
  await doc.transform(prune())
  await io.write(outPath, doc)
  console.log('written', outPath)
}
