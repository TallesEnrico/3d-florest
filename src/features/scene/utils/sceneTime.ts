/**
 * One time uniform (seconds) shared by every animated shader in the scene: haze, motes, glow.
 * Advanced by <SceneClock/>; frozen when the user prefers reduced motion. One scene runs at a time.
 */
export const sceneTime = { value: 0 }
