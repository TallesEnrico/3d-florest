import { useFrame, useThree } from '@react-three/fiber'
import { useRef } from 'react'
import { MathUtils, PerspectiveCamera, Vector3 } from 'three'
import { usePrefersReducedMotion } from '../../scene/hooks/usePrefersReducedMotion.ts'
import { smoothDamp, type SpringState } from '../../scene/utils/smoothDamp.ts'
import type { ViewInputReader } from '../../scene/types/index.ts'
import { forestConfig } from '../config/forestConfig.ts'
import { journey } from '../journey/journeyState.ts'

const { shots, camera: cameraConfig, paths } = forestConfig
// Long frames (tab switch) would make the springs jump; cap the step like WindowCamera.
const MAX_STEP_SECONDS = 0.1

const spring = (): SpringState => ({ value: 0, velocity: 0 })

/** Per-frame mutable state (springs + scratch vectors), kept in a ref: no allocations per frame. */
function createControllerState() {
  return {
    position: [spring(), spring(), spring()],
    target: [spring(), spring(), spring()],
    goalPosition: new Vector3(),
    goalTarget: new Vector3(),
    lookAt: new Vector3(),
    initialized: false,
  }
}

interface SceneControllerProps {
  getViewInput: ViewInputReader
}

/**
 * Drives the forest camera from the scroll: the continuous shot parameter (`journey.shot`)
 * blends between consecutive chapter shots with an ease, then springs smooth it.
 * Side paths (journey.path) step the camera sideways; pointer/head input adds parallax; both
 * scaled by each shot's `freedom` (the last shots go through a window into the cabin).
 * Future per-chapter animations hook in here, keyed by `journey.chapter` / `chapterProgress`.
 */
export function SceneController({ getViewInput }: SceneControllerProps) {
  const camera = useThree((state) => state.camera)
  const reducedMotion = usePrefersReducedMotion()
  const stateRef = useRef<ReturnType<typeof createControllerState> | null>(null)

  useFrame(({ size, camera: view }, frameDelta) => {
    const state = (stateRef.current ??= createControllerState())

    // Portrait screens: widen the vertical field of view so the trees on both sides of the
    // corridor stay in frame (a fixed vertical fov would show only the middle of the path).
    const portrait = MathUtils.clamp((1 - size.width / Math.max(size.height, 1)) / 0.5, 0, 1)
    const fov = MathUtils.lerp(cameraConfig.fov, cameraConfig.portraitFov, portrait)
    if (view instanceof PerspectiveCamera && Math.abs(view.fov - fov) > 0.01) {
      view.fov = fov
      view.updateProjectionMatrix()
    }

    const delta = Math.min(frameDelta, MAX_STEP_SECONDS)
    const from = Math.floor(journey.shot)
    const to = Math.min(shots.length - 1, from + 1)
    const blend = MathUtils.smoothstep(journey.shot - from, 0, 1)

    state.goalPosition.fromArray(shots[from].position).lerp(state.lookAt.fromArray(shots[to].position), blend)
    state.goalTarget.fromArray(shots[from].target).lerp(state.lookAt.fromArray(shots[to].target), blend)

    // How far paths and parallax may move the camera: less near walls (the cabin), none inside.
    const freedom = MathUtils.lerp(shots[from].freedom ?? 1, shots[to].freedom ?? 1, blend)

    // Side path: step sideways and turn the gaze toward it.
    state.goalPosition.x += journey.path * paths.spacing * freedom
    state.goalTarget.x += journey.path * paths.gazeShift * freedom

    // Pointer/head parallax: move the eye, keep the gaze (near trunks shift more than far ones).
    const input = getViewInput()
    const amplitude = (reducedMotion ? cameraConfig.reducedMotionScale : 1) * freedom
    state.goalPosition.x += input.x * cameraConfig.lateral.x * amplitude
    state.goalPosition.y += input.y * cameraConfig.lateral.y * amplitude

    const goals = [state.goalPosition, state.goalTarget]
    ;[state.position, state.target].forEach((springs, i) => {
      const goal = goals[i]
      springs.forEach((s, axis) => {
        const value = goal.getComponent(axis)
        // First frame: start on the shot instead of flying in from the origin.
        if (!state.initialized) s.value = value
        smoothDamp(s, value, cameraConfig.smoothTime, delta)
      })
    })
    state.initialized = true

    camera.position.set(state.position[0].value, state.position[1].value, state.position[2].value)
    camera.lookAt(state.lookAt.set(state.target[0].value, state.target[1].value, state.target[2].value))
  })

  return null
}
