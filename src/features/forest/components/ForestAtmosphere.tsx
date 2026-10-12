import { useEffect, useMemo } from 'react'
import { CanvasTexture, SRGBColorSpace } from 'three'
import { forestConfig } from '../config/forestConfig.ts'
import type { AtmosphereConfig } from '../types/index.ts'

const { fog, sky, hemisphere } = forestConfig.atmosphere

/** Vertical gradient behind everything: brighter light above the canopy, mist at eye level. */
function createSkyTexture({ top, horizon, bottom }: AtmosphereConfig['sky']) {
  const canvas = document.createElement('canvas')
  canvas.width = 2
  canvas.height = 256
  const context = canvas.getContext('2d')
  if (context) {
    const gradient = context.createLinearGradient(0, 0, 0, canvas.height)
    gradient.addColorStop(0, top)
    gradient.addColorStop(0.55, horizon)
    gradient.addColorStop(1, bottom)
    context.fillStyle = gradient
    context.fillRect(0, 0, canvas.width, canvas.height)
  }
  const texture = new CanvasTexture(canvas)
  texture.colorSpace = SRGBColorSpace
  return texture
}

/**
 * Air of the forest: hazy background, exponential fog (gradual, never a wall) and a faint
 * sky/ground fill. The image-based light and the sun (SunLight) do the rest.
 */
export function ForestAtmosphere() {
  const background = useMemo(() => createSkyTexture(sky), [])
  useEffect(() => () => background.dispose(), [background])

  return (
    <>
      <primitive attach="background" object={background} />
      <fogExp2 attach="fog" args={[fog.color, fog.density]} />
      <hemisphereLight args={[hemisphere.sky, hemisphere.ground, hemisphere.intensity]} />
    </>
  )
}
