import { useEffect, type RefObject } from 'react'
import { measureJourney } from './journeyState.ts'

/**
 * Keeps `journey` in sync with the page scroll: one passive scroll/resize listener, measured at
 * most once per animation frame. `chapterIds` are the chapter elements' ids, in page order.
 */
export function useJourneyTracking(
  container: RefObject<HTMLElement | null>,
  chapterIds: readonly string[],
): void {
  useEffect(() => {
    const root = container.current
    if (!root) return
    const chapters = chapterIds
      .map((id) => document.getElementById(id))
      .filter((element): element is HTMLElement => element !== null)

    let frame = 0
    const schedule = () => {
      if (frame) return
      frame = requestAnimationFrame(() => {
        frame = 0
        measureJourney(root, chapters)
      })
    }

    measureJourney(root, chapters)
    window.addEventListener('scroll', schedule, { passive: true })
    window.addEventListener('resize', schedule)
    return () => {
      cancelAnimationFrame(frame)
      window.removeEventListener('scroll', schedule)
      window.removeEventListener('resize', schedule)
    }
  }, [container, chapterIds])
}
