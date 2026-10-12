import { useEffect, useRef, useState } from 'react'
import { trackingConfig } from '../../headTracking/config/trackingConfig.ts'
import { setHeadNavigation } from '../../headTracking/controls.ts'
import { useHeadTrackingStore } from '../../headTracking/store/headTrackingStore.ts'

const { speed } = trackingConfig.gesture
// A long frame (tab switch) must not turn into a big jump.
const MAX_STEP_SECONDS = 0.1

/**
 * "Navigate with the head" mode (opt-in, landing plan D10): tilt the head and hold to start
 * scrolling (down = forward), keep it tilted to keep scrolling (faster with more tilt), back to
 * neutral to stop. Shows a side rail whose ring fills while arming. One rAF loop while the mode
 * is on; feedback goes straight to CSS (no re-render per frame).
 */
export function HeadNavigation() {
  const navigation = useHeadTrackingStore((state) => state.navigation)
  const searching = useHeadTrackingStore((state) => state.tracking !== 'tracking')
  const railRef = useRef<HTMLDivElement>(null)
  const [announcement, setAnnouncement] = useState('')

  useEffect(() => {
    if (!navigation) return
    let frame = 0
    let lastTime = 0
    let carry = 0 // sub-pixel remainder, so slow speeds still move
    let wasEngaged = false

    const tick = (time: number) => {
      const { gesture } = useHeadTrackingStore.getState()
      const rail = railRef.current
      if (rail) {
        rail.style.setProperty('--gesture-progress', String(gesture.progress))
        rail.dataset.direction = gesture.direction ?? ''
        rail.dataset.engaged = String(gesture.engaged)
      }

      const dt = lastTime ? Math.min((time - lastTime) / 1000, MAX_STEP_SECONDS) : 0
      lastTime = time
      if (gesture.engaged && gesture.direction) {
        const viewportsPerSecond = speed.min + (speed.max - speed.min) * gesture.intensity
        carry += (gesture.direction === 'down' ? 1 : -1) * viewportsPerSecond * window.innerHeight * dt
        const step = Math.trunc(carry)
        carry -= step
        if (step) window.scrollBy({ top: step, behavior: 'instant' })
        if (!wasEngaged) {
          setAnnouncement(gesture.direction === 'down' ? 'Rolando para baixo' : 'Rolando para cima')
        }
      } else if (wasEngaged) {
        carry = 0
        setAnnouncement('Rolagem parada')
      }
      wasEngaged = gesture.engaged
      frame = requestAnimationFrame(tick)
    }

    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [navigation])

  if (!navigation) return null

  return (
    <div ref={railRef} className="head-nav camera-only" role="group" aria-label="Navegação pela cabeça">
      <p className="head-nav__hint" aria-hidden="true">
        {searching
          ? 'Procurando seu rosto…'
          : 'Incline a cabeça e segure para rolar; volte ao centro para parar'}
      </p>
      <div className="head-nav__rail" aria-hidden="true">
        <svg className="head-nav__arrow head-nav__arrow--up" viewBox="0 0 24 24">
          <path d="M6 15l6-6 6 6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
        <span className="head-nav__ring" />
        <svg className="head-nav__arrow head-nav__arrow--down" viewBox="0 0 24 24">
          <path d="M6 9l6 6 6-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
      </div>
      <button type="button" className="head-nav__off" onClick={() => setHeadNavigation(false)}>
        <span className="visually-hidden">Desligar navegação pela cabeça</span>
        <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
          <path d="M7 7l10 10M17 7L7 17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
      </button>
      <p className="visually-hidden" role="status" aria-live="polite">
        {announcement}
      </p>
    </div>
  )
}
