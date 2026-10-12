import { useThree } from '@react-three/fiber'
import { useCallback } from 'react'
import { SRGBColorSpace, type Texture } from 'three'
import { useImageTextures } from './useImageTextures.ts'

const MAX_ANISOTROPY = 8

/** Loads painted layers as sRGB color textures with mipmaps and moderate anisotropy. */
export function useLayerTextures(urls: string[]): Texture[] {
  const gl = useThree((state) => state.gl)

  const configure = useCallback(
    (texture: Texture) => {
      texture.colorSpace = SRGBColorSpace
      texture.anisotropy = Math.min(MAX_ANISOTROPY, gl.capabilities.getMaxAnisotropy())
    },
    [gl],
  )

  return useImageTextures(urls, configure)
}
