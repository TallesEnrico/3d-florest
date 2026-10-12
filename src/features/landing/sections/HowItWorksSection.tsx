import type { CSSProperties } from 'react'
import { SectionContainer } from '../components/SectionContainer.tsx'
import { howItWorksCopy as copy } from '../config/landingContent.ts'

/** 04 · Como funciona: from the face to the point of view, and the three depths of the window. */
export function HowItWorksSection() {
  return (
    <SectionContainer id="como-funciona" className="chapter-section">
      <div className="chapter chapter--end chapter--broad">
        <p className="chapter__eyebrow">{copy.eyebrow}</p>
        <h2 id="como-funciona-title" className="section__title">
          {copy.title}
        </h2>
        <p className="chapter__lead">{copy.lead}</p>

        <div className="how__columns">
          <ol className="steps">
            {copy.steps.map((step) => (
              <li key={step.title} className="steps__item">
                <h3 className="steps__title">{step.title}</h3>
                <p>{step.text}</p>
              </li>
            ))}
          </ol>

          <div>
            <h3 className="depths__title">{copy.layersTitle}</h3>
            <dl className="depths">
              {copy.layers.map((layer) => (
                <div key={layer.name} className="depths__row" style={{ '--follows': layer.follows / 100 } as CSSProperties}>
                  <dt>
                    {layer.name} <span className="depths__where">{layer.where}</span>
                  </dt>
                  <dd>
                    <span className="depths__bar" aria-hidden="true" />
                    acompanha {layer.follows}% do seu movimento
                  </dd>
                </div>
              ))}
            </dl>
            <p className="chapter__note">{copy.layersNote}</p>
          </div>
        </div>
      </div>
    </SectionContainer>
  )
}
