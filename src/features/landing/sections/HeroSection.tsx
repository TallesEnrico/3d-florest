import { useCallback, useRef } from 'react'
import { HeadTrackingController } from '../../headTracking/components/HeadTrackingController.tsx'
import { useHeadTrackingStore } from '../../headTracking/store/headTrackingStore.ts'
import { SceneCanvas } from '../../scene/components/SceneCanvas.tsx'
import type { ViewInputReader } from '../../scene/types/index.ts'
import { contentSections, HERO_ID, heroCopy, sectionHref } from '../config/landingContent.ts'
import { useInView } from '../hooks/useInView.ts'

interface HeroSectionProps {
  getViewInput: ViewInputReader
  /** False when the view is pinned for QA (`?view=x,y`): no camera, no mouse. */
  trackingEnabled: boolean
}

/**
 * Section 02: the existing scene and head tracking, as the first screen of the page.
 * Off screen, the canvas stops rendering; tracking keeps running, so the head also looks around
 * in the forest (landing plan D6, revised 2026-10-12).
 */
export function HeroSection({ getViewInput, trackingEnabled }: HeroSectionProps) {
  const heroRef = useRef<HTMLElement>(null)
  const inView = useInView(heroRef)
  const tracking = useHeadTrackingStore((state) => state.tracking === 'tracking')
  const next = contentSections[0]

  // Read once per rendered frame by the scene: how much of the hero has scrolled away.
  const getScrollProgress = useCallback(() => {
    const rect = heroRef.current?.getBoundingClientRect()
    if (!rect || rect.height === 0) return 0
    return Math.min(1, Math.max(0, -rect.top / rect.height))
  }, [])

  return (
    <section
      ref={heroRef}
      id={HERO_ID}
      aria-labelledby={`${HERO_ID}-title`}
      className={`hero${tracking ? ' hero--tracking' : ''}`}
    >
      <SceneCanvas
        getViewInput={getViewInput}
        paused={!inView}
        getScrollProgress={getScrollProgress}
      />

      <div className="hero__copy">
        <h1 id={`${HERO_ID}-title`} className="hero__title">
          {heroCopy.title}
        </h1>
        <p className="hero__lead">{heroCopy.lead}</p>
      </div>

      {/* Always "in view": once on, the camera follows the head on the whole page. */}
      {trackingEnabled && <HeadTrackingController pointerTarget={heroRef} />}

      <a className="hero__scroll-cue" href={sectionHref(next.id)}>
        <span className="visually-hidden">Ir para {next.title}</span>
        <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
          <path d="M6 9l6 6 6-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
      </a>
    </section>
  )
}
