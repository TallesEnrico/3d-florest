import { forestConfig } from '../config/forestConfig.ts'
import type { JourneyState } from '../types/index.ts'

/**
 * The journey's scroll state. A plain mutable object: written by the scroll system (DOM side)
 * at most once per animation frame, read by SceneController inside the render loop.
 * No React state, no re-render while scrolling. One journey per page.
 */
export const journey: JourneyState = {
  progress: 0,
  shot: 0,
  chapter: 0,
  chapterProgress: 0,
  inView: false,
  path: 0,
}

/**
 * Moves one path left (−1) or right (+1), clamped to the available paths.
 * Returns the new path, or null when already at the edge.
 */
export function stepPath(direction: -1 | 1): number | null {
  const limit = forestConfig.paths.perSide
  const next = Math.max(-limit, Math.min(limit, journey.path + direction))
  if (next === journey.path) return null
  journey.path = next
  return next
}

/**
 * Measures the chapters against the viewport and updates `journey`. Also writes
 * `--chapter-progress` (0..1) on each chapter element: the HTML/CSS parallax layer, and
 * `--journey-enter` (0 when the journey's top reaches the viewport bottom, 1 at the top).
 */
export function measureJourney(container: HTMLElement, chapters: HTMLElement[]): void {
  const viewport = window.innerHeight
  const box = container.getBoundingClientRect()
  journey.inView = box.bottom > 0 && box.top < viewport
  container.style.setProperty('--journey-enter', Math.min(1, Math.max(0, 1 - box.top / viewport)).toFixed(4))

  const travel = Math.max(box.height - viewport, 1)
  journey.progress = Math.min(1, Math.max(0, -box.top / travel))

  // The chapter under the middle of the viewport, and how far through it we are.
  const middle = viewport / 2
  let chapter = 0
  let chapterProgress = 0
  chapters.forEach((element, index) => {
    const rect = element.getBoundingClientRect()
    const local = Math.min(1, Math.max(0, (middle - rect.top) / Math.max(rect.height, 1)))
    element.style.setProperty('--chapter-progress', local.toFixed(4))
    if (rect.top <= middle) {
      chapter = index
      chapterProgress = local
    }
  })
  journey.chapter = chapter
  journey.chapterProgress = chapterProgress
  // Shot i is "on" when chapter i is centered (local progress 0.5).
  journey.shot = Math.min(chapters.length - 1, Math.max(0, chapter + chapterProgress - 0.5))
}
