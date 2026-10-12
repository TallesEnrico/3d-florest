import { useLoader } from '@react-three/fiber'
import { useEffect, useMemo } from 'react'
import { ImageBitmapLoader, Texture, TextureLoader } from 'three'

const agent = typeof navigator === 'undefined' ? '' : navigator.userAgent
const safari = /^((?!chrome|android).)*safari/i.test(agent) ? Number(agent.match(/version\/(\d+)/i)?.[1] ?? 0) : Infinity
const firefox = agent.includes('Firefox') ? Number(agent.match(/Firefox\/(\d+)/)?.[1] ?? 0) : Infinity
/**
 * Decode images off the main thread (createImageBitmap) where it is reliable — the same rule as
 * three's GLTFLoader (Safari 17+, Firefox 98+); elsewhere fall back to the image loader.
 * Decoding on the main thread at upload time was a ~160 ms freeze per large texture.
 */
const USE_BITMAPS = typeof createImageBitmap === 'function' && safari >= 17 && firefox >= 98
const Loader = (USE_BITMAPS ? ImageBitmapLoader : TextureLoader) as typeof ImageBitmapLoader
const configureLoader = (loader: ImageBitmapLoader) => {
  // Flip while decoding, like TextureLoader's textures are flipped at upload.
  if (loader instanceof ImageBitmapLoader) loader.setOptions({ imageOrientation: 'flipY', premultiplyAlpha: 'none' })
}

/**
 * Loads images as textures (suspends while loading). `configure` runs once per texture
 * (color space, wrapping, anisotropy…). Textures are disposed on unmount.
 */
export function useImageTextures(urls: string[], configure?: (texture: Texture) => void): Texture[] {
  const loaded = useLoader(Loader, urls, configureLoader) as unknown as (ImageBitmap | Texture)[]
  const textures = useMemo(
    () =>
      loaded.map((item) => {
        const texture = item instanceof Texture ? item : new Texture(item)
        if (!(item instanceof Texture)) texture.flipY = false // flipped while decoding
        configure?.(texture)
        texture.needsUpdate = true
        return texture
      }),
    // `configure` is a setup step for freshly loaded textures, not a dependency to react to.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [loaded],
  )
  useEffect(() => () => textures.forEach((texture) => texture.dispose()), [textures])
  return textures
}
