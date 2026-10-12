import { PerformanceMonitor } from '@react-three/drei'
import { Canvas } from '@react-three/fiber'
import { lazy, Suspense, useEffect, useState } from 'react'
import { NeutralToneMapping } from 'three'
import type { ViewInput, ViewInputReader } from '../../scene/types/index.ts'
import { forestConfig } from '../config/forestConfig.ts'
import { useIdleReady } from '../hooks/useIdleReady.ts'
import { ForestAtmosphere } from './ForestAtmosphere.tsx'
import { LightShafts } from './LightShafts.tsx'
import { SceneController } from './SceneController.tsx'
import { SunLight } from './SunLight.tsx'

// Loaders, decoders and the forest builder live in their own chunk, fetched once the page is idle.
const RealisticForest = lazy(() => import('./RealisticForest.tsx'))

const NO_INPUT: ViewInput = { x: 0, y: 0, active: false }
const readNoInput: ViewInputReader = () => NO_INPUT
// 1.25× on Retina keeps the scene crisp (the textures are 1k, the needles alpha-tested with
// 4× MSAA) at 30% fewer pixels than 1.5×; 1× when the device struggles.
const MAX_DPR = 1.25
const LOW_DPR = 1
const SMALL_SCREEN = '(max-width: 767px)'

/** Steps down below 52 fps on 60 Hz screens (below 90 on 120 Hz), back up near the full rate. */
const MONITOR_BOUNDS = (refreshRate: number): [number, number] => (refreshRate > 90 ? [90, 112] : [52, 59])

/** Adaptive quality: 'low' = 1× pixel ratio, smaller shadow map, near detail switches 40% closer. */
type Quality = 'high' | 'low'
const QUALITY = {
  high: { detail: 1, shadowMap: forestConfig.atmosphere.sun.shadow.mapSize },
  low: { detail: 0.6, shadowMap: 1024 },
} as const

interface ForestSceneProps {
  /** Stops rendering entirely while the journey is off screen. */
  paused: boolean
  /** Same contract as the hero: head tracking or mouse. Used for lateral perspective. */
  getViewInput?: ViewInputReader
}

/**
 * The single shared scene behind every chapter of the journey: photoreal forest, atmosphere
 * and light. SceneController moves the camera with the scroll. Tone mapped (Neutral: keeps the
 * sunny colors saturated, closer to the painted hero than ACES), unlike the
 * hero's painted layers, because this scene is lit. The heavy assets start loading once the
 * page is idle; until they arrive the stage shows only the misty atmosphere.
 */
export function ForestScene({ paused, getViewInput = readNoInput }: ForestSceneProps) {
  const { camera, atmosphere } = forestConfig
  const loadAssets = useIdleReady()
  // Small screens start light; elsewhere PerformanceMonitor steps down if frames drop.
  const [quality, setQuality] = useState<Quality>(() => (window.matchMedia(SMALL_SCREEN).matches ? 'low' : 'high'))
  const [warm, setWarm] = useState(false)
  const dpr = Math.min(window.devicePixelRatio, quality === 'high' ? MAX_DPR : LOW_DPR)
  useEffect(() => {
    if (import.meta.env.DEV) window.__forestQuality = quality
  }, [quality])

  return (
    <Canvas
      className="forest-scene__canvas"
      frameloop={paused ? 'never' : 'always'}
      shadows="percentage"
      dpr={dpr}
      gl={{ antialias: true, powerPreference: 'high-performance', toneMapping: NeutralToneMapping, toneMappingExposure: atmosphere.exposure }}
      camera={{ fov: camera.fov, near: camera.near, far: camera.far, position: [0, 1.6, 6] }}
      aria-hidden="true"
    >
      <ForestAtmosphere />
      <SunLight mapSize={QUALITY[quality].shadowMap} />
      <SceneController getViewInput={getViewInput} />
      {loadAssets && (
        <Suspense fallback={null}>
          <RealisticForest detail={QUALITY[quality].detail} onReady={() => setWarm(true)} />
          {/* Measures only while the forest is built, warmed up and on screen, and starts afresh
              each time it comes back into view: it times the gaps between frames, so a paused
              canvas or the one-time build would otherwise read as a slow device. After 3 changes
              (inclines count too) it stops and the last quality stays. */}
          {warm && !paused && (
            <PerformanceMonitor
              flipflops={3}
              bounds={MONITOR_BOUNDS}
              onDecline={() => setQuality('low')}
              onIncline={() => setQuality('high')}
            />
          )}
        </Suspense>
      )}
      <LightShafts />
    </Canvas>
  )
}
