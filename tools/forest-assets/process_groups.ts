// Small multi-part props (lantern, bucket, crate…) → one web-ready GLB. Each source asset becomes
// one node named after it (its parts keep their relative placement); WebP textures, meshopt.
// Usage: bun process_groups.ts <out.glb> <name>:<src.gltf>:<webp dir> ...  (see README.md)
import { Document, NodeIO } from '@gltf-transform/core'
import { ALL_EXTENSIONS, EXTTextureWebP, KHRMaterialsIOR, KHRMaterialsSpecular } from '@gltf-transform/extensions'
import { dedup, mergeDocuments, meshopt, prune, unpartition } from '@gltf-transform/functions'
import { MeshoptEncoder } from 'meshoptimizer'
import { readFileSync } from 'node:fs'
import { basename, join } from 'node:path'
await MeshoptEncoder.ready
const [outPath, ...specs] = process.argv.slice(2)
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ 'meshopt.encoder': MeshoptEncoder })
const target = new Document()
for (const spec of specs) {
  const [name, src, webpDir] = spec.split(':')
  const doc = await io.read(src)
  const root = doc.getRoot()
  const scene = root.listScenes()[0]
  const group = doc.createNode(name)
  for (const child of scene.listChildren()) {
    scene.removeChild(child)
    group.addChild(child)
  }
  scene.addChild(group)
  doc.createExtension(KHRMaterialsSpecular).dispose()
  doc.createExtension(KHRMaterialsIOR).dispose()
  for (const texture of root.listTextures()) {
    const file = basename(texture.getURI()).replace(/\.(jpg|png)$/, '.webp')
    texture.setImage(new Uint8Array(readFileSync(join(webpDir, file)))).setMimeType('image/webp').setURI(file)
  }
  mergeDocuments(target, doc)
}
const scenes = target.getRoot().listScenes()
for (const scene of scenes.slice(1)) {
  for (const child of scene.listChildren()) scenes[0].addChild(child)
  scene.dispose()
}
target.createExtension(EXTTextureWebP).setRequired(true)
await target.transform(unpartition(), prune(), dedup(), meshopt({ encoder: MeshoptEncoder, level: 'medium' }))
await io.write(outPath, target)
console.log('groups:', scenes[0].listChildren().map((n) => n.getName()).join(', '))
