import { useFrame, useThree } from '@react-three/fiber'
import { useEffect, useMemo, useRef } from 'react'
import { type DirectionalLight, Scene, Vector3 } from 'three'
import { forestConfig } from '../config/forestConfig.ts'
import { sunShadow } from './sunShadow.ts'

const { sun } = forestConfig.atmosphere
const { bounds } = forestConfig.layout
const TOWARD_SUN = new Vector3(...sun.direction).normalize()
/** How far the light sits from the middle of the shadowed area. */
const DISTANCE = 150
/**
 * What the shadow map covers: everywhere the camera can see shadows on (the walk and its sides,
 * up to the treetops). Farther ground is deep in the haze.
 */
const AREA = { x: [-42, 42], y: [-2, 46], z: [bounds.zNear, -112] } as const
/**
 * An empty scene, rendered only to draw the shadow map from its onAfterRender hook: three draws
 * shadow maps only inside a render (outside one it has no lights state and throws).
 */
const shadowPass = new Scene()

interface SunLightProps {
  /** Shadow map resolution (texels per side); lowered on slow devices. */
  mapSize: number
}

/** Fits the light's orthographic shadow camera around AREA (corners projected on its axes). */
function shadowFrame() {
  const center = new Vector3((AREA.x[0] + AREA.x[1]) / 2, 0, (AREA.z[0] + AREA.z[1]) / 2)
  const position = center.clone().addScaledVector(TOWARD_SUN, DISTANCE)
  // Same basis as Matrix4.lookAt(position, center, up): z toward the light, x right, y up.
  const z = TOWARD_SUN.clone()
  const x = new Vector3(0, 1, 0).cross(z).normalize()
  const y = z.clone().cross(x)
  const box = { left: Infinity, right: -Infinity, bottom: Infinity, top: -Infinity, near: Infinity, far: -Infinity }
  for (const cx of AREA.x)
    for (const cy of AREA.y)
      for (const cz of AREA.z) {
        const v = new Vector3(cx, cy, cz).sub(position)
        box.left = Math.min(box.left, v.dot(x))
        box.right = Math.max(box.right, v.dot(x))
        box.bottom = Math.min(box.bottom, v.dot(y))
        box.top = Math.max(box.top, v.dot(y))
        box.near = Math.min(box.near, -v.dot(z))
        box.far = Math.max(box.far, -v.dot(z))
      }
  return { center, position, box: { ...box, near: Math.max(0.5, box.near - 2), far: box.far + 2 } }
}

/**
 * The sun: a warm directional light with one static shadow map covering the whole walk. Drawn
 * once (in the hidden warm-up, before the forest is seen) and again only if invalidated; the
 * canopy's dappled shadows cost nothing while scrolling.
 */
export function SunLight({ mapSize }: SunLightProps) {
  const light = useRef<DirectionalLight>(null)
  const scene = useThree((state) => state.scene)
  const frame = useMemo(() => shadowFrame(), [])

  // The light aims at its target object, which must be in the scene to follow it.
  useEffect(() => {
    const current = light.current
    if (!current) return
    current.position.copy(frame.position)
    current.target.position.copy(frame.center)
    scene.add(current.target)
    return () => {
      scene.remove(current.target)
    }
  }, [scene, frame])

  useFrame(({ gl, camera, scene: root }) => {
    const current = light.current
    if (!current || !current.castShadow) return
    gl.shadowMap.autoUpdate = false
    // A new resolution needs a new shadow map (three recreates it on the next draw).
    if (current.shadow.map && current.shadow.map.width !== mapSize) {
      current.shadow.map.dispose()
      current.shadow.map = null
      sunShadow.dirty = true
    }
    if (!sunShadow.dirty) return
    sunShadow.dirty = false
    // Draw it now, before this frame's render, between the forest's prepare/restore (fixed
    // level of detail), so the regular render still uses the normal levels.
    shadowPass.onAfterRender = (renderer) => {
      sunShadow.prepare?.()
      root.updateMatrixWorld()
      current.target.updateMatrixWorld()
      renderer.shadowMap.needsUpdate = true
      renderer.shadowMap.render([current], root, camera)
      sunShadow.restore?.()
    }
    gl.render(shadowPass, camera)
  })

  const { box } = frame
  return (
    <directionalLight
      ref={light}
      color={sun.color}
      intensity={sun.intensity}
      castShadow
      shadow-intensity={sun.shadow.intensity}
      shadow-mapSize={[mapSize, mapSize]}
      shadow-camera-left={box.left}
      shadow-camera-right={box.right}
      shadow-camera-top={box.top}
      shadow-camera-bottom={box.bottom}
      shadow-camera-near={box.near}
      shadow-camera-far={box.far}
      shadow-bias={-0.0005}
      shadow-normalBias={0.05}
    />
  )
}
