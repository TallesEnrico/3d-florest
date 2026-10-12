import type { FOOTER_ID, SectionId } from '../config/landingContent.ts'

export type ScrollTarget = SectionId | typeof FOOTER_ID

/** Scrolls to a section (smooth unless the user prefers reduced motion) and updates the hash. */
export function scrollToSection(id: ScrollTarget): void {
  const element = document.getElementById(id)
  if (!element) return
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  element.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'start' })
  history.replaceState(null, '', `#${id}`)
}
