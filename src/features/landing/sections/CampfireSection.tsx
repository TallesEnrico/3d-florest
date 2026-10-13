import { SectionContainer } from '../components/SectionContainer.tsx'
import { campfireCopy as copy, HERO_ID } from '../config/landingContent.ts'
import { scrollToSection } from '../utils/scrollToSection.ts'

export function CampfireSection() {
  return (
    <SectionContainer id="fogueira" className="chapter-section campfire-section">
      <div className="chapter chapter--start chapter--narrow">
        <p className="chapter__eyebrow">{copy.eyebrow}</p>
        <h2 id="fogueira-title" className="section__title">
          {copy.title}
        </h2>
        <p className="chapter__lead">{copy.lead}</p>
        <div className="experience__actions">
          <button type="button" className="button button--ghost" onClick={() => scrollToSection(HERO_ID)}>
            {copy.action}
          </button>
        </div>
      </div>
    </SectionContainer>
  )
}
