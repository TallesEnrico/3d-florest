import { useEffect, useState, type RefObject } from 'react'

/**
 * True while some area of the element is inside the viewport, optionally grown by `rootMargin`
 * (e.g. '100% 0px' = "within one screen"). IntersectionObserver, no scroll listener.
 */
export function useInView(
  target: RefObject<Element | null>,
  initial = true,
  rootMargin?: string,
): boolean {
  const [inView, setInView] = useState(initial)

  useEffect(() => {
    const element = target.current
    if (!element) return
    // An element whose edge only touches the viewport counts as intersecting. The hero ends
    // exactly where the journey begins, so at either resting position both scenes would keep
    // rendering; shrinking the viewport by 1px makes "touching" mean "outside".
    const observer = new IntersectionObserver(([entry]) => setInView(entry.isIntersecting), {
      rootMargin: rootMargin ?? '-1px 0px',
    })
    observer.observe(element)
    return () => observer.disconnect()
  }, [target, rootMargin])

  return inView
}
