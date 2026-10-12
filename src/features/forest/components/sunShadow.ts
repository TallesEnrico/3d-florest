/**
 * The forest doesn't move, so the sun's shadow map is static: drawn once, covering the whole
 * walk, and redrawn only if something changes (call `invalidateSunShadow()`: new content, new
 * resolution). Redrawing it while scrolling was one of the largest costs of the scene.
 *
 * While the map is drawn, `prepare` / `restore` (set by the forest) put every tree at a fixed,
 * mid level of detail: the map must not depend on where the camera happened to be (far trees
 * would be missing or crude).
 */
export const sunShadow: { dirty: boolean; prepare: (() => void) | null; restore: (() => void) | null } = {
  dirty: true,
  prepare: null,
  restore: null,
}

export function invalidateSunShadow(): void {
  sunShadow.dirty = true
}
