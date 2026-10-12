import type { Material } from 'three'

/**
 * Per-instance dissolve for batched meshes, read from the alpha of the instance color
 * (BatchedMesh keeps an RGBA color per instance). The surface stays opaque: pixels are
 * discarded in a fine screen-space pattern instead of blended, so there is no transparency
 * sorting and no blending cost. Encoding of the instance alpha `a`:
 *
 * - `a >= 1`        fully drawn (no discard at all for that instance's pixels);
 * - `0 <= a < 1`    keeps the pixels whose noise is below `a` (fading out as `a` → 0);
 * - `-2 <= a < -1`  keeps the complementary pixels, those with noise ≥ `-a - 1`.
 *
 * Two levels of detail drawn with `a = f` and `a = -(1 + f)` cover complementary pixels, so
 * one dissolves into the other without doubling up.
 */
export const FADE_FULL = 1

/** Alpha for the incoming level: the pixels the outgoing one (drawn with `keep`) leaves free. */
export const fadeInComplement = (outgoingKeep: number) => -(1 + outgoingKeep)

const VERTEX_DECLARATION = 'varying float vDitherFade;'
const VERTEX_CAPTURE = /* glsl */ `
#ifdef USE_BATCHING_COLOR
  vDitherFade = vColor.a;
  vColor.a = 1.0;
#else
  vDitherFade = 1.0;
#endif`
const FRAGMENT_DECLARATION = /* glsl */ `
varying float vDitherFade;
// Interleaved gradient noise: a fine, even pattern without visible tiling.
float ditherNoise(vec2 p) { return fract(52.9829189 * fract(dot(p, vec2(0.06711056, 0.00583715)))); }`
const FRAGMENT_DISCARD = /* glsl */ `
if (vDitherFade < 0.999) {
  float n = ditherNoise(gl_FragCoord.xy);
  if (vDitherFade >= 0.0 ? n >= vDitherFade : n < -vDitherFade - 1.0) discard;
}`

/** Adds the dissolve to a (shared) material once; it only acts on batched instances. */
export function enableDitherFade(material: Material): void {
  if (material.userData.ditherFade) return
  material.userData.ditherFade = true
  const previousCompile = material.onBeforeCompile.bind(material)
  material.onBeforeCompile = (shader, renderer) => {
    previousCompile(shader, renderer)
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', `#include <common>\n${VERTEX_DECLARATION}`)
      .replace('#include <color_vertex>', `#include <color_vertex>\n${VERTEX_CAPTURE}`)
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', `#include <common>\n${FRAGMENT_DECLARATION}`)
      .replace('#include <clipping_planes_fragment>', `#include <clipping_planes_fragment>\n${FRAGMENT_DISCARD}`)
  }
  const previousKey = material.customProgramCacheKey.bind(material)
  material.customProgramCacheKey = () => `${previousKey()}|dither-fade`
  material.needsUpdate = true
}
