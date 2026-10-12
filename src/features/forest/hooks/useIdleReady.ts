import { useEffect, useState } from 'react'

/**
 * Becomes true once the browser is idle (or after `timeout` ms): heavy downloads start after
 * the page's first content has loaded instead of competing with it.
 */
export function useIdleReady(timeout = 2000): boolean {
  const [ready, setReady] = useState(false)
  useEffect(() => {
    if ('requestIdleCallback' in window) {
      const id = window.requestIdleCallback(() => setReady(true), { timeout })
      return () => window.cancelIdleCallback(id)
    }
    const id = setTimeout(() => setReady(true), timeout / 4)
    return () => clearTimeout(id)
  }, [timeout])
  return ready
}
