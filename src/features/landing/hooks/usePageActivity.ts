import { useEffect } from 'react'
import { useHeadTrackingStore } from '../../headTracking/store/headTrackingStore.ts'
import { useActivityLevel } from '../../scene/hooks/useActivityLevel.ts'
import { setKeepAwake } from '../../scene/utils/activity.ts'

export function usePageActivity(): void {
  const activity = useActivityLevel()
  const webcamLive = useHeadTrackingStore((state) => state.source === 'webcam' && state.active)

  useEffect(() => {
    document.documentElement.dataset.activity = activity
  }, [activity])

  useEffect(() => {
    setKeepAwake(webcamLive)
    return () => setKeepAwake(false)
  }, [webcamLive])
}
