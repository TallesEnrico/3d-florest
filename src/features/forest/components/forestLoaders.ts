import { useLoader, useThree } from '@react-three/fiber'
import { useEffect } from 'react'
import type { Texture, WebGLRenderer } from 'three'
import type { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import { KTX2Loader } from 'three/addons/loaders/KTX2Loader.js'
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js'

;(MeshoptDecoder as { useWorkers?: (count: number) => void }).useWorkers?.(2)

let ktx2: KTX2Loader | null = null

/**
 * One KTX2 loader (and one pool of transcoding workers) for every forest model and texture. The
 * Basis transcoder ships with three and is bundled by Vite (same origin, hashed).
 */
function ktx2Loader(gl: WebGLRenderer): KTX2Loader {
  ktx2 ??= new KTX2Loader().setWorkerLimit(2).detectSupport(gl)
  return ktx2
}

/**
 * GLTFLoader extensions for the forest's GLBs: geometry decompressed (meshopt) and textures
 * transcoded (KTX2 / Basis) in workers, off the main thread.
 */
export function useGltfExtensions(): (loader: GLTFLoader) => void {
  const gl = useThree((state) => state.gl)
  return (loader) => {
    loader.setMeshoptDecoder(MeshoptDecoder)
    loader.setKTX2Loader(ktx2Loader(gl))
  }
}

/**
 * Starts downloading KTX2 textures without suspending, so they load alongside the models
 * instead of after them (each suspending hook would otherwise wait for the previous one).
 */
export function usePreloadKtx2Textures(urls: string[]) {
  const gl = useThree((state) => state.gl)
  useLoader.preload(ktx2Loader(gl), urls)
}

/**
 * Loads KTX2 textures (suspends while loading), already compressed for the GPU with their
 * mipmaps. Disposed on unmount.
 */
export function useKtx2Textures(urls: string[]): Texture[] {
  const gl = useThree((state) => state.gl)
  const textures = useLoader(ktx2Loader(gl), urls) as Texture[]
  useEffect(() => () => textures.forEach((texture) => texture.dispose()), [textures])
  return textures
}
