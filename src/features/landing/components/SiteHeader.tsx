import { HERO_ID, sectionHref, site, type SectionId } from '../config/landingContent.ts'
import { BrandMark } from './BrandMark.tsx'
import { CameraCta } from './CameraCta.tsx'
import { DesktopNavigation } from './DesktopNavigation.tsx'
import { MobileNavigation } from './MobileNavigation.tsx'

interface SiteHeaderProps {
  /** Past the top of the page: solid background instead of floating over the hero. */
  solid: boolean
  activeId: SectionId | null
}

export function SiteHeader({ solid, activeId }: SiteHeaderProps) {
  return (
    <header className={`site-header${solid ? ' site-header--solid' : ''}`}>
      <div className="site-header__inner">
        <a className="brand" href={sectionHref(HERO_ID)}>
          <BrandMark className="brand__mark" />
          <span className="brand__name">{site.name}</span>
        </a>
        <DesktopNavigation activeId={activeId} />
        <CameraCta className="site-header__cta" />
        <MobileNavigation activeId={activeId} />
      </div>
    </header>
  )
}
