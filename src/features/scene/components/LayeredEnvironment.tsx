import type { Texture } from 'three'
import { sceneConfig } from '../config/sceneConfig.ts'
import { useLayerTextures } from '../hooks/useLayerTextures.ts'
import { useViewCover } from '../hooks/useViewCover.ts'
import type { LayerConfig, Size2 } from '../types/index.ts'
import { depthScale } from '../utils/projection.ts'
import { LayerGlowMaterial } from './LayerGlowMaterial.tsx'

const { layers, camera } = sceneConfig
const LAYER_URLS = layers.map((layer) => layer.url)

/**
 * The painted layers as planes behind the screen. Each plane is scaled by its depth so that,
 * from the neutral eye position, the stack composes like concept/scene-reference-01.png.
 */
export function LayeredEnvironment() {
  const textures = useLayerTextures(LAYER_URLS)
  const { cover } = useViewCover()

  return (
    <group name="layered-environment">
      {layers.map((layer, index) => (
        <LayerPlane key={layer.id} layer={layer} texture={textures[index]} cover={cover} />
      ))}
    </group>
  )
}

interface LayerPlaneProps {
  layer: LayerConfig
  texture: Texture
  cover: Size2
}

function LayerPlane({ layer, texture, cover }: LayerPlaneProps) {
  const scale = depthScale(layer.depth, camera.eyeDistance) * layer.overscan
  return (
    <mesh
      name={layer.id}
      position={[0, 0, -layer.depth]}
      scale={[cover.width * scale, cover.height * scale, 1]}
      renderOrder={layer.renderOrder}
    >
      <planeGeometry />
      {layer.glow ? (
        <LayerGlowMaterial map={texture} glow={layer.glow} />
      ) : (
        <meshBasicMaterial
          map={texture}
          transparent={layer.transparent}
          depthWrite={false}
          toneMapped={false}
        />
      )}
    </mesh>
  )
}
