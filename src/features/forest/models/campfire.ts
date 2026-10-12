import {
  AdditiveBlending,
  BufferGeometry,
  CircleGeometry,
  Color,
  CylinderGeometry,
  DataTexture,
  Float32BufferAttribute,
  Group,
  LinearFilter,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  NormalBlending,
  Points,
  PointsMaterial,
  RGBAFormat,
  Sprite,
  SpriteMaterial,
  UnsignedByteType,
} from 'three'
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js'
import { between, createRng } from '../procedural/random.ts'

/** Builds a small RGBA texture from a per-pixel function (no DOM, no image file). */
function dataTexture(size: number, pixel: (u: number, v: number) => [number, number, number, number]) {
  const data = new Uint8Array(size * size * 4)
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const [r, g, b, a] = pixel((x + 0.5) / size, (y + 0.5) / size)
      const i = (y * size + x) * 4
      data[i] = Math.round(Math.min(1, Math.max(0, r)) * 255)
      data[i + 1] = Math.round(Math.min(1, Math.max(0, g)) * 255)
      data[i + 2] = Math.round(Math.min(1, Math.max(0, b)) * 255)
      data[i + 3] = Math.round(Math.min(1, Math.max(0, a)) * 255)
    }
  }
  const texture = new DataTexture(data, size, size, RGBAFormat, UnsignedByteType)
  texture.magFilter = LinearFilter
  texture.minFilter = LinearFilter
  texture.needsUpdate = true
  return texture
}

/** A tongue of flame: wide and hot at the base, narrowing to a tip; white-yellow core, orange rim. */
const flameTexture = () =>
  dataTexture(64, (u, v) => {
    const halfWidth = 0.36 * Math.pow(1 - v, 0.75) + 0.01
    const d = Math.abs(u - 0.5) / halfWidth
    const body = Math.max(0, 1 - d * d) * Math.min(1, v / 0.12) * Math.pow(1 - v, 0.35)
    const core = Math.max(0, 1 - d * 1.6) * Math.pow(1 - v, 1.4)
    return [1, 0.42 + 0.5 * core, 0.12 + 0.55 * core * core, body]
  })

/** Soft round puff for smoke. */
const puffTexture = () =>
  dataTexture(32, (u, v) => {
    const d = Math.hypot(u - 0.5, v - 0.5) / 0.5
    const a = Math.max(0, 1 - d * d)
    return [1, 1, 1, a * a]
  })

interface Flame {
  sprite: Sprite
  baseX: number
  baseZ: number
  width: number
  height: number
  phase: number
  speed: number
}

export interface Campfire {
  group: Group
  /** Animates flames, sparks, smoke and the glow (`elapsed` seconds). */
  update: (elapsed: number) => void
  /** 0 = unlit and hidden … 1 = burning. */
  setStrength: (strength: number) => void
  dispose: () => void
}

/**
 * A campfire for the stone fire pit: crossed logs with charred ends, a glowing ember bed,
 * layered additive flame sprites that flicker, sparks rising from it, a faint smoke column and
 * a warm pool of light on the ground around the pit. No real light: a point light would add
 * its cost to every pixel of the forest; the glow is an additive card that flickers instead.
 * Cheap: a handful of draw calls, no custom shader.
 */
export function createCampfire(seed: number, woodTexture: MeshStandardMaterial['map']): Campfire {
  const rng = createRng(seed)
  const group = new Group()
  group.name = 'campfire'

  // Firewood: five logs leaning into a loose teepee.
  const wood: BufferGeometry[] = []
  for (let i = 0; i < 5; i++) {
    const log = new CylinderGeometry(0.05, 0.06, 0.62, 8)
    log.rotateZ(Math.PI / 2 - 0.55)
    log.translate(0.16, 0.12, 0)
    log.rotateY((i / 5) * Math.PI * 2 + between(rng, -0.25, 0.25))
    wood.push(log)
  }
  const woodMaterial = new MeshStandardMaterial({ map: woodTexture ?? null, color: new Color('#3b3129'), roughness: 0.95 })
  const charMaterial = new MeshStandardMaterial({ color: '#120e0c', roughness: 1, emissive: new Color('#ff5a1a'), emissiveIntensity: 0.25 })
  const logs = new Mesh(mergeGeometries(wood), woodMaterial)
  // The burning inner ends: a small dark, faintly glowing cone where the logs meet.
  const core = new Mesh(new CylinderGeometry(0.04, 0.16, 0.18, 10), charMaterial)
  core.position.y = 0.1
  // Ember bed.
  const emberTexture = dataTexture(64, (u, v) => {
    const d = Math.hypot(u - 0.5, v - 0.5) / 0.5
    const grain = 0.6 + 0.4 * Math.sin(u * 47.3 + v * 31.1) * Math.sin(u * 19.7 - v * 53.9)
    const heat = Math.max(0, 1 - d) * grain
    return [0.15 + heat, 0.06 + heat * 0.45, 0.03 + heat * 0.1, 1]
  })
  const embersMaterial = new MeshStandardMaterial({ color: '#1a120d', roughness: 1, emissive: new Color('#ffffff'), emissiveMap: emberTexture, emissiveIntensity: 1.6 })
  const bed = new Mesh(new CircleGeometry(0.34, 24), embersMaterial)
  bed.rotation.x = -Math.PI / 2
  bed.position.y = 0.04
  for (const mesh of [logs, core]) {
    mesh.castShadow = true
    mesh.receiveShadow = true
  }
  group.add(logs, core, bed)

  // Flames: a few big outer tongues and smaller, brighter inner ones.
  const flameMap = flameTexture()
  const flames: Flame[] = []
  const flameMaterial = (color: string) =>
    new SpriteMaterial({ map: flameMap, color, blending: AdditiveBlending, transparent: true, depthWrite: false, fog: false, toneMapped: false })
  const outerMaterial = flameMaterial('#ff7a2a')
  const innerMaterial = flameMaterial('#ffd27a')
  for (let i = 0; i < 9; i++) {
    const inner = i >= 5
    const angle = rng() * Math.PI * 2
    const radius = inner ? between(rng, 0, 0.06) : between(rng, 0.04, 0.14)
    const sprite = new Sprite(inner ? innerMaterial : outerMaterial)
    sprite.center.set(0.5, 0)
    sprite.renderOrder = 2
    group.add(sprite)
    flames.push({
      sprite,
      baseX: Math.cos(angle) * radius,
      baseZ: Math.sin(angle) * radius,
      width: inner ? between(rng, 0.18, 0.26) : between(rng, 0.3, 0.42),
      height: inner ? between(rng, 0.42, 0.6) : between(rng, 0.65, 0.95),
      phase: rng() * 100,
      speed: between(rng, 7, 11),
    })
  }

  // Sparks: points rising and drifting, fading as they cool (additive: darker = fainter).
  const SPARKS = 28
  const sparkPositions = new Float32Array(SPARKS * 3)
  const sparkColors = new Float32Array(SPARKS * 3)
  const sparkSeeds = Array.from({ length: SPARKS }, () => ({ phase: rng(), speed: between(rng, 0.5, 0.9), drift: between(rng, -0.25, 0.25), angle: rng() * Math.PI * 2 }))
  const sparkGeometry = new BufferGeometry()
  sparkGeometry.setAttribute('position', new Float32BufferAttribute(sparkPositions, 3))
  sparkGeometry.setAttribute('color', new Float32BufferAttribute(sparkColors, 3))
  const sparkMaterial = new PointsMaterial({ size: 0.035, vertexColors: true, blending: AdditiveBlending, transparent: true, depthWrite: false, fog: false, toneMapped: false })
  const sparks = new Points(sparkGeometry, sparkMaterial)
  sparks.frustumCulled = false
  group.add(sparks)

  // Smoke: a few soft puffs rising, widening and thinning out.
  const puffMap = puffTexture()
  const smoke = Array.from({ length: 6 }, (_, i) => {
    const sprite = new Sprite(new SpriteMaterial({ map: puffMap, color: '#9a948c', blending: NormalBlending, transparent: true, depthWrite: false, opacity: 0 }))
    sprite.renderOrder = 1
    group.add(sprite)
    return { sprite, phase: i / 6 }
  })

  // Firelight on the ground: an additive warm disc that fades out over ~3 m and flickers.
  const poolTexture = dataTexture(64, (u, v) => {
    const d = Math.hypot(u - 0.5, v - 0.5) / 0.5
    const a = Math.max(0, 1 - d) ** 2.2
    return [a, a, a, 1]
  })
  const poolMaterial = new MeshBasicMaterial({ map: poolTexture, color: '#ff8a3c', blending: AdditiveBlending, transparent: true, depthWrite: false, toneMapped: false, fog: false })
  const pool = new Mesh(new CircleGeometry(3.2, 32), poolMaterial)
  pool.rotation.x = -Math.PI / 2
  pool.position.y = 0.06
  pool.renderOrder = 1
  group.add(pool)
  const POOL_OPACITY = 0.55

  let strength = 1
  const update = (t: number) => {
    if (strength <= 0) return
    for (const f of flames) {
      const flicker = 0.75 + 0.15 * Math.sin(t * f.speed + f.phase) + 0.1 * Math.sin(t * f.speed * 2.3 + f.phase * 1.7)
      f.sprite.scale.set(f.width * (0.85 + 0.15 * Math.sin(t * 5.3 + f.phase)) * strength, f.height * flicker * strength, 1)
      f.sprite.position.set(f.baseX + 0.03 * Math.sin(t * 3.1 + f.phase), 0.06, f.baseZ + 0.03 * Math.cos(t * 2.7 + f.phase))
    }
    sparkSeeds.forEach((s, i) => {
      const life = (t * s.speed * 0.5 + s.phase) % 1
      const height = 0.2 + life * 1.8
      sparkPositions[i * 3] = Math.cos(s.angle) * 0.08 + s.drift * life + 0.05 * Math.sin(t * 2 + s.phase * 9)
      sparkPositions[i * 3 + 1] = height
      sparkPositions[i * 3 + 2] = Math.sin(s.angle) * 0.08 + 0.05 * Math.cos(t * 1.7 + s.phase * 7)
      const glow = (1 - life) * (1 - life) * strength
      sparkColors[i * 3] = glow
      sparkColors[i * 3 + 1] = glow * 0.55
      sparkColors[i * 3 + 2] = glow * 0.15
    })
    sparkGeometry.getAttribute('position').needsUpdate = true
    sparkGeometry.getAttribute('color').needsUpdate = true
    for (const puff of smoke) {
      const life = (t * 0.12 + puff.phase) % 1
      puff.sprite.position.set(0.15 * Math.sin(t * 0.4 + puff.phase * 6) + life * 0.35, 0.9 + life * 3.2, 0.1 * Math.cos(t * 0.3 + puff.phase * 5))
      const size = 0.5 + life * 1.8
      puff.sprite.scale.set(size, size, 1)
      puff.sprite.material.opacity = Math.sin(Math.PI * life) * 0.22 * strength
    }
    poolMaterial.opacity = POOL_OPACITY * strength * (0.82 + 0.12 * Math.sin(t * 9.1) + 0.06 * Math.sin(t * 23.7))
  }

  return {
    group,
    update,
    setStrength: (value) => {
      strength = Math.min(1, Math.max(0, value))
      for (const child of group.children) child.visible = strength > 0
      poolMaterial.opacity = POOL_OPACITY * strength
    },
    dispose: () => {
      logs.geometry.dispose()
      core.geometry.dispose()
      bed.geometry.dispose()
      sparkGeometry.dispose()
      pool.geometry.dispose()
      for (const material of [woodMaterial, charMaterial, embersMaterial, outerMaterial, innerMaterial, sparkMaterial, poolMaterial, ...smoke.map((p) => p.sprite.material)]) material.dispose()
      for (const texture of [flameMap, puffMap, emberTexture, poolTexture]) texture.dispose()
    },
  }
}
