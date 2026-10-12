import { FeatureIcon } from '../components/FeatureIcon.tsx'
import { SectionContainer } from '../components/SectionContainer.tsx'
import { featuresCopy as copy } from '../config/landingContent.ts'

/** 05 · Recursos: what the visitor can do here, all verifiable in the project. */
export function FeaturesSection() {
  return (
    <SectionContainer id="recursos" className="chapter-section">
      <div className="chapter chapter--wide" style={{ marginBottom: 800 }}>
        <p className="chapter__eyebrow">{copy.eyebrow}</p>
        <h2 id="recursos-title" className="section__title">
          {copy.title}
        </h2>
        <ul className="features">
          {copy.items.map((item) => (
            <li key={item.title} className="feature">
              <FeatureIcon name={item.icon} />
              <h3 className="feature__title">{item.title}</h3>
              <p className="feature__text">{item.text}</p>
            </li>
          ))}
        </ul>
      </div>
    </SectionContainer>
  )
}
