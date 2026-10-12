import type { ComponentType } from 'react'
import type { SectionId } from '../config/landingContent.ts'
import { BehindTheScenesSection } from './BehindTheScenesSection.tsx'
import { CreditsSection } from './CreditsSection.tsx'
import { ExperienceSection } from './ExperienceSection.tsx'
import { FaqSection } from './FaqSection.tsx'
import { FeaturesSection } from './FeaturesSection.tsx'
import { HowItWorksSection } from './HowItWorksSection.tsx'
import { ManifestoSection } from './ManifestoSection.tsx'

/**
 * Implemented content sections. A section listed in landingContent but missing here renders
 * as a SectionSlot. To ship a section: create sections/<Name>Section.tsx (a SectionContainer
 * with id = its SectionId) and register it below. Order comes from landingContent.
 */
export const sectionComponents: Partial<Record<SectionId, ComponentType>> = {
  manifesto: ManifestoSection,
  'como-funciona': HowItWorksSection,
  recursos: FeaturesSection,
  bastidores: BehindTheScenesSection,
  experimente: ExperienceSection,
  perguntas: FaqSection,
  creditos: CreditsSection,
}
