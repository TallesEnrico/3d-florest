import { useThree } from '@react-three/fiber'
import { sceneConfig } from '../config/sceneConfig.ts'
import type { Size2 } from '../types/index.ts'
import { coverSize } from '../utils/projection.ts'

/** Current viewport aspect and the art's cover size for it (re-renders only on resize). */
export function useViewCover(): { viewAspect: number; cover: Size2 } {
  const size = useThree((state) => state.size)
  const viewAspect = size.width / Math.max(size.height, 1)
  return { viewAspect, cover: coverSize(viewAspect, sceneConfig.imageAspect) }
}
