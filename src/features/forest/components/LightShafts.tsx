import { useEffect, useMemo } from 'react'
import { AdditiveBlending, CanvasTexture, DoubleSide } from 'three'
import { forestConfig } from '../config/forestConfig.ts'

const { shafts, glow } = forestConfig.atmosphere

/** Soft beam: bright core fading to the sides, fading in below the canopy and out near the ground. */
function createShaftTexture() {
  const width = 64
  const height = 256
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const context = canvas.getContext('2d')
  if (context) {
    const image = context.createImageData(width, height)
    for (let y = 0; y < height; y++) {
      const v = y / (height - 1)
      const along = Math.min(1, v / 0.18) * Math.pow(1 - v, 1.6)
      for (let x = 0; x < width; x++) {
        const u = (x / (width - 1) - 0.5) / 0.5
        const across = Math.exp(-u * u * 3.2) * (1 - u * u)
        const value = Math.round(255 * Math.max(0, along * across))
        const i = (y * width + x) * 4
        image.data[i] = image.data[i + 1] = image.data[i + 2] = image.data[i + 3] = value
      }
    }
    context.putImageData(image, 0, 0)
  }
  return new CanvasTexture(canvas)
}

/** Round, very soft falloff for the glow at the end of the trail. */
function createGlowTexture() {
  const size = 128
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const context = canvas.getContext('2d')
  if (context) {
    const gradient = context.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2)
    gradient.addColorStop(0, 'rgb(255 255 255 / 1)')
    gradient.addColorStop(0.35, 'rgb(255 255 255 / 0.45)')
    gradient.addColorStop(1, 'rgb(255 255 255 / 0)')
    context.fillStyle = gradient
    context.fillRect(0, 0, size, size)
  }
  return new CanvasTexture(canvas)
}

/**
 * Sunbeams through gaps in the canopy and the glow at the end of the trail: additive gradient
 * cards (no custom shader). They skip the fog on purpose (light scattered in the mist).
 */
export function LightShafts() {
  const texture = useMemo(() => createShaftTexture(), [])
  const glowTexture = useMemo(() => createGlowTexture(), [])
  useEffect(
    () => () => {
      texture.dispose()
      glowTexture.dispose()
    },
    [texture, glowTexture],
  )

  return (
    <group name="light-shafts">
      <mesh position={glow.position} renderOrder={1}>
        <planeGeometry args={glow.size} />
        <meshBasicMaterial
          map={glowTexture}
          color={glow.color}
          opacity={glow.opacity}
          transparent
          blending={AdditiveBlending}
          depthWrite={false}
          fog={false}
          toneMapped={false}
        />
      </mesh>
      {shafts.items.map((shaft, index) => (
        <mesh key={index} position={shaft.position} rotation={[0, 0, shaft.tilt]} renderOrder={1}>
          <planeGeometry args={shaft.size} />
          <meshBasicMaterial
            map={texture}
            color={shafts.color}
            opacity={shaft.opacity}
            transparent
            blending={AdditiveBlending}
            depthWrite={false}
            fog={false}
            toneMapped={false}
            side={DoubleSide}
          />
        </mesh>
      ))}
    </group>
  )
}
