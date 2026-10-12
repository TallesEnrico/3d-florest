import type { ReactNode } from 'react'
import type { SectionId } from '../config/landingContent.ts'

interface SectionContainerProps {
  id: SectionId
  /** The section's h2 must use `${id}-title` as its id (labels the landmark). */
  className?: string
  children: ReactNode
}

/** Standard content section: anchor id, accessible name, max width and vertical rhythm. */
export function SectionContainer({ id, className, children }: SectionContainerProps) {
  return (
    <section id={id} aria-labelledby={`${id}-title`} className={`section ${className ?? ''}`}>
      <div className="section__inner">{children}</div>
    </section>
  )
}
