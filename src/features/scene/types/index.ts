export type LayerId = 'background' | 'midground' | 'foreground'

/** A painted layer from public/assets/environment (docs/art/asset-spec.md). */
export interface LayerConfig {
  id: LayerId
  url: string
  /** Distance behind the screen plane, in screen heights. 0 = on the screen (the window). */
  depth: number
  /** Extra scale over the cover size so parallax never reveals the edge (asset-spec §4). */
  overscan: number
  /**
   * Measured clearance, in image heights, before this layer's edge can show through the
   * foreground frame. Extends the geometric margin in the motion budget.
   */
  edgeMargin?: { x: number; y: number }
  /** Optional breathing glow driven by an emissive mask (white = glows; none in the current art). */
  glow?: LayerGlowConfig
  /** Explicit draw order, back to front. */
  renderOrder: number
  /** Only the background is opaque. */
  transparent: boolean
}

export interface LayerGlowConfig {
  maskUrl: string
  /** Extra brightness at full pulse, as a fraction of the base color. */
  intensity: number
  /** Pulse speed in radians per second. */
  speed: number
}

/** A procedural mist band rendered between painted layers. */
export interface HazeConfig {
  id: string
  depth: number
  overscan: number
  renderOrder: number
  color: string
  /** Peak opacity at the band center. */
  opacity: number
  /** Band center and half-width in reference-image height (0 = bottom, 1 = top). */
  bandCenter: number
  bandWidth: number
  /** Horizontal drift speed of the noise, in image widths per second. */
  speed: number
}

export interface SceneConfig {
  /** Pixel size of the source art; all layers share it. */
  imageSize: Size2
  /** imageSize.width / imageSize.height */
  imageAspect: number
  camera: {
    /** Viewer distance from the screen, in screen heights. */
    eyeDistance: number
    near: number
    far: number
  }
  layers: LayerConfig[]
  haze: HazeConfig[]
  motion: {
    /**
     * Design amplitude: eye offset at full input (±1), in screen heights. Same feel on every
     * display; the geometric budget only caps it where the art would run out.
     */
    maxEye: { x: number; y: number }
    /** Uses this fraction of the geometric budget (0.9 = 10 % slack). */
    safety: number
    /** Critically damped spring response time in seconds; lower = snappier camera. */
    smoothTime: number
    /** Amplitude multiplier when the OS asks for reduced motion. */
    reducedMotionScale: number
    /**
     * Scroll parallax: eye travel (screen heights, downward) once the scene has scrolled by its
     * own height. Deeper layers lag behind the frame. Must stay ≤ ~1 so the background's top edge
     * remains above the viewport. 0 = off; always off with reduced motion.
     */
    scrollParallax: number
  }
  idleDrift: {
    /** Amplitude as a fraction of the motion budget. */
    amplitude: number
    /** Seconds per cycle on each axis; different periods trace a slow Lissajous path. */
    periodX: number
    periodY: number
    /** Rate (1/s) at which the drift fades in or out when input starts or stops. */
    fadeRate: number
  }
  sunGlow: {
    /** Sun position in the source art, in pixels (docs/art/visual-direction.md). */
    centerPx: { x: number; y: number }
    /** Glow radius as a fraction of the art height. */
    radius: number
    color: string
    opacity: number
    /** Seconds per breathing cycle. */
    period: number
  }
  activity: {
    idleAfter: number
    sleepAfter: number
    idleFps: number
  }
  motes: {
    count: number
    /** Depth range (screen heights behind the screen) where motes float. */
    depthMin: number
    depthMax: number
    /** World size of a mote at the screen plane, in screen heights. */
    size: number
    color: string
    opacity: number
    /** Upward drift in screen heights per second. */
    riseSpeed: number
    /** Horizontal sway amplitude in screen heights. */
    sway: number
  }
}

/**
 * Normalized viewer input, produced outside the scene (head tracking or mouse).
 * The scene does not know where it comes from.
 */
export interface ViewInput {
  /** −1..1; + = viewer moved to their right. */
  x: number
  /** −1..1; + = viewer moved up. */
  y: number
  /** True while a real input source is driving the view (disables the idle drift). */
  active: boolean
}

export type ViewInputReader = () => ViewInput

export type ActivityLevel = 'active' | 'idle' | 'asleep' | 'away'

/** 0 while the scene's top is at the viewport top, 1 once it has scrolled by its own height. */
export type ScrollProgressReader = () => number

export interface Size2 {
  width: number
  height: number
}

/** Maximum eye offset per axis, in screen heights. */
export interface MotionBudget {
  x: number
  y: number
}
