import type { ForestConfig } from '../types/index.ts'

const FOREST = `${import.meta.env.BASE_URL}assets/forest`

export const LITE_ASSETS = typeof window !== 'undefined' && window.matchMedia('(max-width: 767px), (pointer: coarse)').matches
const MODEL_SUFFIX = LITE_ASSETS ? '_lite' : ''
const TEXTURE_SIZE = LITE_ASSETS ? '512' : '1k'
const model = (name: string) => `${FOREST}/models/${name}${MODEL_SUFFIX}.glb`
const texture = (name: string) => `${FOREST}/textures/${name}_${TEXTURE_SIZE}.webp`

/** The log cabin at the end of the walk (also used to place the last two shots). */
const CABIN = { seed: 21, center: [0.6, -68.6] as [number, number], yaw: 0.45, size: [5.2, 4.4] as [number, number], groundY: -0.14 }

/**
 * A point given in the cabin's own frame (x along the front, y up from its floor's ground,
 * z out of the front door) in world coordinates. The left wall, with the side window, is −x.
 */
function cabinPoint(x: number, y: number, z: number): [number, number, number] {
  const c = Math.cos(CABIN.yaw)
  const s = Math.sin(CABIN.yaw)
  return [CABIN.center[0] + x * c + z * s, CABIN.groundY + y, CABIN.center[1] - x * s + z * c]
}
/** Center of the side (left) window, in the cabin's frame. */
const WINDOW = { x: -2.6, y: 1.4, z: 0.2 }

/**
 * Single place to tune the forest journey. Units are meters-ish; the camera walks toward −z.
 * Shot values are a first blocking pass for the architecture (one per chapter); the cinematic
 * steps will refine them. See docs/engineering/forest-journey.md.
 */
export const forestConfig: ForestConfig = {
  shots: [
    { position: [0, 1.6, 6], target: [0, 1.4, -10] }, // 1 · Manifesto: entering the forest
    { position: [0.8, 1.5, -6], target: [-0.6, 1.6, -22] }, // 2 · Como funciona
    { position: [-0.8, 1.9, -17], target: [0.4, 0.6, -30] }, // 3 · Recursos: the river ahead
    { position: [0.4, 1.5, -33], target: [0, 2.2, -49] }, // 4 · Bastidores: across the river
    { position: [-0.6, 1.7, -55], target: [0.6, 1.9, -69] }, // 5 · Experimente: the cabin in the clearing
    // 6 · Perguntas: swung round to the left wall, a few steps back, the window right of the
    //     panel (the gaze leans left) and the lamp-lit room behind it.
    {
      position: cabinPoint(WINDOW.x - 4.8, WINDOW.y + 0.15, WINDOW.z + 0.04),
      target: cabinPoint(WINDOW.x, WINDOW.y - 0.15, WINDOW.z - 1.45),
      freedom: 0.35,
    },
    // 7 · Créditos: through the window and just inside, looking along the right wall: stove,
    //     rocking chair, the table with the oil lamp. The straight line from shot 6 crosses the
    //     wall at the window's center (the opening is 1.07 × 0.76 m; paths and parallax shrink
    //     with `freedom` so the camera never grazes the frame).
    {
      position: cabinPoint(WINDOW.x + 0.6, WINDOW.y + 0.02, WINDOW.z),
      target: cabinPoint(2.4, 0.75, -1.3),
      freedom: 0.15,
    },
    {
      position: cabinPoint(3, 1.35, 8.2),
      target: cabinPoint(3.2, 0.6, 4.8),
      freedom: 0.4,
      via: [
        { position: cabinPoint(-0.8, 1.45, 1), target: cabinPoint(-0.65, 1.3, 4.5), freedom: 0.1 },
        { position: cabinPoint(-0.62, 1.45, 3.4), target: cabinPoint(2.6, 0.8, 6.6), freedom: 0.15 },
      ],
    },
  ],

  camera: {
    fov: 50,
    portraitFov: 72,
    near: 0.1,
    far: 120,
    smoothTime: 0.35,
    // Pointer (or head) parallax, like the hero: the camera shifts while keeping its gaze, so
    // near trunks move more than far ones.
    lateral: { x: 0.55, y: 0.3 },
    reducedMotionScale: 0.5,
  },

  // Double click on the left/right half (or ← →) to change path; the scroll still walks forward.
  paths: { perSide: 1, spacing: 1.6, gazeShift: 2.4 },

  layout: {
    seed: 7,
    bounds: { xHalf: 50, zNear: 18, zFar: -130 },
    // Widest camera offset: shot x (0.8) + one path (1.6) + pointer/head parallax (0.55) = 2.95.
    // The corridor (and the trail) cross the river and end at the clearing; the forest closes
    // again behind it.
    corridor: { halfWidth: 3.4, end: -63 },
    clearing: { center: [0, -66], radius: 8 },
    // Crosses the walk between chapters 3 and 4 (at x = 0 the meander puts it at z ≈ −24.5).
    river: { z: -26.9, halfWidth: 3.6, meander: 2.5, wavelength: 60, level: -0.38, depth: 1.3 },
    // At the end of the trail, in the clearing; turned to show its front and left side.
    cabin: CABIN,
    nearBand: 18,
    trees: { near: 170, far: 260 },
    // Scanned firs (18.8 / 14 / 14.4 m) scaled up into old-growth giants of 20–40 m.
    species: [
      { model: 'fir_a', weight: 0.45, scale: [1.2, 2] },
      { model: 'fir_b', weight: 0.35, scale: [1.5, 2.5] },
      { model: 'fir_c', weight: 0.2, scale: [1.4, 2.2] },
    ],
    girth: 2.4,
    undergrowth: { ferns: 1600, rocks: 80, bankRocks: 36, logs: 14, stumps: 10 },
  },

  // Tree models: near below 14 m, mid to 38 m, far to 100 m (deep in the haze), hidden beyond.
  // The near model is 4–6× heavier than the mid one: its range is the main performance knob.
  // Instead of popping, every switch (between tree models, or into the haze) dissolves over
  // 0.6 s once the camera crosses its distance.
  lod: { trees: [14, 38, 100], plants: 32, props: 55, fadeSeconds: 0.6 },

  quality: [
    { name: 'ultra', detail: 1, reach: 1, dpr: 1.25, shadowMap: 2048 },
    { name: 'high', detail: 0.8, reach: 1, dpr: 1.25, shadowMap: 2048 },
    { name: 'medium', detail: 0.6, reach: 0.85, dpr: 1, shadowMap: 1024 },
    { name: 'low', detail: 0.45, reach: 0.7, dpr: 1, shadowMap: 1024 },
    { name: 'minimum', detail: 0.35, reach: 0.55, dpr: 0.8, shadowMap: 512 },
  ],

  assets: {
    trees: model('fir_trees'),
    props: model('forest_props'),
    environment: `${FOREST}/hdri/forest_slope_${LITE_ASSETS ? '512' : '1k'}.hdr`,
    ground: {
      litter: {
        color: texture('forest_leaves_04_diff'),
        normal: texture('forest_leaves_04_nor_gl'),
        arm: texture('forest_leaves_04_arm'),
        tile: 2.2,
      },
      trail: {
        color: texture('forest_ground_04_diff'),
        normal: texture('forest_ground_04_nor_gl'),
        arm: texture('forest_ground_04_arm'),
        tile: 2.5,
      },
    },
    cabin: {
      props: model('cabin_props'),
      interior: model('cabin_interior'),
      logs: {
        color: texture('rough_wood_diff'),
        normal: texture('rough_wood_nor_gl'),
        arm: texture('rough_wood_arm'),
        tile: 1.4,
      },
      ends: {
        color: texture('tree_end_001_diff'),
        normal: texture('tree_end_001_nor_gl'),
        arm: texture('tree_end_001_arm'),
        tile: 1,
      },
      planks: {
        color: texture('weathered_planks_diff'),
        normal: texture('weathered_planks_nor_gl'),
        arm: texture('weathered_planks_arm'),
        tile: 1.2,
      },
      roof: {
        color: texture('wood_shingles_010_diff'),
        normal: texture('wood_shingles_010_nor_gl'),
        arm: texture('wood_shingles_010_arm'),
        tile: 1.3,
      },
      gables: {
        color: texture('wood_shingles_011_diff'),
        normal: texture('wood_shingles_011_nor_gl'),
        arm: texture('wood_shingles_011_arm'),
        tile: 1.1,
      },
    },
  },

  // Ground tints multiply the photographed litter (white = texture as is).
  palette: {
    ground: { base: '#b9ab9a', moss: '#5e8c3a', sunlit: '#f7e6cf', shade: '#3b3022' },
    // A forest river with a hint of the hero's lagoon: deep teal in the middle, muted green-teal
    // at the edges (where it turns clear and shows the wet bed).
    water: { shallow: '#5f8f86', deep: '#163f46' },
  },

  atmosphere: {
    // The hero's light (docs/art/visual-direction.md §6, measured on its sky): peach-rose haze
    // like the mist between the islands, a blue-to-peach sky in the gaps of the canopy, a cream
    // sun core. Clear up close, luminous in the distance. Image-based light from a sunny HDRI.
    fog: { color: '#ecd2c4', density: 0.014 },
    sky: { top: '#a9b9e3', horizon: '#ecd2c4', bottom: '#a99aa6' },
    environment: { intensity: 0.85 },
    // Soft fill: lavender from the sky into the shade (Lavender Mist), moss from the ground.
    hemisphere: { sky: '#c9b6e4', ground: '#6b5f45', intensity: 0.4 },
    // High sun ahead: light falls down the opening over the trail, bright backlight on the trunks
    // and haze. The hero's Sun Core: cream, barely yellow. The shade lets 15% of the sun through (light
    // filtering through the needles). One shadow map that follows the camera; see SunLight.
    sun: { color: '#fff3d4', intensity: 6.5, direction: [-0.25, 0.72, -0.65], shadow: { size: 110, mapSize: 2048, intensity: 0.85 } },
    exposure: 1.15,
    // Bright light at the end of the trail, behind the clearing (seen down the corridor).
    glow: { color: '#f6c9a8', position: [0, 7, -86], size: [30, 20], opacity: 0.16 },
    shafts: {
      color: '#fdf3d0',
      items: [
        { position: [-4, 8, -16], size: [2.2, 22], tilt: 0.35, opacity: 0.1 },
        { position: [5.5, 8.5, -27], size: [3, 24], tilt: 0.35, opacity: 0.1 },
        { position: [-6.5, 9, -38], size: [2.6, 24], tilt: 0.3, opacity: 0.09 },
        { position: [3, 9, -50], size: [3.2, 26], tilt: 0.35, opacity: 0.1 },
        // The clearing: the light at the end of the walk.
        { position: [-6, 9, -64], size: [6, 26], tilt: 0.3, opacity: 0.12 },
        { position: [-4.5, 9.5, -69], size: [4, 26], tilt: 0.3, opacity: 0.1 },
      ],
    },
  },
}
