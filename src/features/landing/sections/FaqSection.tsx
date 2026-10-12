import { SectionContainer } from '../components/SectionContainer.tsx'
import { faqCopy as copy } from '../config/landingContent.ts'

/**
 * 08 · Perguntas: short answers, closed by default (native disclosure, one open at a time) so the
 * panel stays small while the camera walks up to the cabin's window.
 */
export function FaqSection() {
  return (
    <SectionContainer id="perguntas" className="chapter-section">
      <div className="chapter chapter--start">
        <p className="chapter__eyebrow">{copy.eyebrow}</p>
        <h2 id="perguntas-title" className="section__title">
          {copy.title}
        </h2>
        <div className="faq">
          {copy.items.map((item, index) => (
            <details key={item.question} className="faq__item" name="faq" open={index === 0}>
              <summary className="faq__question">{item.question}</summary>
              <p className="faq__answer">{item.answer}</p>
            </details>
          ))}
        </div>
      </div>
    </SectionContainer>
  )
}
