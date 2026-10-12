import { useTexture } from '@react-three/drei'
import { useEffect, useMemo } from 'react'
import { ShaderMaterial, type Texture } from 'three'
import type { LayerGlowConfig } from '../types/index.ts'
import { sceneTime } from '../utils/sceneTime.ts'
import { planeVertexShader } from '../utils/shaders.ts'

// Brightens the masked pixels in a slow wave that travels across the frame, so the ferns
// breathe out of unison. The mask is data (no color conversion); the map is sRGB.
const fragmentShader = /* glsl */ `
  uniform sampler2D uMap;
  uniform sampler2D uMask;
  uniform float uTime;
  uniform float uIntensity;
  uniform float uSpeed;
  varying vec2 vUv;

  void main() {
    vec4 color = texture2D(uMap, vUv);
    float mask = texture2D(uMask, vUv).r;
    float pulse = 0.5 + 0.5 * sin(uTime * uSpeed - (vUv.x * 7.0 + vUv.y * 4.0));
    color.rgb *= 1.0 + mask * uIntensity * pulse;
    gl_FragColor = color;
    #include <colorspace_fragment>
  }
`

interface LayerGlowMaterialProps {
  map: Texture
  glow: LayerGlowConfig
}

/** Drop-in material for a painted layer whose emissive mask should softly pulse. */
export function LayerGlowMaterial({ map, glow }: LayerGlowMaterialProps) {
  const mask = useTexture(glow.maskUrl)

  const material = useMemo(
    () =>
      new ShaderMaterial({
        vertexShader: planeVertexShader,
        fragmentShader,
        transparent: true,
        depthWrite: false,
        toneMapped: false,
        uniforms: {
          uMap: { value: map },
          uMask: { value: mask },
          uTime: sceneTime,
          uIntensity: { value: glow.intensity },
          uSpeed: { value: glow.speed },
        },
      }),
    [map, mask, glow],
  )
  useEffect(() => () => material.dispose(), [material])

  return <primitive object={material} attach="material" />
}
