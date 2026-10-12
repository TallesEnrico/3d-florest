import { useCallback, useEffect, useRef, type RefObject } from 'react'
import type { ViewInput, ViewInputReader } from '../../scene/types/index.ts'

/**
 * Mouse position over `target` as a normalized view input (−1..1, + = right/up), read every
 * frame by a scene. Mutated in event handlers, never React state. Touch is ignored (scrolling).
 */
export function usePointerInput(target: RefObject<HTMLElement | null>): ViewInputReader {
  const input = useRef<ViewInput>({ x: 0, y: 0, active: false })

  useEffect(() => {
    const element = target.current
    if (!element) return
    const state = input.current
    const onMove = (event: PointerEvent) => {
      if (event.pointerType === 'touch') return
      state.x = (event.clientX / window.innerWidth) * 2 - 1
      state.y = 1 - (event.clientY / window.innerHeight) * 2
      state.active = true
    }
    const onLeave = () => {
      state.x = 0
      state.y = 0
      state.active = false
    }
    element.addEventListener('pointermove', onMove)
    element.addEventListener('pointerleave', onLeave)
    return () => {
      element.removeEventListener('pointermove', onMove)
      element.removeEventListener('pointerleave', onLeave)
    }
  }, [target])

  return useCallback(() => input.current, [])
}
