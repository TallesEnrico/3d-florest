import { Environment, useEnvironment } from '@react-three/drei'
import { useFrame, useLoader, useThree } from '@react-three/fiber'
import { Suspense, useEffect, useRef, useState } from 'react'
import type { Group } from 'three'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import { forestConfig } from '../config/forestConfig.ts'
import { usePrefersReducedMotion } from '../../scene/hooks/usePrefersReducedMotion.ts'
import { buildRealisticForest, type RealisticForest as RealisticForestModel } from '../models/buildRealisticForest.ts'
import { ForestCabin } from './ForestCabin.tsx'
import { useGltfExtensions, useKtx2Textures, usePreloadKtx2Textures } from './forestLoaders.ts'
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
const TEXTURES = [litter, trail].flatMap((set) => [set.color, set.normal, set.arm])
const SMALL_SCREEN = '(max-width: 767px)'

interface RealisticForestProps {
  /** 1 = full detail; lower values shorten the distances at which detail drops (slow devices). */
  detail: number
  reach: number
  /** Most detailed tree model drawn (lighter foliage on slow devices). */
  foliage: number
  /** Called once the forest is built and the GPU warmed up (its first frames already drawn). */
  onReady?: () => void
}

/**
 * The forest itself: scanned trees, ground cover and textured ground (public/assets/forest),
 * placed by the seeded layout and drawn in batches whose detail follows the camera, plus the
 * image-based light (HDR). Suspends while the assets load (the scene shows only the misty
 * atmosphere meanwhile). Loaded as its own chunk (lazy), so the page's first load stays light.
 * The cabin follows in a second stage (`ForestCabin`), once the forest is ready.
 */
export function RealisticForest({ detail, reach, foliage, onReady }: RealisticForestProps) {
  usePreloadKtx2Textures(TEXTURES)
  useEnvironment.preload({ files: assets.environment })
  const [trees, props] = useLoader(GLTFLoader, [assets.trees, assets.props], useGltfExtensions())
  const textures = useKtx2Textures(TEXTURES)
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
  const [warmForest, setWarmForest] = useState<RealisticForestModel | null>(null)

  // Built and disposed in the same effect: batched meshes can't be reused after dispose(), so a
  // remount (StrictMode in dev, or the journey coming back into range) always builds a fresh one.
  useEffect(() => {
    let cancelled = false
    let model: RealisticForestModel | null = null
    const parent = holder.current
    // Texture sets in TEXTURES order: [color, normal, arm] × litter, trail.
    const set = (i: number) => ({ color: textures[i * 3], normal: textures[i * 3 + 1], arm: textures[i * 3 + 2] })
    // Built in steps (the page keeps scrolling meanwhile), then the GPU is warmed up while the
    // forest is still out of sight.
    buildRealisticForest({
      config: forestConfig,
      trees: trees.scene,
      props: props.scene,
      ground: { litter: set(0), trail: set(1) },
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
          if (cancelled) return
          ready.current?.()
          setWarmForest(built)
        })
      })
      .catch((error: unknown) => console.error('Forest build failed', error))
    return () => {
      cancelled = true
      setWarmForest(null)
      sunShadow.prepare = null
      sunShadow.restore = null
      if (!model) return
      parent?.remove(model.group)
      forest.current = null
      model.dispose()
    }
  }, [trees, props, textures, gl, scene, camera, advance])

  // The river flows unless the visitor prefers reduced motion (then it holds still).
  const reducedMotion = usePrefersReducedMotion()
  const flowTime = useRef(0)
  useFrame(({ camera }, delta) => {
    const step = Math.min(delta, 0.1)
    flowTime.current += step
    forest.current?.update(camera.position, detail, step, reducedMotion ? 0 : flowTime.current, reach, foliage)
  })
  useEffect(() => invalidateSunShadow(), [foliage])

  return (
    <>
      <Environment files={assets.environment} environmentIntensity={atmosphere.environment.intensity} />
      <group ref={holder} />
      {warmForest && (
        <Suspense fallback={null}>
          <ForestCabin forest={warmForest} />
        </Suspense>
      )}
    </>
  )
}

export default RealisticForest
