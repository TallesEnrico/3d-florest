import { SectionContainer } from '../components/SectionContainer.tsx'
import { creditsCopy as copy } from '../config/landingContent.ts'

/** 09 · Créditos: who made the assets (inside the cabin, the journey's last shot). */
export function CreditsSection() {
  return (
    <SectionContainer id="creditos" className="chapter-section">
      <div className="chapter chapter--start">
        <p className="chapter__eyebrow">{copy.eyebrow}</p>
        <h2 id="creditos-title" className="section__title">
          {copy.title}
        </h2>
        <p className="chapter__lead">{copy.lead}</p>
        <dl className="credits">
          {copy.groups.map((group) => (
            <div key={group.title} className="credits__group">
              <dt className="credits__title">{group.title}</dt>
              <dd className="credits__text">{group.text}</dd>
            </div>
          ))}
        </dl>
      </div>
    </SectionContainer>
  )
}
