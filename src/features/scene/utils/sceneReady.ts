let ready = false
const listeners = new Set<() => void>()

/** Called once the hero scene's textures have loaded (the first screen is complete). */
export function markSceneReady() {
  if (ready) return
  ready = true
  listeners.forEach((listener) => listener())
  listeners.clear()
}

/**
 * Runs `listener` once the hero scene is ready (right away if it already is). Returns the
 * unsubscribe function, for effects.
 */
export function onSceneReady(listener: () => void): () => void {
  if (ready) {
    listener()
    return () => {}
  }
  listeners.add(listener)
  return () => listeners.delete(listener)
}
