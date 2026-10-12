import { useEffect, type RefObject } from 'react'
import { useHeadTrackingStore } from '../store/headTrackingStore.ts'

const ZERO = { x: 0, y: 0 }

/**
 * Pointer position → the same normalized offset the webcam produces, while the mouse is the
 * input source (before the camera is enabled, or after it is denied, unavailable or turned off).
 * With a `target`, only the pointer over that element counts (the hero on the landing page);
 * leaving it returns the view to neutral and lets the scene's idle drift resume.
 */
export function useMouseFallback(target?: RefObject<HTMLElement | null>): void {
  useEffect(() => {
    const { getState, setState } = useHeadTrackingStore
    const element = target?.current ?? null
    const surface: HTMLElement | Window = element ?? window

    const onPointerMove = (event: PointerEvent) => {
      if (getState().source !== 'mouse') return
      const rect = element?.getBoundingClientRect() ?? {
        left: 0,
        top: 0,
        width: window.innerWidth,
        height: window.innerHeight,
      }
      setState({
        offset: {
          x: ((event.clientX - rect.left) / rect.width) * 2 - 1,
          y: 1 - ((event.clientY - rect.top) / rect.height) * 2,
        },
        active: true,
      })
    }
    const onLeave = () => {
      if (getState().source !== 'mouse') return
      setState({ offset: ZERO, active: false })
    }

    const leaveTarget = element ?? document.documentElement
    surface.addEventListener('pointermove', onPointerMove as EventListener)
    leaveTarget.addEventListener('pointerleave', onLeave)
    window.addEventListener('blur', onLeave)
    return () => {
      surface.removeEventListener('pointermove', onPointerMove as EventListener)
      leaveTarget.removeEventListener('pointerleave', onLeave)
      window.removeEventListener('blur', onLeave)
    }
  }, [target])
}
