import { CameraCta } from '../components/CameraCta.tsx'
import { SectionContainer } from '../components/SectionContainer.tsx'
import { experienceCopy as copy, HERO_ID } from '../config/landingContent.ts'
import { scrollToSection } from '../utils/scrollToSection.ts'

/**
 * 07 · CTA final: back to the window. The primary button starts the camera inside the click
 * (CameraCta, hidden on touch screens per D7); the secondary one only goes back to the hero.
 */
export function ExperienceSection() {
  return (
    <SectionContainer id="experimente" className="chapter-section">
      <div className="chapter chapter--center" style={{ marginBottom: 400 }}>
        <p className="chapter__eyebrow">{copy.eyebrow}</p>
        <h2 id="experimente-title" className="section__title">
          {copy.title}
        </h2>
        <p className="chapter__lead">{copy.lead}</p>
        <div className="experience__actions">
          <CameraCta className="button--large" />
          <button type="button" className="button button--ghost button--large" onClick={() => scrollToSection(HERO_ID)}>
            <span className="pointer-only">{copy.secondary.pointer}</span>
            <span className="touch-only">{copy.secondary.touch}</span>
          </button>
        </div>
        <ul className="experience__tips camera-only">
          {copy.tips.map((tip) => (
            <li key={tip}>{tip}</li>
          ))}
        </ul>
      </div>
    </SectionContainer>
  )
}
