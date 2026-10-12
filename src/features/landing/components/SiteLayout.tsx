import type { ReactNode } from 'react'
import { MAIN_ID } from '../config/landingContent.ts'
import { useActiveSection } from '../hooks/useActiveSection.ts'
import { useScrolledPast } from '../hooks/useScrolledPast.ts'
import '../styles/tokens.css'
import '../styles/landing.css'
import { HeadNavigation } from './HeadNavigation.tsx'
import { SiteFooter } from './SiteFooter.tsx'
import { SiteHeader } from './SiteHeader.tsx'

/** Page frame: skip link, header, main content and footer. */
export function SiteLayout({ children }: { children: ReactNode }) {
  const [sentinel, scrolled] = useScrolledPast()
  const activeId = useActiveSection()

  return (
    <>
      <a className="skip-link" href={`#${MAIN_ID}`}>
        Pular para o conteúdo
      </a>
      {/* Once this 1 px marker leaves the viewport, the header turns solid. */}
      <div ref={sentinel} className="scroll-sentinel" aria-hidden="true" />
      <SiteHeader solid={scrolled} activeId={activeId} />
      <main id={MAIN_ID} tabIndex={-1}>
        {children}
      </main>
      <SiteFooter />
      <HeadNavigation />
    </>
  )
}
