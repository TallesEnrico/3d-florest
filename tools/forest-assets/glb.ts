import { readFileSync, writeFileSync } from 'node:fs'

export interface BufferRange {
  buffer?: number
  byteOffset?: number
  byteLength: number
}

interface BufferView extends BufferRange {
  extensions?: { EXT_meshopt_compression?: BufferRange }
}

export interface TextureRef {
  index: number
}

export interface Gltf {
  images?: { bufferView: number; mimeType?: string }[]
  textures: { source?: number; extensions?: Record<string, { source: number } | undefined> }[]
  materials?: {
    pbrMetallicRoughness?: { baseColorTexture?: TextureRef; metallicRoughnessTexture?: TextureRef }
    normalTexture?: TextureRef
    occlusionTexture?: TextureRef
    emissiveTexture?: TextureRef
  }[]
  bufferViews: BufferView[]
  buffers: { byteLength: number }[]
  extensionsUsed?: string[]
  extensionsRequired?: string[]
}

export function readGlb(path: string) {
  const file = readFileSync(path)
  const jsonLength = file.readUInt32LE(12)
  const json = JSON.parse(file.subarray(20, 20 + jsonLength).toString()) as Gltf
  const bin = file.subarray(20 + jsonLength + 8)
  return { json, bin, size: file.length }
}

export function imageSource(json: Gltf, ref?: TextureRef): number | undefined {
  if (!ref) return undefined
  const texture = json.textures[ref.index]
  return texture.extensions?.EXT_texture_webp?.source ?? texture.extensions?.KHR_texture_basisu?.source ?? texture.source
}

export function imageBytes(json: Gltf, bin: Buffer, view: number): Buffer {
  const range = json.bufferViews[view]
  const start = range.byteOffset ?? 0
  return bin.subarray(start, start + range.byteLength)
}

export function writeGlb(path: string, json: Gltf, bin: Buffer, replaced: Map<number, Buffer>): number {
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
  json.bufferViews.forEach((view, index) => {
    const meshopt = view.extensions?.EXT_meshopt_compression
    const range = meshopt ?? view
    if ((range.buffer ?? 0) !== 0) return
    const start = range.byteOffset ?? 0
    append(range, replaced.get(index) ?? bin.subarray(start, start + range.byteLength))
  })
  const tail = (4 - (offset % 4)) % 4
  if (tail) chunks.push(Buffer.alloc(tail))
  const binChunk = Buffer.concat(chunks)
  json.buffers[0].byteLength = binChunk.length

  let jsonBytes = Buffer.from(JSON.stringify(json))
  jsonBytes = Buffer.concat([jsonBytes, Buffer.alloc((4 - (jsonBytes.length % 4)) % 4, 0x20)])
  const total = 12 + 8 + jsonBytes.length + 8 + binChunk.length
  const header = Buffer.alloc(12)
  header.write('glTF', 0)
  header.writeUInt32LE(2, 4)
  header.writeUInt32LE(total, 8)
  const chunkHeader = (length: number, type: string) => {
    const head = Buffer.alloc(8)
    head.writeUInt32LE(length, 0)
    head.write(type, 4)
    return head
  }
  writeFileSync(
    path,
    Buffer.concat([header, chunkHeader(jsonBytes.length, 'JSON'), jsonBytes, chunkHeader(binChunk.length, 'BIN\0'), binChunk]),
  )
  return total
}
