import type { ViewInputReader } from '../../scene/types/index.ts'
import { contentSections } from '../config/landingContent.ts'
import { sectionComponents } from '../sections/index.ts'
import { ForestJourney } from './ForestJourney.tsx'
import { SectionSlot } from './SectionSlot.tsx'

interface LandingSectionsProps {
  /** Head/mouse input, shared with the forest scene for lateral perspective. */
  getViewInput: ViewInputReader
}

/**
 * Content sections after the hero, in plan order (the implemented ones or their slots), as the
 * chapters of the forest journey: one shared scene behind all of them.
 */
export function LandingSections({ getViewInput }: LandingSectionsProps) {
  return (
    <ForestJourney getViewInput={getViewInput}>
      {contentSections.map((section) => {
        const Section = sectionComponents[section.id]
        return Section ? <Section key={section.id} /> : <SectionSlot key={section.id} section={section} />
      })}
    </ForestJourney>
  )
}
