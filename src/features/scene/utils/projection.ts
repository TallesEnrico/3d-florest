import type { PerspectiveCamera } from 'three'
import type { LayerConfig, MotionBudget, Size2 } from '../types/index.ts'

// Window model: the screen is the rectangle (aspect × 1) at z = 0 and the camera is the
// viewer's eye at (eyeX, eyeY, eyeDistance). See docs/engineering/scene-logic.md.

/** Size that covers the screen while keeping the art's aspect (CSS object-fit: cover). */
export function coverSize(viewAspect: number, imageAspect: number): Size2 {
  return viewAspect > imageAspect
    ? { width: viewAspect, height: viewAspect / imageAspect }
    : { width: imageAspect, height: 1 }
}

/** Scale that makes a plane at `depth` look the same size as if it were on the screen. */
export function depthScale(depth: number, eyeDistance: number): number {
  return (eyeDistance + depth) / eyeDistance
}

/** How far a plane at `depth` moves on screen per unit of eye offset (0 = screen, → 1 = infinity). */
export function parallaxFactor(depth: number, eyeDistance: number): number {
  return depth / (eyeDistance + depth)
}

/**
 * Largest eye offset per axis that keeps every layer covering the screen.
 * A layer's edge shows once its on-screen shift (eye · k) exceeds its margin.
 */
export function getMotionBudget(
  viewAspect: number,
  imageAspect: number,
  eyeDistance: number,
  layers: readonly Pick<LayerConfig, 'depth' | 'overscan' | 'edgeMargin'>[],
  safety: number,
): MotionBudget {
  const cover = coverSize(viewAspect, imageAspect)
  let x = Infinity
  let y = Infinity
  for (const { depth, overscan, edgeMargin } of layers) {
    const k = parallaxFactor(depth, eyeDistance)
    if (k <= 0) continue
    // Geometric margin: art beyond the screen edge. A measured edgeMargin (edge hidden by the
    // frame) can only extend it, e.g. when cover already crops that axis.
    const geometricX = (cover.width * overscan - viewAspect) / 2
    const geometricY = (cover.height * overscan - 1) / 2
    const marginX = Math.max(geometricX, (edgeMargin?.x ?? 0) * cover.height * overscan)
    const marginY = Math.max(geometricY, (edgeMargin?.y ?? 0) * cover.height * overscan)
    x = Math.min(x, marginX / k)
    y = Math.min(y, marginY / k)
  }
  return {
    x: Number.isFinite(x) ? Math.max(0, x * safety) : 0,
    y: Number.isFinite(y) ? Math.max(0, y * safety) : 0,
  }
}

/**
 * Off-axis (head-coupled) projection: the frustum always passes through the screen edges,
 * so the z = 0 plane stays fixed on screen and everything behind it shifts with the eye.
 */
export function applyWindowProjection(
  camera: PerspectiveCamera,
  eyeX: number,
  eyeY: number,
  eyeDistance: number,
  viewAspect: number,
): void {
  const scale = camera.near / eyeDistance
  const left = (-viewAspect / 2 - eyeX) * scale
  const right = (viewAspect / 2 - eyeX) * scale
  const top = (0.5 - eyeY) * scale
  const bottom = (-0.5 - eyeY) * scale

  camera.position.set(eyeX, eyeY, eyeDistance)
  camera.projectionMatrix.makePerspective(left, right, top, bottom, camera.near, camera.far)
  camera.projectionMatrixInverse.copy(camera.projectionMatrix).invert()
}
