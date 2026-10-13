import { PerformanceMonitor } from '@react-three/drei'
import { Canvas } from '@react-three/fiber'
import { lazy, Suspense, useEffect, useState } from 'react'
import { NeutralToneMapping } from 'three'
import { IdleFrames } from '../../scene/components/IdleFrames.tsx'
import { sceneConfig } from '../../scene/config/sceneConfig.ts'
import { useActivityLevel } from '../../scene/hooks/useActivityLevel.ts'
import type { ViewInput, ViewInputReader } from '../../scene/types/index.ts'
import { frameloopFor } from '../../scene/utils/activity.ts'
import { forestConfig, LITE_ASSETS } from '../config/forestConfig.ts'
import { useIdleReady } from '../hooks/useIdleReady.ts'
import { estimateQualityTier } from '../utils/deviceQuality.ts'
import { ForestAtmosphere } from './ForestAtmosphere.tsx'
import { LightShafts } from './LightShafts.tsx'
import { SceneController } from './SceneController.tsx'
import { SunLight } from './SunLight.tsx'

// Loaders, decoders and the forest builder live in their own chunk, fetched once the page is idle.
const RealisticForest = lazy(() => import('./RealisticForest.tsx'))

const NO_INPUT: ViewInput = { x: 0, y: 0, active: false }
const readNoInput: ViewInputReader = () => NO_INPUT

/** Steps down below 52 fps on 60 Hz screens (below 90 on 120 Hz), back up near the full rate. */
const MONITOR_BOUNDS = (refreshRate: number): [number, number] => (refreshRate > 90 ? [90, 112] : [52, 59])

const TIERS = forestConfig.quality
const LOWEST = TIERS.length - 1
const PINNED_TIER = TIERS.findIndex((tier) => tier.name === new URLSearchParams(window.location.search).get('quality'))
const initialTier = () =>
  PINNED_TIER >= 0 ? PINNED_TIER : Math.max(0, TIERS.findIndex((tier) => tier.name === estimateQualityTier(LITE_ASSETS)))

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
  const [tierIndex, setTierIndex] = useState(initialTier)
  const [warm, setWarm] = useState(false)
  const tier = TIERS[tierIndex]
  const dpr = Math.min(window.devicePixelRatio, tier.dpr)
  const activity = useActivityLevel()
  const fullRate = !paused && activity === 'active'
  useEffect(() => {
    if (import.meta.env.DEV) window.__forestQuality = tier.name
  }, [tier])

  return (
    <Canvas
      className="forest-scene__canvas"
      frameloop={frameloopFor(paused, activity)}
      shadows="percentage"
      dpr={dpr}
      gl={{ antialias: true, powerPreference: 'high-performance', toneMapping: NeutralToneMapping, toneMappingExposure: atmosphere.exposure }}
      camera={{ fov: camera.fov, near: camera.near, far: camera.far, position: [0, 1.6, 6] }}
      aria-hidden="true"
    >
      <ForestAtmosphere />
      <SunLight mapSize={tier.shadowMap} />
      <SceneController getViewInput={getViewInput} />
      {loadAssets && (
        <Suspense fallback={null}>
          <RealisticForest detail={tier.detail} reach={tier.reach} foliage={tier.foliage} onReady={() => setWarm(true)} />
          {/* Measures only while the forest is built, warmed up and on screen, and starts afresh
              each time it comes back into view: it times the gaps between frames, so a paused
              canvas or the one-time build would otherwise read as a slow device. */}
          {warm && fullRate && PINNED_TIER < 0 && (
            <PerformanceMonitor
              flipflops={TIERS.length + 1}
              bounds={MONITOR_BOUNDS}
              onDecline={() => setTierIndex((index) => Math.min(LOWEST, index + 1))}
              onIncline={() => setTierIndex((index) => Math.max(0, index - 1))}
            />
          )}
        </Suspense>
      )}
      <LightShafts />
      {!paused && activity === 'idle' && <IdleFrames fps={sceneConfig.activity.idleFps} />}
    </Canvas>
  )
}
