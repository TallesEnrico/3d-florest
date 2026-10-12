import { PerformanceMonitor } from '@react-three/drei'
import { Canvas } from '@react-three/fiber'
import { Suspense, useEffect, useState } from 'react'
import { sceneConfig } from '../config/sceneConfig.ts'
import type { ScrollProgressReader, ViewInput, ViewInputReader } from '../types/index.ts'
import { AtmosphericHaze } from './AtmosphericHaze.tsx'
import { FloatingMotes } from './FloatingMotes.tsx'
import { LayeredEnvironment } from './LayeredEnvironment.tsx'
import { SceneClock } from './SceneClock.tsx'
import { SunGlow } from './SunGlow.tsx'
import { WindowCamera } from './WindowCamera.tsx'

const NO_INPUT: ViewInput = { x: 0, y: 0, active: false }
const readNoInput: ViewInputReader = () => NO_INPUT
// Retina screens: 1.75 is visually indistinguishable from 2 here and ~25 % cheaper.
// The painted layers are 1672 px wide: on a laptop screen that is ~1.1 art pixels per CSS
// pixel, so rendering above 1.25× only upscales the same image at up to twice the pixel cost.
const MAX_DPR = 1.25

interface SceneCanvasProps {
  /** Called every frame; head tracking or mouse plug in here. Defaults to no input. */
  getViewInput?: ViewInputReader
  /** Stops rendering entirely (e.g. scrolled out of view): no GPU work while hidden. */
  paused?: boolean
  /** How far the scene has scrolled (drives the scroll parallax). No parallax when omitted. */
  getScrollProgress?: ScrollProgressReader
}

/** Signals that every texture behind the Suspense boundary has loaded. */
function ReadySignal({ onReady }: { onReady: () => void }) {
  useEffect(onReady, [onReady])
  return null
}

export function SceneCanvas({
  getViewInput = readNoInput,
  paused = false,
  getScrollProgress,
}: SceneCanvasProps) {
  const { camera } = sceneConfig
  const [ready, setReady] = useState(false)
  const [dpr, setDpr] = useState(() => Math.min(window.devicePixelRatio, MAX_DPR))

  return (
    <div className={ready ? 'scene scene--ready' : 'scene'}>
      <Canvas
        // No tone mapping: keep the approved palette (docs/art).
        flat
        frameloop={paused ? 'never' : 'always'}
        onCreated={({ gl }) => {
          // Dev only: lets tools/perf measure the hero's GPU cost.
          if (import.meta.env.DEV) (window as { __heroRenderer?: unknown }).__heroRenderer = gl
        }}
        dpr={dpr}
        // Layers are textures and plane edges sit off-screen, so MSAA buys nothing.
        gl={{ antialias: false, powerPreference: 'high-performance' }}
        // `manual`: WindowCamera owns the projection; R3F must not reset it on resize.
        camera={{
          manual: true,
          near: camera.near,
          far: camera.far,
          position: [0, 0, camera.eyeDistance],
          rotation: [0, 0, 0],
        }}
        role="img"
        aria-label="Vale de floresta tropical com cachoeiras, um rio e montanhas na névoa, visto através de uma moldura de selva, ao pôr do sol"
        fallback={
          <p className="scene__message">
            Seu navegador não conseguiu iniciar o WebGL, necessário para exibir a cena 3D.
          </p>
        }
      >
        {/* Drop to 1× pixel ratio if the device can't hold the frame rate; recover when it can.
            After 3 flip-flops it settles at 1× instead of oscillating (each switch reallocates).
            Mounted only while rendering: it times the gaps between frames, so the pause while
            the hero is scrolled away would otherwise read as a slow device. */}
        {!paused && (
          <PerformanceMonitor
            flipflops={3}
            onDecline={() => setDpr(1)}
            onIncline={() => setDpr(Math.min(window.devicePixelRatio, MAX_DPR))}
            onFallback={() => setDpr(1)}
          />
        )}
        <SceneClock />
        <WindowCamera getViewInput={getViewInput} getScrollProgress={getScrollProgress} />
        <Suspense fallback={null}>
          <LayeredEnvironment />
          <SunGlow />
          <AtmosphericHaze />
          <FloatingMotes />
          <ReadySignal onReady={() => setReady(true)} />
        </Suspense>
      </Canvas>
      <div className="scene__vignette" aria-hidden="true" />
      {!ready && (
        <p className="scene__message" role="status">
          Carregando a cena…
        </p>
      )}
    </div>
  )
}
