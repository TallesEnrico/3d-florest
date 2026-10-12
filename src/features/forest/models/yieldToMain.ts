/**
 * Lets the browser paint and handle input before the next chunk of heavy work (building the
 * forest, uploading textures): `scheduler.yield()` where available, else a macrotask.
 */
export function yieldToMain(): Promise<void> {
  const scheduler = (globalThis as { scheduler?: { yield?: () => Promise<void> } }).scheduler
  if (scheduler?.yield) return scheduler.yield()
  return new Promise((resolve) => setTimeout(resolve, 0))
}
