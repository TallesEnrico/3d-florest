import { useThree } from '@react-three/fiber'
import { useEffect } from 'react'

const VSYNC_TOLERANCE = 0.9

export function IdleFrames({ fps }: { fps: number }) {
  const invalidate = useThree((state) => state.invalidate)

  useEffect(() => {
    const minGap = (1000 / fps) * VSYNC_TOLERANCE
    let frame = 0
    let last = 0
    const tick = (time: number) => {
      frame = requestAnimationFrame(tick)
      if (time - last < minGap) return
      last = time
      invalidate()
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [fps, invalidate])

  return null
}
