import { useEffect, useMemo } from 'react'
import { Color, ShaderMaterial } from 'three'
import { sceneConfig } from '../config/sceneConfig.ts'
import type { HazeConfig } from '../types/index.ts'
import { useViewCover } from '../hooks/useViewCover.ts'
import { depthScale } from '../utils/projection.ts'
import { sceneTime } from '../utils/sceneTime.ts'
import { planeVertexShader } from '../utils/shaders.ts'

const { haze, camera } = sceneConfig

// Soft horizontal band of drifting value-noise mist. Coordinates are remapped from the
// oversized plane back to the reference image, so bandCenter matches the art.
const fragmentShader = /* glsl */ `
  uniform vec3 uColor;
  uniform float uOpacity;
  uniform float uTime;
  uniform float uSpeed;
  uniform float uCenter;
  uniform float uWidth;
  uniform float uOverscan;
  varying vec2 vUv;

  float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x),
               mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
  }
  float fbm(vec2 p) {
    float value = 0.0;
    float amplitude = 0.5;
    for (int i = 0; i < 4; i++) {
      value += amplitude * noise(p);
      p *= 2.03;
      amplitude *= 0.5;
    }
    return value;
  }

  void main() {
    vec2 image = (vUv - 0.5) * uOverscan + 0.5;
    float band = exp(-pow((image.y - uCenter) / uWidth, 2.0));
    float drift = uTime * uSpeed;
    float mist = fbm(vec2(image.x * 3.0 + drift, image.y * 7.0 - drift * 0.4));
    float edges = smoothstep(0.0, 0.1, vUv.x) * (1.0 - smoothstep(0.9, 1.0, vUv.x));
    gl_FragColor = vec4(uColor, uOpacity * band * mix(0.45, 1.0, mist) * edges);
    #include <colorspace_fragment>
  }
`

function createHazeMaterial(config: HazeConfig): ShaderMaterial {
  return new ShaderMaterial({
    vertexShader: planeVertexShader,
    fragmentShader,
    transparent: true,
    depthWrite: false,
    toneMapped: false,
    uniforms: {
      uColor: { value: new Color(config.color) },
      uOpacity: { value: config.opacity },
      uTime: sceneTime,
      uSpeed: { value: config.speed },
      uCenter: { value: config.bandCenter },
      uWidth: { value: config.bandWidth },
      uOverscan: { value: config.overscan },
    },
  })
}

/** Light procedural mist between the painted layers (adds depth separation). */
export function AtmosphericHaze() {
  const { cover } = useViewCover()
  const materials = useMemo(() => haze.map(createHazeMaterial), [])

  useEffect(() => () => materials.forEach((material) => material.dispose()), [materials])

  return (
    <group name="atmospheric-haze">
      {haze.map((config, index) => {
        const scale = depthScale(config.depth, camera.eyeDistance) * config.overscan
        return (
          <mesh
            key={config.id}
            name={`haze-${config.id}`}
            position={[0, 0, -config.depth]}
            scale={[cover.width * scale, cover.height * scale, 1]}
            renderOrder={config.renderOrder}
            material={materials[index]}
          >
            <planeGeometry />
          </mesh>
        )
      })}
    </group>
  )
}
