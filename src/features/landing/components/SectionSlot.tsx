import type { SectionEntry } from '../config/landingContent.ts'
import { SectionContainer } from './SectionContainer.tsx'

/**
 * Reserved place for a section that is not implemented yet. It keeps the anchor real (menus
 * link here) and says so explicitly; it is replaced when the section is registered in
 * sections/index.ts. No slot may remain at the integrated review (landing criteria LP-G1).
 */
export function SectionSlot({ section }: { section: SectionEntry }) {
  return (
    <SectionContainer id={section.id} className="section-slot">
      <h2 id={`${section.id}-title`} className="section__title">
        {section.title}
      </h2>
      <p className="section-slot__note">
        Seção {section.number} · em implementação
      </p>
    </SectionContainer>
  )
}
