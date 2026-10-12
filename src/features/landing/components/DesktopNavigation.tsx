import { navSections, sectionHref, type SectionId } from '../config/landingContent.ts'

interface DesktopNavigationProps {
  activeId: SectionId | null
}

export function DesktopNavigation({ activeId }: DesktopNavigationProps) {
  return (
    <nav className="site-nav" aria-label="Seções">
      <ul className="site-nav__list">
        {navSections.map((section) => (
          <li key={section.id}>
            <a
              className="site-nav__link"
              href={sectionHref(section.id)}
              aria-current={activeId === section.id ? 'location' : undefined}
            >
              {section.title}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  )
}
