import { useEffect, useState } from 'react'

/** Debug panel: hidden by default; `?debug` in the URL shows it and the `D` key toggles it. */
export function useDebugToggle(): boolean {
  const [visible, setVisible] = useState(() =>
    new URLSearchParams(window.location.search).has('debug'),
  )

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key.toLowerCase() !== 'd' || event.metaKey || event.ctrlKey || event.altKey) return
      if (event.target instanceof HTMLElement && event.target.closest('input, textarea')) return
      setVisible((current) => !current)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  return visible
}
