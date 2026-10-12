import { SectionContainer } from '../components/SectionContainer.tsx'
import { manifestoCopy as copy } from '../config/landingContent.ts'

/** 03 · Manifesto: gives meaning to what the visitor just felt in the hero. */
export function ManifestoSection() {
  return (
    <SectionContainer id="manifesto" className="chapter-section">
      <div className="chapter chapter--start chapter--narrow">
        <p className="chapter__eyebrow">{copy.eyebrow}</p>
        <h2 id="manifesto-title" className="section__title">
          {copy.title}
        </h2>
        <p className="chapter__lead">{copy.body}</p>
        <p className="manifesto__highlight">{copy.highlight}</p>
      </div>
    </SectionContainer>
  )
}
