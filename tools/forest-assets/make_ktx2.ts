import { execFile } from 'node:child_process'
import { mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs'
import { availableParallelism, tmpdir } from 'node:os'
import { join } from 'node:path'
import { promisify } from 'node:util'
import { imageBytes, imageSource, readGlb, writeGlb } from './glb.ts'

const run = promisify(execFile)
const KTX = process.env.KTX ?? 'ktx'
const root = process.argv[2]
const work = mkdtempSync(join(tmpdir(), 'forest-ktx2-'))
let jobs = 0

interface EncodeOptions {
  srgb: boolean
  flip: boolean
}

let slots = availableParallelism()
const waiting: (() => void)[] = []
async function limited<T>(task: () => Promise<T>): Promise<T> {
  if (slots === 0) await new Promise<void>((resolve) => waiting.push(resolve))
  else slots--
  try {
    return await task()
  } finally {
    const next = waiting.shift()
    if (next) next()
    else slots++
  }
}

function encode(webp: Uint8Array, { srgb, flip }: EncodeOptions): Promise<Buffer> {
  return limited(async () => {
    const base = join(work, String(jobs++))
    writeFileSync(`${base}.webp`, webp)
    await run('dwebp', ['-quiet', `${base}.webp`, '-o', `${base}.png`])
    const alpha = readFileSync(`${base}.png`)[25] === 6
    const format = `${alpha ? 'R8G8B8A8' : 'R8G8B8'}_${srgb ? 'SRGB' : 'UNORM'}`
    await run(KTX, [
      'create',
      '--format', format,
      '--assign-tf', srgb ? 'srgb' : 'linear',
      ...(flip ? ['--convert-texcoord-origin', 'bottom-left'] : []),
      '--encode', 'basis-lz',
      '--qlevel', '128',
      '--generate-mipmap',
      `${base}.png`,
      `${base}.ktx2`,
    ])
    return readFileSync(`${base}.ktx2`)
  })
}

async function convertGlb(source: string, target: string) {
  const { json, bin, size } = readGlb(source)
  const colorImages = new Set<number>()
  for (const material of json.materials ?? []) {
    for (const ref of [material.pbrMetallicRoughness?.baseColorTexture, material.emissiveTexture]) {
      const image = imageSource(json, ref)
      if (image !== undefined) colorImages.add(image)
    }
  }
  const images = new Map<number, Buffer>()
  await Promise.all(
    (json.images ?? []).map(async (image, index) => {
      images.set(image.bufferView, await encode(imageBytes(json, bin, image.bufferView), { srgb: colorImages.has(index), flip: false }))
      image.mimeType = 'image/ktx2'
    }),
  )
  json.textures.forEach((texture, index) => {
    const image = imageSource(json, { index }) as number
    const extensions = { ...texture.extensions, KHR_texture_basisu: { source: image } }
    delete extensions.EXT_texture_webp
    texture.extensions = extensions
    delete texture.source
  })
  const swap = (list?: string[]) => list?.map((name) => (name === 'EXT_texture_webp' ? 'KHR_texture_basisu' : name))
  json.extensionsUsed = swap(json.extensionsUsed)
  json.extensionsRequired = swap(json.extensionsRequired)
  console.log(`${target}: ${size} → ${writeGlb(target, json, bin, images)} bytes`)
}

const textures = join(root, 'textures')
await Promise.all(
  readdirSync(textures)
    .filter((name) => name.endsWith('.webp'))
    .map(async (name) => {
      const ktx2 = await encode(readFileSync(join(textures, name)), { srgb: name.includes('_diff_'), flip: true })
      writeFileSync(join(textures, name.replace('.webp', '.ktx2')), ktx2)
      console.log(`${name}: ${readFileSync(join(textures, name)).length} → ${ktx2.length} bytes`)
    }),
)
const models = join(root, 'models')
await Promise.all(
  readdirSync(models)
    .filter((name) => name.endsWith('.glb') && !name.endsWith('.ktx2.glb'))
    .map((name) => convertGlb(join(models, name), join(models, name.replace('.glb', '.ktx2.glb')))),
)
rmSync(work, { recursive: true })
