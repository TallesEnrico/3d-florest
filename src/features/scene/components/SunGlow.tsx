import { useEffect, useMemo } from 'react'
import { AdditiveBlending, Color, ShaderMaterial } from 'three'
import { sceneConfig } from '../config/sceneConfig.ts'
import { useViewCover } from '../hooks/useViewCover.ts'
import { depthScale } from '../utils/projection.ts'
import { sceneTime } from '../utils/sceneTime.ts'
import { planeVertexShader } from '../utils/shaders.ts'

const { sunGlow, imageSize, imageAspect, camera, layers } = sceneConfig
const background = layers.find((layer) => layer.id === 'background')!
// Just in front of the background, sharing its transform so the glow stays on the painted sun.
const DEPTH = background.depth - 0.5

const fragmentShader = /* glsl */ `
  uniform vec3 uColor;
  uniform vec2 uCenter;
  uniform float uRadius;
  uniform float uAspect;
  uniform float uOpacity;
  uniform float uTime;
  uniform float uPeriod;
  varying vec2 vUv;

  void main() {
    vec2 delta = (vUv - uCenter) * vec2(uAspect, 1.0);
    float falloff = exp(-dot(delta, delta) / (uRadius * uRadius));
    float breathing = 0.85 + 0.15 * sin(6.2831853 * uTime / uPeriod);
    gl_FragColor = vec4(uColor * falloff * breathing * uOpacity, 1.0);
    #include <colorspace_fragment>
  }
`

/** Soft warm bloom around the painted sun; breathes slowly. Additive, so it only adds light. */
export function SunGlow() {
  const { cover } = useViewCover()
  const scale = depthScale(DEPTH, camera.eyeDistance) * background.overscan

  const material = useMemo(
    () =>
      new ShaderMaterial({
        vertexShader: planeVertexShader,
        fragmentShader,
        transparent: true,
        depthWrite: false,
        toneMapped: false,
        blending: AdditiveBlending,
        uniforms: {
          uColor: { value: new Color(sunGlow.color) },
          uCenter: {
            value: [sunGlow.centerPx.x / imageSize.width, 1 - sunGlow.centerPx.y / imageSize.height],
          },
          uRadius: { value: sunGlow.radius },
          uAspect: { value: imageAspect },
          uOpacity: { value: sunGlow.opacity },
          uTime: sceneTime,
          uPeriod: { value: sunGlow.period },
        },
      }),
    [],
  )
  useEffect(() => () => material.dispose(), [material])

  return (
    <mesh
      name="sun-glow"
      position={[0, 0, -DEPTH]}
      scale={[cover.width * scale, cover.height * scale, 1]}
      renderOrder={background.renderOrder + 0.5}
      material={material}
    >
      <planeGeometry />
    </mesh>
  )
}
