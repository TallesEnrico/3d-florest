import type { Camera, Material, Object3D, Scene, Texture, WebGLRenderer } from 'three'
import { yieldToMain } from '../models/yieldToMain.ts'

/**
 * Pays the GPU's one-time costs while the forest is still out of sight (the canvas is paused
 * until the journey scrolls into view). Without this, the first visible frame uploaded every
 * texture, finished linking every shader and built the shadow map at once: a ~1 s freeze right
 * as the visitor scrolled from the hero into the forest.
 *
 * 1. Upload textures one at a time, yielding between them (input and painting keep flowing).
 * 2. Compile all programs in parallel (KHR_parallel_shader_compile where supported).
 * 3. Run the real first frames hidden (`advance`: every useFrame — camera on its shot, levels
 *    of detail assigned, the sun's shadow map drawn where it belongs — then the render): links
 *    the programs, compiles the shadow-pass variants and fills every buffer, so the first
 *    visible frame is an ordinary one.
 */
export async function warmUpForest(
  gl: WebGLRenderer,
  scene: Scene,
  camera: Camera,
  root: Object3D,
  advance: (timestamp: number) => void,
  cancelled: () => boolean,
): Promise<void> {
  const textures = new Set<Texture>()
  root.traverse((object) => {
    const material = (object as { material?: Material | Material[] }).material
    for (const m of material ? (Array.isArray(material) ? material : [material]) : []) {
      for (const value of Object.values(m)) if ((value as Texture | null)?.isTexture) textures.add(value as Texture)
    }
  })
  for (const texture of textures) {
    if (cancelled()) return
    gl.initTexture(texture)
    await yieldToMain()
  }
  if (cancelled()) return
  await gl.compileAsync(scene, camera)
  for (let frame = 0; frame < 2; frame++) {
    await yieldToMain()
    if (cancelled()) return
    advance(performance.now())
  }
}
