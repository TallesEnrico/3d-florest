import { useEffect, useState } from 'react'
import { sections, type SectionId } from '../config/landingContent.ts'

// A thin band around the middle of the viewport: the section crossing it is "active".
const ACTIVE_BAND = '-45% 0px -50% 0px'

/** The section currently under the middle of the viewport (for aria-current in the menus). */
export function useActiveSection(): SectionId | null {
  const [active, setActive] = useState<SectionId | null>(null)

  useEffect(() => {
    const elements = sections
      .map((section) => document.getElementById(section.id))
      .filter((element): element is HTMLElement => element !== null)

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) setActive(entry.target.id as SectionId)
        }
      },
      { rootMargin: ACTIVE_BAND },
    )
    elements.forEach((element) => observer.observe(element))
    return () => observer.disconnect()
  }, [])

  return active
}
