import { FOOTER_ID, HERO_ID, navSections, sectionHref, site } from '../config/landingContent.ts'
import { BrandMark } from './BrandMark.tsx'

const YEAR = new Date().getFullYear()

/** Only real information (landing plan D9): contact, socials and repository come when provided. */
export function SiteFooter() {
  return (
    <footer id={FOOTER_ID} className="site-footer">
      <div className="site-footer__inner">
        <div className="site-footer__brand">
          <a className="brand" href={sectionHref(HERO_ID)}>
            <BrandMark className="brand__mark" />
            <span className="brand__name">{site.name}</span>
          </a>
          <p className="site-footer__description">{site.description}</p>
        </div>

        <nav className="site-footer__nav" aria-label="Rodapé">
          <h2 className="site-footer__heading">Navegação</h2>
          <ul>
            <li>
              <a href={sectionHref(HERO_ID)}>Início</a>
            </li>
            {navSections.map((section) => (
              <li key={section.id}>
                <a href={sectionHref(section.id)}>{section.title}</a>
              </li>
            ))}
          </ul>
        </nav>

        <div className="site-footer__about">
          <h2 className="site-footer__heading">Privacidade</h2>
          <p>{site.privacy}</p>
          <p className="site-footer__credits">{site.credits}</p>
        </div>
      </div>
      <p className="site-footer__legal">
        © {YEAR} {site.name}
      </p>
    </footer>
  )
}
