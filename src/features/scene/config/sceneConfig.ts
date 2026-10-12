import type { SceneConfig } from '../types/index.ts'

const ENVIRONMENT = `${import.meta.env.BASE_URL}assets/environment`
// Source art size, shared by every layer (docs/art/asset-spec.md).
const ART = { width: 1672, height: 941 }

/**
 * Single place to tune the scene. Units: 1 = screen height; the screen is the plane z = 0.
 * Math and rationale: docs/engineering/scene-logic.md
 */
export const sceneConfig: SceneConfig = {
  imageSize: ART,
  imageAspect: ART.width / ART.height,

  camera: {
    // ≈ a laptop viewed from 50–60 cm. Larger = flatter perspective.
    eyeDistance: 2.5,
    near: 0.05,
    far: 200,
  },

  // Layers load as WebP (q90, exact alpha: 1.2 MB instead of 6.9 MB of PNG). The PNGs next to
  // them stay as the masters (docs/art/asset-spec.md §3).
  // Art (2026-10-12): a jungle frame with an open center, a cut-out valley (waterfalls, river,
  // misty mountains; its sky is transparent) and a golden sunset over the rainforest.
  // Depths reproduce the relative parallax of docs/art/asset-spec.md §4 (foreground anchored):
  // a layer moves depth / (eyeDistance + depth) of the eye offset → mid 0.65, bg 0.95.
  // Only the background needs overscan: the frame's opening reaches the screen edge only at the
  // top, where the midground is empty sky. See docs/engineering/scene-logic.md.
  layers: [
    {
      id: 'background',
      url: `${ENVIRONMENT}/background/background.webp`,
      depth: 50,
      overscan: 1.12,
      renderOrder: 0,
      transparent: false,
    },
    {
      id: 'midground',
      url: `${ENVIRONMENT}/midground/midground.webp`,
      depth: 4.67,
      // No overscan: stays pixel-aligned with the frame, as painted. Where the valley touches
      // the image border, the frame covers it for shifts up to 107 px sideways and 170 px up
      // (measured on the 941 px-tall art; 2 px of leaf tips at the top edge are ignored).
      overscan: 1,
      edgeMargin: { x: 100 / ART.height, y: 160 / ART.height },
      renderOrder: 2,
      transparent: true,
    },
    {
      id: 'foreground',
      url: `${ENVIRONMENT}/foreground/foreground.webp`,
      depth: 0,
      overscan: 1,
      renderOrder: 4,
      transparent: true,
    },
  ],

  haze: [
    {
      // Golden veil along the mountain ridges, between the sunset and the valley.
      id: 'far',
      depth: 12,
      overscan: 1.6,
      renderOrder: 1,
      color: '#f5dcb2',
      opacity: 0.2,
      bandCenter: 0.66,
      bandWidth: 0.16,
      speed: 0.006,
    },
    {
      // Spray and low mist over the river, between the valley and the jungle frame.
      id: 'near',
      depth: 1.6,
      overscan: 1.6,
      renderOrder: 3,
      color: '#eef0ea',
      opacity: 0.12,
      bandCenter: 0.13,
      bandWidth: 0.1,
      speed: 0.012,
    },
  ],

  motion: {
    // 0.1 → the background slides ~9.5 % of the screen height. Vertical is kept smaller on
    // purpose: horizontal parallax reads better. 16:9 geometric budget ≈ { x: 0.101, y: 0.057 }.
    maxEye: { x: 0.1, y: 0.055 },
    safety: 0.9,
    // Spring response (s): absorbs 30 Hz tracking steps, source switches and face loss.
    smoothTime: 0.22,
    reducedMotionScale: 0.5,
    // Scrolling the hero: the frame moves with the page, the valley at ~0.7× and the sky at
    // ~0.5× its speed (layer shift = eye × depth / (D + depth)).
    scrollParallax: 0.5,
  },

  idleDrift: {
    amplitude: 0.35,
    periodX: 23,
    periodY: 31,
    fadeRate: 1.5,
  },

  sunGlow: {
    // The setting sun, top right of the background.
    centerPx: { x: 1572, y: 222 },
    radius: 0.12,
    color: '#ffd8a3',
    // Additive over the brightest area of the art: keep it low so the sun never blows out.
    opacity: 0.1,
    period: 9,
  },

  motes: {
    // Warm pollen between the frame and the valley: real 3D parallax, ~0 cost.
    count: 140,
    depthMin: 0.35,
    depthMax: 4,
    size: 0.008,
    color: '#ffe3b5',
    opacity: 0.55,
    riseSpeed: 0.012,
    sway: 0.02,
  },
}
