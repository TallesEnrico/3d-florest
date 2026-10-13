import { NodeIO } from '@gltf-transform/core'
import { ALL_EXTENSIONS } from '@gltf-transform/extensions'
import { prune } from '@gltf-transform/functions'
import { MeshoptDecoder, MeshoptEncoder } from 'meshoptimizer'
import { spawnSync } from 'node:child_process'
import { mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const LITE_SIZE = 512
const LITE_ARM_SIZE = 256
const root = process.argv[2]
const work = mkdtempSync(join(tmpdir(), 'forest-lite-'))

function shrinkWebp(data: Uint8Array, size = LITE_SIZE): Buffer {
  const input = join(work, 'in.webp')
  const output = join(work, 'out.webp')
  writeFileSync(input, data)
  const args = ['-quiet', '-q', '88', '-alpha_q', '100', '-exact', '-sharp_yuv', '-m', '6']
  const result = spawnSync('cwebp', [...args, '-resize', String(size), String(size), input, '-o', output])
  if (result.status !== 0) throw new Error(`cwebp failed: ${result.stderr}`)
  return readFileSync(output)
}

interface BufferRange {
  buffer?: number
  byteOffset?: number
  byteLength: number
}
interface BufferView extends BufferRange {
  extensions?: { EXT_meshopt_compression?: BufferRange }
}

function shrinkGlb(source: string, target: string) {
  const file = readFileSync(source)
  const jsonLength = file.readUInt32LE(12)
  const json = JSON.parse(file.subarray(20, 20 + jsonLength).toString())
  const bin = file.subarray(20 + jsonLength + 8)
  const armImages = new Set<number>()
  const sourceOf = (ref?: { index: number }) => {
    if (!ref) return undefined
    const texture = json.textures[ref.index]
    return texture.extensions?.EXT_texture_webp?.source ?? texture.source
  }
  for (const material of json.materials ?? []) {
    for (const ref of [material.pbrMetallicRoughness?.metallicRoughnessTexture, material.occlusionTexture]) {
      const source = sourceOf(ref)
      if (source !== undefined) armImages.add(source)
    }
  }
  const images = new Map<number, Buffer>()
  json.images?.forEach((image: { bufferView: number }, index: number) => {
    const view: BufferView = json.bufferViews[image.bufferView]
    const start = view.byteOffset ?? 0
    const size = armImages.has(index) ? LITE_ARM_SIZE : LITE_SIZE
    images.set(image.bufferView, shrinkWebp(bin.subarray(start, start + view.byteLength), size))
  })

  const chunks: Buffer[] = []
  let offset = 0
  const append = (range: BufferRange, data: Buffer) => {
    const padding = (8 - (offset % 8)) % 8
    if (padding) chunks.push(Buffer.alloc(padding))
    offset += padding
    range.byteOffset = offset
    range.byteLength = data.length
    chunks.push(data)
    offset += data.length
  }
  json.bufferViews.forEach((view: BufferView, index: number) => {
    const meshopt = view.extensions?.EXT_meshopt_compression
    const range = meshopt ?? view
    if ((range.buffer ?? 0) !== 0) return
    const start = range.byteOffset ?? 0
    append(range, images.get(index) ?? bin.subarray(start, start + range.byteLength))
  })
  const tail = (4 - (offset % 4)) % 4
  if (tail) chunks.push(Buffer.alloc(tail))
  const binChunk = Buffer.concat(chunks)
  json.buffers[0].byteLength = binChunk.length

  let jsonBytes = Buffer.from(JSON.stringify(json))
  jsonBytes = Buffer.concat([jsonBytes, Buffer.alloc((4 - (jsonBytes.length % 4)) % 4, 0x20)])
  const header = Buffer.alloc(12)
  header.write('glTF', 0)
  header.writeUInt32LE(2, 4)
  header.writeUInt32LE(12 + 8 + jsonBytes.length + 8 + binChunk.length, 8)
  const chunkHeader = (length: number, type: string) => {
    const head = Buffer.alloc(8)
    head.writeUInt32LE(length, 0)
    head.write(type, 4)
    return head
  }
  writeFileSync(
    target,
    Buffer.concat([header, chunkHeader(jsonBytes.length, 'JSON'), jsonBytes, chunkHeader(binChunk.length, 'BIN\0'), binChunk]),
  )
  console.log(`${target}: ${file.length} → ${12 + 16 + jsonBytes.length + binChunk.length} bytes`)
}

function readHdr(source: string) {
  const file = readFileSync(source)
  const headerEnd = file.indexOf('\n\n') + 2
  const sizeEnd = file.indexOf('\n', headerEnd)
  const [, height, , width] = file.toString('ascii', headerEnd, sizeEnd).split(' ').map((part) => Number(part) || part)
  const w = width as number
  const h = height as number
  const pixels = new Float32Array(w * h * 3)
  let p = sizeEnd + 1
  const line = new Uint8Array(w * 4)
  for (let y = 0; y < h; y++) {
    if (file[p] === 2 && file[p + 1] === 2) {
      p += 4
      for (let channel = 0; channel < 4; channel++) {
        let x = 0
        while (x < w) {
          let count = file[p++]
          if (count > 128) {
            count -= 128
            const value = file[p++]
            while (count--) line[(x++) * 4 + channel] = value
          } else {
            while (count--) line[(x++) * 4 + channel] = file[p++]
          }
        }
      }
    } else {
      line.set(file.subarray(p, p + w * 4))
      p += w * 4
    }
    for (let x = 0; x < w; x++) {
      const e = line[x * 4 + 3]
      const scale = e ? 2 ** (e - 136) : 0
      for (let c = 0; c < 3; c++) pixels[(y * w + x) * 3 + c] = line[x * 4 + c] * scale
    }
  }
  return { width: w, height: h, pixels }
}

function shrinkHdr(source: string, target: string) {
  const { width, height, pixels } = readHdr(source)
  const w = width / 2
  const h = height / 2
  const out = Buffer.alloc(w * h * 4)
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const rgb = [0, 0, 0].map((_, c) => {
        let sum = 0
        for (const [dx, dy] of [[0, 0], [1, 0], [0, 1], [1, 1]]) sum += pixels[((y * 2 + dy) * width + x * 2 + dx) * 3 + c]
        return sum / 4
      })
      const max = Math.max(...rgb)
      const i = (y * w + x) * 4
      if (max < 1e-32) continue
      const e = Math.ceil(Math.log2(max + 1e-38))
      const scale = 256 / 2 ** e
      rgb.forEach((value, c) => (out[i + c] = Math.min(255, Math.floor(value * scale))))
      out[i + 3] = e + 128
    }
  }
  const header = `#?RADIANCE\nFORMAT=32-bit_rle_rgbe\n\n-Y ${h} +X ${w}\n`
  writeFileSync(target, Buffer.concat([Buffer.from(header, 'ascii'), out]))
  console.log(`${target}: ${readFileSync(source).length} → ${header.length + out.length} bytes`)
}

async function dropNearTreeDetail(path: string) {
  await Promise.all([MeshoptDecoder.ready, MeshoptEncoder.ready])
  const io = new NodeIO()
    .registerExtensions(ALL_EXTENSIONS)
    .registerDependencies({ 'meshopt.decoder': MeshoptDecoder, 'meshopt.encoder': MeshoptEncoder })
  const doc = await io.read(path)
  const nodes = doc.getRoot().listNodes()
  const parentOf = (node: (typeof nodes)[number]) => node.getParentNode() ?? null
  for (const near of nodes.filter((node) => node.getName().endsWith('_lod0'))) {
    const mid = nodes.find((node) => node.getName() === near.getName().replace(/_lod0$/, '_lod1'))
    if (!mid || parentOf(mid) !== parentOf(near) || near.listChildren().length || mid.listChildren().length) {
      throw new Error(`${near.getName()}: no matching _lod1 sibling`)
    }
    near.setMesh(mid.getMesh()).setTranslation(mid.getTranslation()).setRotation(mid.getRotation()).setScale(mid.getScale())
  }
  await doc.transform(prune())
  await io.write(path, doc)
  console.log(`${path}: near detail dropped, ${readFileSync(path).length} bytes`)
}

for (const name of readdirSync(join(root, 'textures')).filter((name) => name.endsWith('_1k.webp'))) {
  const target = name.replace('_1k.webp', `_${LITE_SIZE}.webp`)
  const size = name.includes('_arm_') ? LITE_ARM_SIZE : LITE_SIZE
  writeFileSync(join(root, 'textures', target), shrinkWebp(readFileSync(join(root, 'textures', name)), size))
}
console.log('textures written')
for (const name of readdirSync(join(root, 'models')).filter((name) => name.endsWith('.glb') && !name.endsWith('_lite.glb'))) {
  shrinkGlb(join(root, 'models', name), join(root, 'models', name.replace('.glb', '_lite.glb')))
}
await dropNearTreeDetail(join(root, 'models', 'fir_trees_lite.glb'))
for (const name of readdirSync(join(root, 'hdri')).filter((name) => name.endsWith('_1k.hdr'))) {
  shrinkHdr(join(root, 'hdri', name), join(root, 'hdri', name.replace('_1k.hdr', `_${LITE_SIZE}.hdr`)))
}
rmSync(work, { recursive: true })
