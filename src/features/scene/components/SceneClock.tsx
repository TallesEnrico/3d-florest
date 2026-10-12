import { useFrame } from '@react-three/fiber'
import { usePrefersReducedMotion } from '../hooks/usePrefersReducedMotion.ts'
import { sceneTime } from '../utils/sceneTime.ts'

/** Advances the shared shader clock; stops it (effects freeze) under reduced motion. */
export function SceneClock() {
  const reducedMotion = usePrefersReducedMotion()

  useFrame((_, delta) => {
    // Clamp long frames (tab switches) so effects don't jump.
    if (!reducedMotion) sceneTime.value += Math.min(delta, 0.1)
  })

  return null
}
