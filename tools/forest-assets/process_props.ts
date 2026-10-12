// Ground-cover props (ferns, mossy rocks, stump, fallen trunk, roots) → one web-ready GLB:
// simplified meshes, each node re-centered at the origin, WebP textures, meshopt.
// Usage: bun process_props.ts <out.glb> <src.gltf>:<webp dir>:<ratio> ...
import { Document, NodeIO } from '@gltf-transform/core'
import { ALL_EXTENSIONS, EXTTextureWebP, KHRMaterialsIOR, KHRMaterialsSpecular } from '@gltf-transform/extensions'
import { dedup, mergeDocuments, meshopt, prune, unpartition } from '@gltf-transform/functions'
import { MeshoptEncoder, MeshoptSimplifier } from 'meshoptimizer'
import { readFileSync } from 'node:fs'
import { basename, join } from 'node:path'
await MeshoptSimplifier.ready
await MeshoptEncoder.ready
const [outPath, ...specs] = process.argv.slice(2)
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ 'meshopt.encoder': MeshoptEncoder })
const target = new Document()
for (const spec of specs) {
  const [src, webpDir, ratioText] = spec.split(':')
  const ratio = Number(ratioText)
  const doc = await io.read(src)
  const root = doc.getRoot()
  for (const node of root.listNodes()) {
    node.setTranslation([0, 0, 0])
    for (const prim of node.getMesh()?.listPrimitives() ?? []) {
      for (const semantic of prim.listSemantics()) if (semantic.startsWith('COLOR')) prim.setAttribute(semantic, null)
      if (ratio >= 1) continue
      const position = prim.getAttribute('POSITION')!.getArray() as Float32Array
      const indices = Uint32Array.from(prim.getIndices()!.getArray()!)
      const goal = Math.max(3, Math.floor((indices.length * ratio) / 3) * 3)
      const [simplified] = MeshoptSimplifier.simplify(indices, position, 3, goal, 0.01, ['ErrorAbsolute'])
      prim.setIndices(doc.createAccessor().setType('SCALAR').setArray(simplified).setBuffer(root.listBuffers()[0]))
      console.log(`${node.getName()}: ${indices.length / 3} → ${simplified.length / 3} triangles`)
    }
  }
  doc.createExtension(KHRMaterialsSpecular).dispose()
  doc.createExtension(KHRMaterialsIOR).dispose()
  for (const texture of root.listTextures()) {
    const name = basename(texture.getURI()).replace(/\.(jpg|png)$/, '.webp')
    texture.setImage(new Uint8Array(readFileSync(join(webpDir, name)))).setMimeType('image/webp').setURI(name)
  }
  mergeDocuments(target, doc)
}
// One scene with every prop node; one buffer.
const scenes = target.getRoot().listScenes()
for (const scene of scenes.slice(1)) {
  for (const child of scene.listChildren()) scenes[0].addChild(child)
  scene.dispose()
}
target.createExtension(EXTTextureWebP).setRequired(true)
await target.transform(unpartition(), prune(), dedup(), meshopt({ encoder: MeshoptEncoder, level: 'medium' }))
await io.write(outPath, target)
console.log('nodes:', target.getRoot().listNodes().map((n) => n.getName()).join(', '))
