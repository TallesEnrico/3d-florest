/**
 * Self-hosts the MediaPipe runtime: copies the vision wasm from node_modules and downloads the
 * Face Landmarker model into public/mediapipe/ (gitignored). Runs on `postinstall`; safe to rerun.
 * Never fails the install: on a network error it warns and the app falls back to the mouse.
 */
import { copyFile, mkdir, stat, writeFile } from 'node:fs/promises'
import { join } from 'node:path'

const MODEL_URL =
  'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task'
const WASM_FILES = [
  'vision_wasm_internal.js',
  'vision_wasm_internal.wasm',
  'vision_wasm_nosimd_internal.js',
  'vision_wasm_nosimd_internal.wasm',
]

const root = join(import.meta.dirname, '..')
const wasmSource = join(root, 'node_modules/@mediapipe/tasks-vision/wasm')
const wasmTarget = join(root, 'public/mediapipe/wasm')
const modelTarget = join(root, 'public/mediapipe/models/face_landmarker.task')

async function sizeOf(path: string): Promise<number | null> {
  try {
    return (await stat(path)).size
  } catch {
    return null
  }
}

async function copyWasm() {
  await mkdir(wasmTarget, { recursive: true })
  for (const file of WASM_FILES) {
    const from = join(wasmSource, file)
    const to = join(wasmTarget, file)
    // Same size = same version; otherwise refresh so the wasm always matches the JS package.
    if ((await sizeOf(from)) !== (await sizeOf(to))) await copyFile(from, to)
  }
}

async function downloadModel() {
  if (await sizeOf(modelTarget)) return
  await mkdir(join(modelTarget, '..'), { recursive: true })
  const response = await fetch(MODEL_URL)
  if (!response.ok) throw new Error(`HTTP ${response.status} downloading the model`)
  await writeFile(modelTarget, new Uint8Array(await response.arrayBuffer()))
}

try {
  await copyWasm()
  await downloadModel()
  console.log('[setup-mediapipe] public/mediapipe is ready')
} catch (error) {
  console.warn(`[setup-mediapipe] skipped: ${(error as Error).message}`)
  console.warn('[setup-mediapipe] run `bun scripts/setup-mediapipe.ts` once you are online')
}
