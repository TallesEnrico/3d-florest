import type { QualityTierName } from '../types/index.ts'

interface DeviceSignals {
  cores: number
  memory?: number
  gpu: string
  lite: boolean
}

const WEAK_GPU = /mali-(4|t\d|g[3-5]\d\b)|adreno( \(tm\))? [3-5]\d\d|powervr|swiftshader|llvmpipe|software|intel.*(gma|hd graphics [2-5]\d{2,3}\b)/i
const STRONG_GPU = /apple m\d|nvidia|geforce|quadro|rtx|radeon (rx|pro)|adreno( \(tm\))? [7-9]\d\d|mali-g(7\d|9\d)|immortalis|xclipse/i
const INTEGRATED_GPU = /intel(?!.*\barc\b)|radeon( \(tm\))? graphics|vega \d/i
const IOS_GPU = /^apple gpu$/i

function readGpu(): string {
  try {
    const canvas = document.createElement('canvas')
    const gl = canvas.getContext('webgl')
    if (!gl) return 'none'
    const info = gl.getExtension('WEBGL_debug_renderer_info')
    const renderer = String(gl.getParameter(info ? info.UNMASKED_RENDERER_WEBGL : gl.RENDERER))
    gl.getExtension('WEBGL_lose_context')?.loseContext()
    return renderer
  } catch {
    return ''
  }
}

function readSignals(lite: boolean): DeviceSignals {
  const nav = navigator as Navigator & { deviceMemory?: number }
  return { cores: nav.hardwareConcurrency || 4, memory: nav.deviceMemory, gpu: readGpu(), lite }
}

export function pickQualityTier({ cores, memory, gpu, lite }: DeviceSignals): QualityTierName {
  const weak = gpu === 'none' || WEAK_GPU.test(gpu)
  const strong = STRONG_GPU.test(gpu)
  const lowMemory = memory !== undefined && memory <= 4
  if (lite) {
    if (weak) return 'minimum'
    if (strong) return 'medium'
    if (IOS_GPU.test(gpu)) return 'low'
    if ((memory !== undefined && memory <= 3) || cores <= 4) return 'minimum'
    return cores >= 8 && !lowMemory ? 'medium' : 'low'
  }
  if (weak) return 'medium'
  if (INTEGRATED_GPU.test(gpu) || cores <= 4 || lowMemory) return 'high'
  return 'ultra'
}

let estimated: QualityTierName | null = null

export function estimateQualityTier(lite: boolean): QualityTierName {
  estimated ??= pickQualityTier(readSignals(lite))
  return estimated
}
