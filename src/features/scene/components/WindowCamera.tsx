import { useFrame, useThree } from '@react-three/fiber'
import { useMemo, useRef } from 'react'
import { MathUtils, type PerspectiveCamera } from 'three'
import { sceneConfig } from '../config/sceneConfig.ts'
import { usePrefersReducedMotion } from '../hooks/usePrefersReducedMotion.ts'
import { useViewCover } from '../hooks/useViewCover.ts'
import type { ScrollProgressReader, ViewInputReader } from '../types/index.ts'
import { applyWindowProjection, getMotionBudget } from '../utils/projection.ts'
import { smoothDamp, type SpringState } from '../utils/smoothDamp.ts'

const { camera: cameraConfig, imageAspect, layers, motion, idleDrift } = sceneConfig
const TAU = Math.PI * 2
// Long frames (tab switch, breakpoint) would make the spring overshoot; cap the step.
const MAX_STEP_SECONDS = 0.1

interface WindowCameraProps {
  getViewInput: ViewInputReader
  getScrollProgress?: ScrollProgressReader
}

/**
 * Drives the default camera as the viewer's eye in front of the screen.
 * Input (−1..1) → eye target within the motion limits → critically damped spring → off-axis
 * frustum. See docs/engineering/scene-logic.md.
 */
export function WindowCamera({ getViewInput, getScrollProgress }: WindowCameraProps) {
  const camera = useThree((state) => state.camera) as PerspectiveCamera
  const { viewAspect } = useViewCover()
  const reducedMotion = usePrefersReducedMotion()

  // Eye limits: the design amplitude, capped by what the art can cover at this aspect ratio.
  const limit = useMemo(() => {
    const budget = getMotionBudget(
      viewAspect,
      imageAspect,
      cameraConfig.eyeDistance,
      layers,
      motion.safety,
    )
    const scale = reducedMotion ? motion.reducedMotionScale : 1
    return {
      x: Math.min(motion.maxEye.x * scale, budget.x),
      y: Math.min(motion.maxEye.y * scale, budget.y),
    }
  }, [viewAspect, reducedMotion])

  const springX = useRef<SpringState>({ value: 0, velocity: 0 })
  const springY = useRef<SpringState>({ value: 0, velocity: 0 })
  const drift = useRef({ time: 0, weight: 1 })

  useFrame((_, frameDelta) => {
    const delta = Math.min(frameDelta, MAX_STEP_SECONDS)
    const input = getViewInput()
    const state = drift.current

    // The idle drift keeps the scene alive (and its depth visible) until real input takes over.
    const driftTarget = input.active || reducedMotion ? 0 : 1
    state.weight = MathUtils.damp(state.weight, driftTarget, idleDrift.fadeRate, delta)
    state.time += delta
    const driftX = Math.sin((TAU * state.time) / idleDrift.periodX) * idleDrift.amplitude
    const driftY = Math.sin((TAU * state.time) / idleDrift.periodY + 1.3) * idleDrift.amplitude

    const targetX = MathUtils.clamp(input.x + driftX * state.weight, -1, 1) * limit.x
    const targetY = MathUtils.clamp(input.y + driftY * state.weight, -1, 1) * limit.y

    // Clamp after the spring too: the limit shrinks instantly when the window is resized.
    const eyeX = MathUtils.clamp(
      smoothDamp(springX.current, targetX, motion.smoothTime, delta),
      -limit.x,
      limit.x,
    )
    const eyeY = MathUtils.clamp(
      smoothDamp(springY.current, targetY, motion.smoothTime, delta),
      -limit.y,
      limit.y,
    )

    // Scroll parallax: lowering the eye with the scroll makes deeper layers lag behind the frame.
    // Outside the motion budget on purpose: the background's top edge stays above the viewport
    // because it moves less than the page. Not sprung, so it never swims behind the scroll.
    const scroll = reducedMotion ? 0 : (getScrollProgress?.() ?? 0)
    const scrollEyeY = -scroll * motion.scrollParallax

    applyWindowProjection(camera, eyeX, eyeY + scrollEyeY, cameraConfig.eyeDistance, viewAspect)
  })

  return null
}
