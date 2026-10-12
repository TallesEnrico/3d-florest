import { useEffect, useRef, useState, type RefObject } from 'react'

/**
 * Whether the page has scrolled past a 1 px sentinel (render the returned ref on an element
 * absolutely positioned at the threshold). IntersectionObserver instead of a scroll listener.
 */
export function useScrolledPast(): [RefObject<HTMLDivElement | null>, boolean] {
  const sentinel = useRef<HTMLDivElement | null>(null)
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const element = sentinel.current
    if (!element) return
    const observer = new IntersectionObserver(([entry]) => setScrolled(!entry.isIntersecting))
    observer.observe(element)
    return () => observer.disconnect()
  }, [])

  return [sentinel, scrolled]
}
