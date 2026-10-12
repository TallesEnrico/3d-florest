import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { ForestScene } from '../../forest/components/ForestScene.tsx'
import { journey, stepPath } from '../../forest/journey/journeyState.ts'
import { useJourneyTracking } from '../../forest/journey/useJourneyTracking.ts'
import { useHeadTrackingStore } from '../../headTracking/store/headTrackingStore.ts'
import type { ViewInputReader } from '../../scene/types/index.ts'
import { contentSections } from '../config/landingContent.ts'
import { useInView } from '../hooks/useInView.ts'
import { usePointerInput } from '../hooks/usePointerInput.ts'

// The content sections are the journey's chapters, in page order (one camera shot each).
const CHAPTER_IDS = contentSections.map((section) => section.id)

const isInteractive = (target: EventTarget | null) =>
  target instanceof Element && target.closest('a, button, input, textarea, select, [contenteditable]') !== null

const pathName = (path: number) => (path === 0 ? 'do centro' : path < 0 ? 'da esquerda' : 'da direita')

interface ForestJourneyProps {
  /** Head input (and the QA pinned view). With the camera on, it leads; otherwise the mouse over the forest does. */
  getViewInput: ViewInputReader
  /** The chapter sections, unchanged (same ids, same content). */
  children: ReactNode
}

/**
 * Puts one shared ForestScene on a sticky stage behind the chapters. The canvas is created only
 * when the journey is within a screen of the viewport and stops rendering while off screen.
 * Interaction: the head (camera on) or the mouse moves the camera (parallax); a double click on
 * the left/right half of the screen, or ← →, changes path.
 */
export function ForestJourney({ getViewInput, children }: ForestJourneyProps) {
  const journeyRef = useRef<HTMLDivElement>(null)
  const near = useInView(journeyRef, false, '100% 0px')
  const visible = useInView(journeyRef, false)
  const [announcement, setAnnouncement] = useState('')
  useJourneyTracking(journeyRef, CHAPTER_IDS)

  const readPointer = usePointerInput(journeyRef)
  const readInput = useCallback<ViewInputReader>(() => {
    const head = getViewInput()
    // The camera was turned on to look around with the head: it leads while it is on (the mouse
    // resting over the forest would otherwise always win).
    if (head.active && useHeadTrackingStore.getState().source === 'webcam') return head
    const pointer = readPointer()
    return pointer.active ? pointer : head
  }, [readPointer, getViewInput])

  useEffect(() => {
    const element = journeyRef.current
    if (!element) return

    const move = (direction: -1 | 1) => {
      const next = stepPath(direction)
      element.dataset.path = String(journey.path)
      setAnnouncement(
        next === null
          ? `Você já está no caminho ${pathName(journey.path)}`
          : `Caminho ${pathName(next)}`,
      )
    }
    // A double click must not select the word under the pointer (single clicks still can).
    const onMouseDown = (event: MouseEvent) => {
      if (event.detail > 1 && !isInteractive(event.target)) event.preventDefault()
    }
    const onDoubleClick = (event: MouseEvent) => {
      if (isInteractive(event.target)) return
      move(event.clientX < window.innerWidth / 2 ? -1 : 1)
    }
    // Keyboard equivalent while the forest is on screen.
    const onKeyDown = (event: KeyboardEvent) => {
      if (!journey.inView || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return
      if (event.target instanceof Element && event.target.closest('input, textarea, select, [contenteditable]')) return
      if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return
      event.preventDefault()
      move(event.key === 'ArrowLeft' ? -1 : 1)
    }

    element.addEventListener('mousedown', onMouseDown)
    element.addEventListener('dblclick', onDoubleClick)
    window.addEventListener('keydown', onKeyDown)
    return () => {
      element.removeEventListener('mousedown', onMouseDown)
      element.removeEventListener('dblclick', onDoubleClick)
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [])

  return (
    <div ref={journeyRef} className="forest-journey" data-path="0" style={{ position: 'relative'}}>
      <div style={{ position: 'absolute', zIndex: 1, top: '0px', width: '100%', height: '300px',
        background: 'linear-gradient(180deg, rgba(0, 0, 0, 0.7) 0%, rgba(255, 255, 255, 0) 100%)'
       }} />
      <div className={`forest-journey__stage${visible ? ' is-visible' : ''}`}>
        {near && <ForestScene paused={!visible} getViewInput={readInput} />}
        <p className="forest-journey__hint" aria-hidden="true">
          Mova o mouse ou a cabeça para olhar ao redor · Dois cliques à esquerda ou à direita (ou ← →) para
          mudar de caminho
        </p>
      </div>
      {children}
      <p className="visually-hidden" role="status" aria-live="polite">
        {announcement}
      </p>
    </div>
  )
}
