/**
 * The symbol: an arched window over a horizon line, with the sun right of center as in the art
 * (docs/art/visual-direction.md). Inherits the text color.
 */
export function BrandMark({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 32 32" aria-hidden="true" focusable="false">
      <path
        d="M7 28V14.5a9 9 0 0 1 18 0V28"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <circle cx="19.5" cy="17.5" r="2.6" fill="currentColor" />
      <path d="M7 23h18" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  )
}
