import { useThree } from '@react-three/fiber'
import { useEffect, useMemo } from 'react'
import { AdditiveBlending, BufferAttribute, BufferGeometry, Color, ShaderMaterial } from 'three'
import { sceneConfig } from '../config/sceneConfig.ts'
import { depthScale } from '../utils/projection.ts'
import { sceneTime } from '../utils/sceneTime.ts'

const { motes, camera } = sceneConfig
// Spread wide enough for 21:9 so motes never run out at the sides; off-screen ones are clipped.
const MAX_ASPECT = 2.4
// Drawing-buffer pixels per screen height; updated on resize (one scene at a time).
const pixelsPerUnit = { value: 1 }

const vertexShader = /* glsl */ `
  uniform float uTime;
  uniform float uSize;
  uniform float uPixelsPerUnit;
  uniform float uEyeDistance;
  uniform float uRise;
  uniform float uSway;
  attribute float aSeed;
  attribute float aHalfHeight;
  varying float vFade;

  void main() {
    vec3 p = position;
    float t = uTime + aSeed * 37.0;
    // Rise and wrap inside this mote's vertical band; sway sideways.
    float span = 2.0 * aHalfHeight;
    float y = mod(p.y + aHalfHeight + t * uRise * aHalfHeight * 2.0, span);
    p.y = y - aHalfHeight;
    p.x += sin(t * 0.37 + aSeed * 6.2831853) * uSway * aHalfHeight * 2.0;
    // Fade near the wrap edges and twinkle softly.
    float edge = min(y, span - y) / span;
    vFade = smoothstep(0.0, 0.12, edge) * (0.55 + 0.45 * sin(t * 1.3 + aSeed * 11.0));

    vec4 viewPosition = modelViewMatrix * vec4(p, 1.0);
    gl_Position = projectionMatrix * viewPosition;
    // World size → pixels at this distance (screen height 1 maps to uPixelsPerUnit at the screen).
    gl_PointSize = uSize * uPixelsPerUnit * uEyeDistance / -viewPosition.z;
  }
`

const fragmentShader = /* glsl */ `
  uniform vec3 uColor;
  uniform float uOpacity;
  varying float vFade;

  void main() {
    float d = length(gl_PointCoord - 0.5);
    float disc = 1.0 - smoothstep(0.0, 0.5, d);
    gl_FragColor = vec4(uColor * disc * disc * vFade * uOpacity, 1.0);
    #include <colorspace_fragment>
  }
`

function createGeometry(): BufferGeometry {
  const positions = new Float32Array(motes.count * 3)
  const seeds = new Float32Array(motes.count)
  const halfHeights = new Float32Array(motes.count)
  for (let i = 0; i < motes.count; i++) {
    // Bias toward the near side so more motes read as "in front of the islands".
    const depth = motes.depthMin + (motes.depthMax - motes.depthMin) * Math.random() ** 1.6
    const spread = depthScale(depth, camera.eyeDistance)
    halfHeights[i] = 0.5 * spread
    positions[i * 3] = (Math.random() - 0.5) * MAX_ASPECT * spread
    positions[i * 3 + 1] = (Math.random() - 0.5) * spread
    positions[i * 3 + 2] = -depth
    seeds[i] = Math.random()
  }
  const geometry = new BufferGeometry()
  geometry.setAttribute('position', new BufferAttribute(positions, 3))
  geometry.setAttribute('aSeed', new BufferAttribute(seeds, 1))
  geometry.setAttribute('aHalfHeight', new BufferAttribute(halfHeights, 1))
  return geometry
}

/**
 * Warm pollen floating between the jungle frame and the islands. They live in 3D, so the
 * off-axis camera gives them true parallax. Animated entirely on the GPU.
 */
export function FloatingMotes() {
  const bufferHeight = useThree((state) => state.size.height * state.viewport.dpr)

  const geometry = useMemo(() => createGeometry(), [])
  const material = useMemo(
    () =>
      new ShaderMaterial({
        vertexShader,
        fragmentShader,
        transparent: true,
        depthWrite: false,
        toneMapped: false,
        blending: AdditiveBlending,
        uniforms: {
          uTime: sceneTime,
          uSize: { value: motes.size },
          uPixelsPerUnit: pixelsPerUnit,
          uEyeDistance: { value: camera.eyeDistance },
          uRise: { value: motes.riseSpeed },
          uSway: { value: motes.sway },
          uColor: { value: new Color(motes.color) },
          uOpacity: { value: motes.opacity },
        },
      }),
    [],
  )

  useEffect(() => {
    pixelsPerUnit.value = bufferHeight
  }, [bufferHeight])

  useEffect(
    () => () => {
      geometry.dispose()
      material.dispose()
    },
    [geometry, material],
  )

  return <points name="floating-motes" geometry={geometry} material={material} renderOrder={3.5} />
}
