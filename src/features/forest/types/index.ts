export type Vec3 = [x: number, y: number, z: number]

/** Where the camera stands and looks while a chapter is centered on screen. */
export interface CameraShot {
  position: Vec3
  target: Vec3
  /**
   * How much the pointer/head parallax and the side paths may move the camera here (1 = fully,
   * 0 = locked). Lowered near and inside the cabin so the camera never meets a wall.
   */
  freedom?: number
}

export interface ForestConfig {
  /** One shot per chapter, in page order (the page passes the chapter element ids in the same order). */
  shots: CameraShot[]
  camera: {
    fov: number
    /** Vertical fov on tall portrait screens (aspect ≤ 0.5), blended in from aspect 1. */
    portraitFov: number
    near: number
    far: number
    /** Critically damped spring response in seconds (scroll → camera). */
    smoothTime: number
    /** Pointer/head parallax: camera offset at full input, in world units (0 = off). */
    lateral: { x: number; y: number }
    /** Multiplier for `lateral` when the user prefers reduced motion. */
    reducedMotionScale: number
  }
  /** Side paths: a double click (or ← →) moves the camera one path left or right. */
  paths: {
    /** Paths on each side of the center one (1 → left, center, right). */
    perSide: number
    /** Sideways distance between paths, in world units. */
    spacing: number
    /** How far the gaze turns toward the new path (target shift per path, world units). */
    gazeShift: number
  }
  /** Where trees, undergrowth, the corridor and the clearing go (seeded placement). */
  layout: ForestLayoutConfig
  /** Distances (m, from the camera) at which detail drops: near model → far model → hidden. */
  lod: {
    trees: number[]
    plants: number
    props: number
    /** Seconds a switch takes: the two levels (or the object and the haze) dissolve into each other. */
    fadeSeconds: number
  }
  /** Photoreal assets in public/assets/forest (sources and license: LICENSE.md there). */
  assets: ForestAssets
  palette: ForestPalette
  atmosphere: AtmosphereConfig
}

/** Tree models in the trees GLB: nodes `<model>_lod0` (near), `_lod1` (mid), `_lod2` (far). */
export type TreeModel = 'fir_a' | 'fir_b' | 'fir_c'

export interface TreeSpecies {
  model: TreeModel
  /** Relative frequency in the forest. */
  weight: number
  /** Scale range over the source model (the scanned firs are 14–19 m tall). */
  scale: [min: number, max: number]
}

export interface ForestLayoutConfig {
  /** Same seed → same forest on every load. */
  seed: number
  /** Area covered by the ground and the trees (camera walks from zNear toward zFar). */
  bounds: { xHalf: number; zNear: number; zFar: number }
  /**
   * Kept clear of trunks and low branches so every camera path (center ± paths, plus the
   * pointer/head parallax) walks between trees, from zNear down to `end`.
   */
  corridor: { halfWidth: number; end: number }
  /** Open, sunlit glade at the end of the walk (x, z), seen from the last chapter. */
  clearing: { center: [x: number, z: number]; radius: number }
  /**
   * River across the end of the walk: centerline at depth `z` (meandering by `meander` meters
   * over `wavelength`), water `halfWidth` wide each side, surface at `level`, bed `depth` below
   * the banks. The ground around it settles into a shallow valley.
   */
  river: { z: number; halfWidth: number; meander: number; wavelength: number; level: number; depth: number }
  /** Log cabin in the clearing at the end of the walk (front faces local +z, turned by `yaw`). */
  cabin: CabinConfig
  /** Width of the denser band of trees on each side of the corridor. */
  nearBand: number
  trees: { near: number; far: number }
  species: TreeSpecies[]
  /** Extra horizontal scale for trunks only (crowns keep their shape): old-growth girth. */
  girth: number
  undergrowth: { ferns: number; rocks: number; bankRocks: number; logs: number; stumps: number }
}

export interface CabinConfig {
  seed: number
  /** Footprint center (x, z). */
  center: [x: number, z: number]
  /** Rotation around the vertical axis, radians. */
  yaw: number
  /** Walls: width (along the front) and depth, in meters. */
  size: [width: number, depth: number]
  /** Height of the cabin floor's ground (the clearing is a level bowl), world y. */
  groundY: number
}

/** Physically based texture set: color, normal (OpenGL) and AO/roughness/metal maps. */
export interface TextureSet {
  color: string
  normal: string
  arm: string
  /** Size of one texture tile on the ground, in meters. */
  tile: number
}

export interface ForestAssets {
  trees: string
  props: string
  /** Image-based lighting (equirectangular HDR). */
  environment: string
  ground: { litter: TextureSet; trail: TextureSet }
  /** The cabin: yard props (GLB) and its photographed materials. */
  cabin: {
    props: string
    /** Furniture for the interior (stove, bed, table, oil lamp…). */
    interior: string
    logs: TextureSet
    ends: TextureSet
    planks: TextureSet
    roof: TextureSet
    gables: TextureSet
  }
}

/** Tints baked per vertex on the ground (they multiply the photographed textures). */
export interface GroundPalette {
  /** Overall tint of the litter photo (damper and darker than the dry original). */
  base: string
  /** Damp moss patches. */
  moss: string
  /** Sunlit patches. */
  sunlit: string
  /** Contact shade under the trees. */
  shade: string
}

/** Water colors (the hero's lagoon): shallow at the banks, deep in the middle. */
export interface WaterPalette {
  shallow: string
  deep: string
}

export interface ForestPalette {
  ground: GroundPalette
  water: WaterPalette
}

/** A soft beam of light: an additive gradient card, tilted like sun through the canopy. */
export interface LightShaft {
  position: Vec3
  /** Width and length in world units. */
  size: [width: number, length: number]
  /** Tilt from vertical, radians (positive leans the top to the left). */
  tilt: number
  opacity: number
}

export interface AtmosphereConfig {
  /** Exponential fog: clear up close, dissolving gradually with distance (never a hard wall). */
  fog: { color: string; density: number }
  /** Background gradient seen through gaps; `horizon` must equal the fog color. */
  sky: { top: string; horizon: string; bottom: string }
  /** Image-based light from the HDR environment (ambient light with real color and direction). */
  environment: { intensity: number }
  hemisphere: { sky: string; ground: string; intensity: number }
  /**
   * Low sun: warm key light. `direction` points from the scene toward the sun; the shadow map
   * covers `size` meters around the camera (`mapSize` texels).
   */
  sun: {
    color: string
    intensity: number
    direction: Vec3
    /** `intensity` < 1 lets part of the sun through the shade (light filtering through needles). */
    shadow: { size: number; mapSize: number; intensity: number }
  }
  /** Tone mapping exposure. */
  exposure: number
  /** Soft additive glow card: the light at the end of the walk. */
  glow: { color: string; position: Vec3; size: [width: number, height: number]; opacity: number }
  shafts: { color: string; items: LightShaft[] }
}

/** Scroll state of the whole journey, written by the scroll system and read every frame. */
export interface JourneyState {
  /** 0 when the first chapter reaches the top of the viewport, 1 when the last one leaves. */
  progress: number
  /** Continuous shot parameter: 0 = first chapter centered, 1 = second centered, … */
  shot: number
  /** Index of the chapter under the middle of the viewport. */
  chapter: number
  /** 0..1 progress through that chapter. */
  chapterProgress: number
  /** Any part of the journey is on screen. */
  inView: boolean
  /** Current side path: 0 = center, negative = left, positive = right. */
  path: number
}
