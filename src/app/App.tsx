import { useHeadTrackingStore } from '../features/headTracking/store/headTrackingStore.ts'
import { LandingSections } from '../features/landing/components/LandingSections.tsx'
import { SiteLayout } from '../features/landing/components/SiteLayout.tsx'
import { HeroSection } from '../features/landing/sections/HeroSection.tsx'
import type { ViewInput, ViewInputReader } from '../features/scene/types/index.ts'

/** QA aid: `?view=x,y` pins the view input (`?view=0,0` = neutral, `?view=1,-1` = a corner). */
function readPinnedView(): ViewInputReader | undefined {
  const param = new URLSearchParams(window.location.search).get('view')
  if (!param) return undefined
  const [x, y] = param.split(',').map((part) => {
    const value = Number(part)
    return Number.isFinite(value) ? Math.max(-1, Math.min(1, value)) : 0
  })
  const pinned = { x: x ?? 0, y: y ?? 0, active: true }
  return () => pinned
}

// Head tracking → scene bridge. Called every render frame: reads the store without
// subscribing (no React re-render) and reuses one object (no allocation).
const headView: ViewInput = { x: 0, y: 0, active: false }
const readHeadView: ViewInputReader = () => {
  const { offset, active } = useHeadTrackingStore.getState()
  headView.x = offset.x
  headView.y = offset.y
  headView.active = active
  return headView
}

const pinnedView = readPinnedView()

export default function App() {
  return (
    <SiteLayout>
      <HeroSection getViewInput={pinnedView ?? readHeadView} trackingEnabled={!pinnedView} />
      <LandingSections getViewInput={pinnedView ?? readHeadView} />
    </SiteLayout>
  )
}
