import { useEffect, type RefObject } from 'react'
import { registerHeadTrackingControls } from '../controls.ts'
import { useDebugToggle } from '../hooks/useDebugToggle.ts'
import { useHeadTracking } from '../hooks/useHeadTracking.ts'
import { useMouseFallback } from '../hooks/useMouseFallback.ts'
import './headTracking.css'
import { HeadTrackingDebugPanel } from './HeadTrackingDebugPanel.tsx'
import { HeadTrackingPrompt } from './HeadTrackingPrompt.tsx'

interface HeadTrackingControllerProps {
  /** Whether the scene is on screen (pauses detection and releases the camera when not). */
  inView?: boolean
  /** Element whose pointer drives the mouse fallback; the whole window when omitted. */
  pointerTarget?: RefObject<HTMLElement | null>
}

/** Owns the input sources (webcam + mouse fallback) and their UI. Renders no scene content. */
export function HeadTrackingController({ inView = true, pointerTarget }: HeadTrackingControllerProps) {
  const controls = useHeadTracking({ inView })
  useMouseFallback(pointerTarget)
  const debugVisible = useDebugToggle()

  // Lets CTAs elsewhere on the page start the camera (see controls.ts).
  useEffect(() => registerHeadTrackingControls(controls), [controls])

  return (
    <>
      <HeadTrackingPrompt controls={controls} />
      {debugVisible && <HeadTrackingDebugPanel controls={controls} />}
    </>
  )
}
