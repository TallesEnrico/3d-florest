import type { FeatureIconName } from '../config/landingContent.ts'

/** Simple line icons for the feature cards (decorative: the card title carries the meaning). */
const PATHS: Record<FeatureIconName, string[]> = {
  privacy: ['M12 3l7 3v5c0 4.5-3 8.2-7 10-4-1.8-7-5.5-7-10V6l7-3z', 'M9.5 12.5l1.8 1.8 3.5-3.6'],
  window: ['M4 4h16v16H4z', 'M12 4v16', 'M4 12h16'],
  pointer: ['M6 3l12 7.5-5.2 1.3 3 6.2-2.4 1.1-3-6.1L6 17z'],
  head: ['M12 4a5 5 0 0 1 5 5c0 2.4-1.3 3.7-1.3 5.6V17h-7.4v-2.4C8.3 12.7 7 11.4 7 9a5 5 0 0 1 5-5z', 'M20 8l1.5 2L20 12', 'M4 12l-1.5 2L4 16'],
  paths: ['M12 21v-7', 'M12 14L6 6', 'M12 14l6-8', 'M4 7l2-1 1 2', 'M17 8l1-2 2 1'],
  motion: ['M3 8h11', 'M3 12h7', 'M3 16h4', 'M17 8a4 4 0 1 1 0 8'],
}

export function FeatureIcon({ name }: { name: FeatureIconName }) {
  return (
    <svg
      className="feature__icon"
      viewBox="0 0 24 24"
      width="28"
      height="28"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {PATHS[name].map((d) => (
        <path key={d} d={d} />
      ))}
    </svg>
  )
}
