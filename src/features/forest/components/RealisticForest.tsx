import { Environment } from '@react-three/drei'
import { useFrame, useLoader, useThree } from '@react-three/fiber'
import { useEffect, useRef } from 'react'
import type { Group } from 'three'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js'
import { forestConfig } from '../config/forestConfig.ts'
import { useImageTextures } from '../../scene/hooks/useImageTextures.ts'
import { usePrefersReducedMotion } from '../../scene/hooks/usePrefersReducedMotion.ts'
import { buildRealisticForest, type RealisticForest as RealisticForestModel } from '../models/buildRealisticForest.ts'
import { invalidateSunShadow, sunShadow } from './sunShadow.ts'
import { warmUpForest } from './warmUpForest.ts'

declare global {
  interface Window {
    /** Dev only: per-batch instance/triangle counts, for performance checks. */
    __forestStats?: () => unknown
    /** Dev only: current adaptive quality of the forest scene. */
    __forestQuality?: string
    /** Dev only: the forest's renderer (draw calls, triangles, programs) for performance checks. */
    __forestRenderer?: unknown
  }
}

const { assets, atmosphere } = forestConfig
const { litter, trail } = assets.ground
const { logs, ends, planks, roof, gables } = assets.cabin
const textureSet = (set: { color: string; normal: string; arm: string }) => [set.color, set.normal, set.arm]
const TEXTURES = [litter, trail, logs, ends, planks, roof, gables].flatMap(textureSet)
const SMALL_SCREEN = '(max-width: 767px)'

// Geometry decompression in two workers instead of the main thread.
;(MeshoptDecoder as { useWorkers?: (count: number) => void }).useWorkers?.(2)
const withMeshopt = (loader: GLTFLoader) => {
  loader.setMeshoptDecoder(MeshoptDecoder)
}


interface RealisticForestProps {
  /** 1 = full detail; lower values shorten the distances at which detail drops (slow devices). */
  detail: number
  reach: number
  /** Called once the forest is built and the GPU warmed up (its first frames already drawn). */
  onReady?: () => void
}

/**
 * The forest itself: scanned trees, ground cover and textured ground (public/assets/forest),
 * placed by the seeded layout and drawn in batches whose detail follows the camera, plus the
 * image-based light (HDR). Suspends while the assets load (the scene shows only the misty
 * atmosphere meanwhile). Loaded as its own chunk (lazy), so the page's first load stays light.
 */
export function RealisticForest({ detail, reach, onReady }: RealisticForestProps) {
  const [trees, props, cabinProps, cabinInterior] = useLoader(
    GLTFLoader,
    [assets.trees, assets.props, assets.cabin.props, assets.cabin.interior],
    withMeshopt,
  )
  // Decoded off the main thread where supported.
  const textures = useImageTextures(TEXTURES)
  const holder = useRef<Group>(null)
  const gl = useThree((state) => state.gl)
  const scene = useThree((state) => state.scene)
  const camera = useThree((state) => state.camera)
  const advance = useThree((state) => state.advance)
  const ready = useRef(onReady)
  useEffect(() => {
    ready.current = onReady
  }, [onReady])
  const forest = useRef<RealisticForestModel | null>(null)

  // Built and disposed in the same effect: batched meshes can't be reused after dispose(), so a
  // remount (StrictMode in dev, or the journey coming back into range) always builds a fresh one.
  useEffect(() => {
    let cancelled = false
    let model: RealisticForestModel | null = null
    const parent = holder.current
    // Texture sets in TEXTURES order: [color, normal, arm] × litter, trail, logs, ends, planks, roof, gables.
    const set = (i: number) => ({ color: textures[i * 3], normal: textures[i * 3 + 1], arm: textures[i * 3 + 2] })
    // Built in steps (the page keeps scrolling meanwhile), then the GPU is warmed up while the
    // forest is still out of sight.
    buildRealisticForest({
      config: forestConfig,
      trees: trees.scene,
      props: props.scene,
      ground: { litter: set(0), trail: set(1) },
      cabinProps: cabinProps.scene,
      cabinInterior: cabinInterior.scene,
      cabin: { logs: set(2), ends: set(3), planks: set(4), roof: set(5), gables: set(6) },
      density: window.matchMedia(SMALL_SCREEN).matches ? 0.6 : 1,
    })
      .then((built) => {
        if (cancelled) {
          built.dispose()
          return
        }
        model = built
        parent?.add(built.group)
        forest.current = built
        sunShadow.prepare = () => built.shadowPass(true)
        sunShadow.restore = () => built.shadowPass(false)
        invalidateSunShadow()
        if (import.meta.env.DEV) {
          window.__forestStats = built.stats
          window.__forestRenderer = gl
        }
        return warmUpForest(gl, scene, camera, built.group, advance, () => cancelled).then(() => {
          if (!cancelled) ready.current?.()
        })
      })
      .catch((error: unknown) => console.error('Forest build failed', error))
    return () => {
      cancelled = true
      sunShadow.prepare = null
      sunShadow.restore = null
      if (!model) return
      parent?.remove(model.group)
      forest.current = null
      model.dispose()
    }
  }, [trees, props, cabinProps, cabinInterior, textures, gl, scene, camera, advance])

  // The river flows unless the visitor prefers reduced motion (then it holds still).
  const reducedMotion = usePrefersReducedMotion()
  useFrame(({ camera, clock }, delta) => {
    forest.current?.update(camera.position, detail, Math.min(delta, 0.1), reducedMotion ? 0 : clock.elapsedTime, reach)
  })

  return (
    <>
      <Environment files={assets.environment} environmentIntensity={atmosphere.environment.intensity} />
      <group ref={holder} />
    </>
  )
}

export default RealisticForest
