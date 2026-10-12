import { SectionContainer } from '../components/SectionContainer.tsx'
import { behindTheScenesCopy as copy } from '../config/landingContent.ts'

/** 06 · Bastidores: the real assets, from the reference painting to the 3D forest. */
export function BehindTheScenesSection() {
  return (
    <SectionContainer id="bastidores" className="chapter-section">
      <div className="chapter chapter--wide">
        <p className="chapter__eyebrow">{copy.eyebrow}</p>
        <h2 id="bastidores-title" className="section__title">
          {copy.title}
        </h2>
        <p className="chapter__lead">{copy.lead}</p>
        <ol className="making">
          {copy.steps.map((step, index) => (
            <li key={step.title} className="making__item">
              <figure className="making__figure">
                <img src={step.image} alt={step.alt} width={960} height={540} loading="lazy" decoding="async" />
                <figcaption>
                  <span className="making__step">{String(index + 1).padStart(2, '0')}</span>
                  <strong>{step.title}</strong> {step.text}
                </figcaption>
              </figure>
            </li>
          ))}
        </ol>
        <p className="chapter__note">{copy.stack}</p>
      </div>
    </SectionContainer>
  )
}
