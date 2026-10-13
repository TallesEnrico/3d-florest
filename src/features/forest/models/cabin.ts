import {
  AdditiveBlending,
  BoxGeometry,
  BufferGeometry,
  CircleGeometry,
  Color,
  CylinderGeometry,
  Float32BufferAttribute,
  FrontSide,
  Group,
  type Material,
  Matrix4,
  Mesh,
  MeshStandardMaterial,
  type Object3D,
  PlaneGeometry,
  Quaternion,
  RepeatWrapping,
  SRGBColorSpace,
  Vector3,
} from 'three'
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js'
import { invalidateSunShadow } from '../components/sunShadow.ts'
import { between, createNoise2D, createRng } from '../procedural/random.ts'
import type { CabinConfig } from '../types/index.ts'
import type { LoadedTextureSet } from './buildRealisticForest.ts'
import { createCampfire } from './campfire.ts'

export interface CabinTextures {
  logs: LoadedTextureSet
  ends: LoadedTextureSet
  planks: LoadedTextureSet
  roof: LoadedTextureSet
  gables: LoadedTextureSet
}

export interface Cabin {
  group: Group
  /**
   * Per frame: the campfire and the oil lamp flicker, and the campfire shows only as much as the
   * air lets it (camera distance).
   */
  update: (elapsed: number, camera: Vector3) => void
  dispose: () => void
}

const LOG_RADIUS = 0.15
/** Vertical spacing of the logs: less than their diameter, they sit notched into each other. */
const LOG_SPACING = 0.26
const LOG_ROWS = 9
/** How far the logs run past the corners (saddle-notched corners). */
const CORNER = 0.32
const PITCH = (38 * Math.PI) / 180
const DOOR = { x: -0.7, width: 0.95, height: 1.95, open: -1.83 }
const FRONT_WINDOW = { x: 1.25, width: 1, bottom: 0.95, top: 1.85 }
const SIDE_WINDOW = { z: 0.2, width: 1.1, bottom: 0.95, top: 1.8 }
/**
 * Atmospheric perspective for the cabin: on top of the scene's fog it is veiled by the same air
 * color while far, and comes out of it as the camera approaches. Not there at all from
 * REVEAL_FAR meters (the first chapter is ~75 m away), completely revealed by REVEAL_NEAR (the
 * river bank, chapter 3, is ~52 m away): from the river on it only has the scene fog, like the
 * trees by it.
 */
const REVEAL_NEAR = 55
const REVEAL_FAR = 73
const veil = (distance: number) => {
  const t = Math.min(1, Math.max(0, (distance - REVEAL_NEAR) / (REVEAL_FAR - REVEAL_NEAR)))
  return t * t * (3 - 2 * t)
}
/** Above this veil the cabin also thins out of existence (fully gone at REVEAL_FAR). */
const CONDENSE = 0.85

function prepare(set: LoadedTextureSet) {
  set.color.colorSpace = SRGBColorSpace
  for (const texture of [set.color, set.normal, set.arm]) {
    texture.wrapS = texture.wrapT = RepeatWrapping
    texture.anisotropy = 8
    texture.needsUpdate = true
  }
}

function pbr(set: LoadedTextureSet, extra: Partial<MeshStandardMaterial> = {}) {
  return new MeshStandardMaterial({ map: set.color, normalMap: set.normal, aoMap: set.arm, roughnessMap: set.arm, metalness: 0, ...extra })
}

/** Rescales a geometry's UVs so its texture tiles every `tile` meters (sizes in meters). */
function tileUv(geometry: BufferGeometry, uMeters: number, vMeters: number, tile: number) {
  const uv = geometry.getAttribute('uv')
  for (let i = 0; i < uv.count; i++) uv.setXY(i, (uv.getX(i) * uMeters) / tile, (uv.getY(i) * vMeters) / tile)
  return geometry
}

/** Bakes a tint per vertex (vertex color): variation between pieces, contact shade, moss. */
function finish(geometry: BufferGeometry, tint: (x: number, y: number, z: number, ny: number) => [number, number, number]) {
  const position = geometry.getAttribute('position')
  const normal = geometry.getAttribute('normal')
  const colors = new Float32Array(position.count * 3)
  for (let i = 0; i < position.count; i++) colors.set(tint(position.getX(i), position.getY(i), position.getZ(i), normal.getY(i)), i * 3)
  geometry.setAttribute('color', new Float32BufferAttribute(colors, 3))
  return geometry
}
const plain = (): [number, number, number] => [1, 1, 1]

/** Triangle (gable) in the XY plane, base from -half to +half at y = 0, apex at (0, height). */
function triangle(half: number, height: number, tile: number) {
  const geometry = new BufferGeometry()
  geometry.setAttribute('position', new Float32BufferAttribute([-half, 0, 0, half, 0, 0, 0, height, 0], 3))
  geometry.setAttribute('uv', new Float32BufferAttribute([-half / tile, 0, half / tile, 0, 0, height / tile], 2))
  geometry.setIndex([0, 1, 2])
  geometry.computeVertexNormals()
  return geometry
}

/** Uniforms shared by every material of the cabin (see enableCabinShading). */
interface CabinUniforms {
  [name: string]: { value: unknown }
  /** World → cabin frame. */
  uCabinInverse: { value: Matrix4 }
  /** Room box: half width, half depth, ridge height, tan(roof pitch). */
  uRoom: { value: [number, number, number, number] }
  /** World positions of the soft lights inside: oil lamp, side window, front window. */
  uLights: { value: Vector3[] }
  uLightColors: { value: Color[] }
  uLightRadius: { value: number[] }
}

/**
 * Cabin materials (walls, roof, floor, furniture, yard props):
 * - the distance veil over the scene fog (atmospheric perspective; same fog color);
 * - indoors (inside the walls and under the roof), the sky and environment light drops to a
 *   fifth: the room is lit by what comes through the windows and by the oil lamp — soft warm
 *   and daylight glows added as emission, with no real lights (those would cost every pixel of
 *   the forest).
 */
function enableCabinShading(material: Material, uniforms: CabinUniforms) {
  if (material.userData.cabinShading) return
  material.userData.cabinShading = true
  material.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms)
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nuniform mat4 uCabinInverse;\nvarying vec3 vCabinLocal;')
      .replace(
        '#include <project_vertex>',
        '#include <project_vertex>\nvCabinLocal = (uCabinInverse * modelMatrix * vec4(transformed, 1.0)).xyz;',
      )
    shader.fragmentShader = shader.fragmentShader
      .replace(
        '#include <common>',
        `#include <common>
        uniform vec4 uRoom;
        uniform vec3 uLights[3];
        uniform vec3 uLightColors[3];
        uniform float uLightRadius[3];
        varying vec3 vCabinLocal;
        float cabinIndoor() {
          vec3 p = vCabinLocal;
          float roof = uRoom.z - abs(p.x) * uRoom.w;
          return step(abs(p.x), uRoom.x) * step(abs(p.z), uRoom.y) * step(p.y, roof - 0.03);
        }`,
      )
      .replace(
        '#include <emissivemap_fragment>',
        `#include <emissivemap_fragment>
        if (cabinIndoor() > 0.0) {
          for (int i = 0; i < 3; i++) {
            vec3 toLight = (viewMatrix * vec4(uLights[i], 1.0)).xyz + vViewPosition;
            float d = length(toLight);
            float falloff = exp(-d * d / (uLightRadius[i] * uLightRadius[i]));
            float facing = 0.3 + 0.7 * max(0.0, dot(normal, toLight / max(d, 1e-3)));
            totalEmissiveRadiance += uLightColors[i] * diffuseColor.rgb * falloff * facing;
          }
        }`,
      )
      .replace(
        '#include <lights_fragment_end>',
        `{
          float indoor = cabinIndoor();
          irradiance *= mix(1.0, 0.2, indoor);
          #if defined( RE_IndirectSpecular )
            iblIrradiance *= mix(1.0, 0.2, indoor);
            radiance *= mix(1.0, 0.3, indoor);
          #endif
        }
        #include <lights_fragment_end>`,
      )
      .replace(
      '#include <fog_fragment>',
      `#ifdef USE_FOG
        // The scene's exponential fog, then the extra veil while the cabin is still far.
        float sceneFog = 1.0 - exp(-fogDensity * fogDensity * vFogDepth * vFogDepth);
        float veil = smoothstep(${REVEAL_NEAR.toFixed(1)}, ${REVEAL_FAR.toFixed(1)}, vFogDepth);
        // At the far end, already almost the color of the air, it condenses out of the mist
        // (fine screen-space pattern, imperceptible at that contrast) instead of popping in.
        if (veil > ${CONDENSE.toFixed(2)}) {
          float n = fract(52.9829189 * fract(dot(gl_FragCoord.xy, vec2(0.06711056, 0.00583715))));
          if (n < (veil - ${CONDENSE.toFixed(2)}) / ${(1 - CONDENSE).toFixed(2)}) discard;
        }
        gl_FragColor.rgb = mix(gl_FragColor.rgb, fogColor, sceneFog + (1.0 - sceneFog) * veil);
      #endif`,
    )
  }
  material.customProgramCacheKey = () => 'cabin-shading'
  material.needsUpdate = true
}

/**
 * A small log cabin built from photographed CC0 materials (debarked logs, end grain, weathered
 * planks, wood-shingle roof and gables): stacked logs notched at the corners, each log tinted a
 * little differently and darker underneath; a door, open windows, barge boards, a ridge log and a
 * stovepipe. Front faces local +z. Scanned props (fire pit with a burning campfire, lantern, axe,
 * bucket, crate, stool, a chopping stump) dress the yard. Inside: a plank floor, a board-lined
 * roof with tie beams, and scanned furniture lit by an oil lamp and the windows.
 * It is always whole: veiled by the air far away, fully revealed by the time you reach the river.
 */
export function buildCabin(
  config: CabinConfig,
  textures: CabinTextures,
  props: Object3D,
  /** Furniture: stove, pot, day bed, pillows, table, oil lamp, bookshelf, rocking chair. */
  interior: Object3D,
  stump: Object3D | null,
  groundY: number,
  /** The scene's FogExp2 density (the glowing fire, which ignores fog, fades with it). */
  fogDensity: number,
): Cabin {
  Object.values(textures).forEach(prepare)
  const rng = createRng(config.seed)
  const [width, depth] = config.size
  const halfW = width / 2
  const halfD = depth / 2
  const wallTop = LOG_RADIUS + (LOG_ROWS - 0.5) * LOG_SPACING

  const materials = {
    // Weathered, silver-brown logs; the variation and contact shade come from vertex colors.
    logs: pbr(textures.logs, { color: new Color('#cdbfae'), vertexColors: true }),
    ends: pbr(textures.ends, { color: new Color('#a08b72'), vertexColors: true }),
    planks: pbr(textures.planks, { color: new Color('#c9b8a3'), vertexColors: true }),
    roof: pbr(textures.roof, { vertexColors: true }),
    gables: pbr(textures.gables, { color: new Color('#d8cbb8'), vertexColors: true }),
    metal: new MeshStandardMaterial({ color: '#2a2724', roughness: 0.55, metalness: 0.7, vertexColors: true }),
  }

  const parts: Record<'logs' | 'ends' | 'planks' | 'roof' | 'gables' | 'metal', BufferGeometry[]> = {
    logs: [],
    ends: [],
    planks: [],
    roof: [],
    gables: [],
    metal: [],
  }
  const matrix = new Matrix4()
  const rotation = new Quaternion()

  /** A log along x (front/back) or z (sides) from a to b, centered at (x|z, y). */
  const log = (axis: 'x' | 'z', from: number, to: number, y: number, at: number) => {
    const length = to - from
    if (length < 0.15) return
    const radius = LOG_RADIUS * between(rng, 0.92, 1.08)
    // Each log weathered a little differently: lighter/darker, warmer/greyer.
    const shade = between(rng, 0.82, 1.06)
    const warmth = between(rng, -0.05, 0.05)
    const logTint = (_x: number, _y: number, _z: number, ny: number): [number, number, number] => {
      // Contact shade: the underside (and the gap below each log) darker, the top catching light.
      const contact = 0.62 + 0.38 * Math.min(1, Math.max(0, ny * 0.5 + 0.6))
      const v = shade * contact
      return [v * (1 + warmth), v, v * (1 - warmth * 1.4)]
    }
    const side = new CylinderGeometry(radius, radius * between(rng, 0.94, 1), length, 14, 1, true)
    side.rotateY(rng() * Math.PI * 2) // vary the texture between logs
    tileUv(side, Math.PI * 2 * radius, length, 1.4)
    const center = (from + to) / 2
    if (axis === 'x') matrix.compose(new Vector3(center, y, at), rotation.setFromAxisAngle(new Vector3(0, 0, 1), Math.PI / 2), new Vector3(1, 1, 1))
    else matrix.compose(new Vector3(at, y, center), rotation.setFromAxisAngle(new Vector3(1, 0, 0), Math.PI / 2), new Vector3(1, 1, 1))
    side.applyMatrix4(matrix)
    parts.logs.push(finish(side, logTint))
    // End grain on both ends: outer ends past the corners and cut ends at the openings.
    ;[0, 1].forEach((i) => {
      const disc = new CircleGeometry(radius * 0.98, 14)
      // Sample the middle of the end-grain photo so the rings fill the disc.
      const uv = disc.getAttribute('uv')
      for (let k = 0; k < uv.count; k++) uv.setXY(k, 0.5 + (uv.getX(k) - 0.5) * 0.8, 0.5 + (uv.getY(k) - 0.5) * 0.8)
      const sign = i === 0 ? -1 : 1
      const end = i === 0 ? from : to
      const facing = axis === 'x' ? new Vector3(sign, 0, 0) : new Vector3(0, 0, sign)
      rotation.setFromUnitVectors(new Vector3(0, 0, 1), facing)
      const position = axis === 'x' ? new Vector3(end, y, at) : new Vector3(at, y, end)
      disc.applyMatrix4(matrix.compose(position, rotation, new Vector3(1, 1, 1)))
      parts.ends.push(finish(disc, () => [shade, shade, shade]))
    })
  }

  /** Splits a wall log around openings ([start, end] ranges along its axis, at its height). */
  const wallLog = (axis: 'x' | 'z', half: number, y: number, at: number, openings: { from: number; to: number; bottom: number; top: number }[]) => {
    const cuts = openings.filter((o) => y + LOG_RADIUS * 0.6 > o.bottom && y - LOG_RADIUS * 0.6 < o.top).sort((a, b) => a.from - b.from)
    let start = -half - CORNER
    for (const cut of cuts) {
      log(axis, start, cut.from, y, at)
      start = cut.to
    }
    log(axis, start, half + CORNER, y, at)
  }

  const frontOpenings = [
    { from: DOOR.x - DOOR.width / 2, to: DOOR.x + DOOR.width / 2, bottom: -1, top: DOOR.height },
    { from: FRONT_WINDOW.x - FRONT_WINDOW.width / 2, to: FRONT_WINDOW.x + FRONT_WINDOW.width / 2, bottom: FRONT_WINDOW.bottom, top: FRONT_WINDOW.top },
  ]
  const sideOpenings = [{ from: SIDE_WINDOW.z - SIDE_WINDOW.width / 2, to: SIDE_WINDOW.z + SIDE_WINDOW.width / 2, bottom: SIDE_WINDOW.bottom, top: SIDE_WINDOW.top }]
  for (let row = 0; row < LOG_ROWS; row++) {
    // Front/back and side logs alternate by half a spacing: they interlock at the corners.
    const yFront = LOG_RADIUS + row * LOG_SPACING
    const ySide = yFront + LOG_SPACING / 2
    wallLog('x', halfW, yFront, halfD, frontOpenings)
    wallLog('x', halfW, yFront, -halfD, [])
    wallLog('z', halfD, ySide, -halfW, sideOpenings)
    wallLog('z', halfD, ySide, halfW, [])
  }
  log('x', DOOR.x - 0.75, DOOR.x + 0.75, 0.05, halfD + 0.42)

  // Gables: lighter shingles, darker toward the eaves where rain splashes.
  const rise = (halfW + 0.05) * Math.tan(PITCH)
  for (const sign of [1, -1]) {
    const gable = triangle(halfW + 0.05, rise, 1.1)
    gable.applyMatrix4(matrix.compose(new Vector3(0, wallTop - 0.02, sign * (halfD - 0.04)), rotation.setFromAxisAngle(new Vector3(0, 1, 0), sign > 0 ? 0 : Math.PI), new Vector3(1, 1, 1)))
    parts.gables.push(finish(gable, (_x, y) => {
      const v = 0.82 + 0.18 * Math.min(1, (y - wallTop) / rise)
      return [v, v, v]
    }))
  }

  // Door, trims and window frames (weathered planks).
  const box = (w: number, h: number, d: number, x: number, y: number, z: number, tile = 1.2) => {
    const geometry = tileUv(new BoxGeometry(w, h, d), Math.max(w, d), h, tile)
    geometry.translate(x, y, z)
    return geometry
  }
  const plankTint = (v: number) => (): [number, number, number] => [v, v, v]
  const door = box(DOOR.width, DOOR.height, 0.06, -DOOR.width / 2, DOOR.height / 2, 0)
  door.rotateY(DOOR.open)
  door.translate(DOOR.x + DOOR.width / 2, 0, halfD - 0.05)
  parts.planks.push(finish(door, plankTint(0.78)))
  for (const trim of [
    box(0.1, DOOR.height + 0.08, 0.1, DOOR.x - DOOR.width / 2 - 0.03, DOOR.height / 2, halfD + 0.02),
    box(0.1, DOOR.height + 0.08, 0.1, DOOR.x + DOOR.width / 2 + 0.03, DOOR.height / 2, halfD + 0.02),
    box(DOOR.width + 0.26, 0.12, 0.12, DOOR.x, DOOR.height + 0.04, halfD + 0.02),
  ])
    parts.planks.push(finish(trim, plankTint(1)))

  const windowAt = (w: number, bottom: number, top: number, place: Matrix4) => {
    const h = top - bottom
    const frame = [
      box(w + 0.16, 0.09, 0.12, 0, bottom, 0),
      box(w + 0.16, 0.09, 0.12, 0, top, 0),
      box(0.09, h, 0.12, -w / 2 - 0.03, bottom + h / 2, 0),
      box(0.09, h, 0.12, w / 2 + 0.03, bottom + h / 2, 0),
    ]
    // Open windows (no glass, no bars): the camera goes in through the side one.
    frame.forEach((p) => parts.planks.push(finish(p.applyMatrix4(place), plankTint(1))))
  }
  windowAt(FRONT_WINDOW.width, FRONT_WINDOW.bottom, FRONT_WINDOW.top, new Matrix4().makeTranslation(FRONT_WINDOW.x, 0, halfD))
  windowAt(SIDE_WINDOW.width, SIDE_WINDOW.bottom, SIDE_WINDOW.top, new Matrix4().makeTranslation(-halfW, 0, SIDE_WINDOW.z).multiply(new Matrix4().makeRotationY(-Math.PI / 2)))

  // Roof: two wood-shingle slabs meeting at a ridge log, generous overhangs. Subdivided so the
  // vertex colors can carry moss patches and the damp, darker lower rows.
  const slope = (halfW + 0.5) / Math.cos(PITCH)
  const roofDepth = depth + 2 * CORNER + 0.7
  const moss = createNoise2D(config.seed + 3)
  const textureTile = { roof: 1.3 }
  const ridgeY = wallTop + rise + 0.12
  for (const sign of [1, -1]) {
    const slab = new BoxGeometry(slope, 0.1, roofDepth, 16, 1, 20)
    // Shingle courses run along the ridge, each row overlapping the one below: texture u along
    // the ridge (z), texture "up" toward the ridge.
    const uv = slab.getAttribute('uv')
    for (let k = 0; k < uv.count; k++) {
      const across = sign > 0 ? 1 - uv.getX(k) : uv.getX(k)
      uv.setXY(k, (uv.getY(k) * roofDepth) / textureTile.roof, (across * slope) / textureTile.roof)
    }
    // Hinge at the ridge: shift so the inner edge is at x = 0, tilt down, lift to the ridge.
    slab.translate((sign * slope) / 2, 0, 0)
    slab.rotateZ(-sign * PITCH)
    slab.translate(0, ridgeY, 0)
    parts.roof.push(finish(slab, (x, y, z) => {
      const down = Math.min(1, Math.max(0, (ridgeY - y) / (slope * Math.sin(PITCH))))
      const patch = Math.max(0, moss(x * 0.9 + sign * 7, z * 0.9) - 0.45) * 2.2
      const damp = 1 - 0.28 * down * down
      // Moss: greener and a touch darker; lower rows hold more of it.
      const green = Math.min(1, patch * (0.4 + 0.6 * down))
      return [damp * (1 - 0.32 * green), damp * (1 - 0.08 * green), damp * (1 - 0.42 * green)]
    }))
    // Barge boards along the front and back edges of the slab.
    for (const end of [1, -1]) {
      const board = tileUv(new BoxGeometry(slope + 0.02, 0.2, 0.05), slope, 0.2, 1.2)
      board.translate((sign * slope) / 2, -0.04, end * (roofDepth / 2 + 0.02))
      board.rotateZ(-sign * PITCH)
      board.translate(0, ridgeY, 0)
      parts.planks.push(finish(board, plankTint(0.85)))
    }
  }
  log('z', -roofDepth / 2 - 0.05, roofDepth / 2 + 0.05, ridgeY + 0.08, 0)

  // Stovepipe through the right slope, above the stove inside.
  const pipeX = halfW - LOG_RADIUS - 0.4
  const pipeZ = -0.55
  const pipeBase = ridgeY - pipeX * Math.tan(PITCH)
  const pipe = new CylinderGeometry(0.1, 0.1, 1.5, 16)
  pipe.translate(pipeX, pipeBase + 0.6, pipeZ)
  const pipeCap = new CylinderGeometry(0.2, 0.14, 0.12, 16)
  pipeCap.translate(pipeX, pipeBase + 1.4, pipeZ)
  parts.metal.push(finish(pipe, plain), finish(pipeCap, plain))

  // ---------- Interior ----------
  const innerX = halfW - LOG_RADIUS
  const innerZ = halfD - LOG_RADIUS
  const FLOOR = 0.1
  // Plank floor, darker toward the walls.
  const floor = new PlaneGeometry(innerX * 2, innerZ * 2)
  floor.rotateX(-Math.PI / 2)
  floor.translate(0, FLOOR, 0)
  tileUv(floor, innerX * 2, innerZ * 2, 1.1)
  parts.planks.push(finish(floor, (x, _y, z) => {
    const edge = Math.min(innerX - Math.abs(x), innerZ - Math.abs(z))
    const v = 0.62 + 0.18 * Math.min(1, edge / 0.8)
    return [v, v * 0.97, v * 0.92]
  }))
  // Board lining under both roof slopes (the roof's own underside is shingles), the inner faces
  // of the gables, and two tie beams across the room.
  const liningY = ridgeY - 0.12
  const liningLength = innerX / Math.cos(PITCH)
  for (const sign of [1, -1]) {
    const lining = new PlaneGeometry(liningLength, innerZ * 2)
    lining.rotateX(Math.PI / 2) // facing down
    tileUv(lining, liningLength, innerZ * 2, 1.2)
    lining.translate((sign * liningLength) / 2, 0, 0)
    lining.rotateZ(-sign * PITCH)
    lining.translate(0, liningY, 0)
    parts.planks.push(finish(lining, (x) => {
      const v = 0.55 + 0.2 * (1 - Math.abs(x) / innerX) // darker down the slope
      return [v, v * 0.96, v * 0.9]
    }))
    const gable = triangle(innerX, liningY - wallTop, 1.2)
    gable.applyMatrix4(matrix.compose(new Vector3(0, wallTop, sign * (innerZ - 0.02)), rotation.setFromAxisAngle(new Vector3(0, 1, 0), sign > 0 ? Math.PI : 0), new Vector3(1, 1, 1)))
    parts.planks.push(finish(gable, plankTint(0.6)))
  }
  for (const z of [-innerZ * 0.5, innerZ * 0.5]) log('x', -innerX - 0.05, innerX + 0.05, wallTop + 0.08, z)
  // The stovepipe from the stove up through the lining.
  const STOVE_TOP = FLOOR + 0.86
  const innerPipeTop = liningY - pipeX * Math.tan(PITCH)
  const innerPipe = new CylinderGeometry(0.08, 0.08, innerPipeTop - STOVE_TOP, 16, 1, true)
  innerPipe.translate(pipeX, (STOVE_TOP + innerPipeTop) / 2, pipeZ)
  parts.metal.push(finish(innerPipe, plain))

  const group = new Group()
  group.name = 'cabin'
  const meshes = (Object.keys(parts) as (keyof typeof parts)[]).map((key) => {
    const m = new Mesh(mergeGeometries(parts[key]), materials[key])
    m.name = `cabin-${key}`
    m.receiveShadow = true
    group.add(m)
    return m
  })

  // Yard props (scanned): each clone inside a holder (the clone keeps its node transform, i.e.
  // meshopt dequantization; the holder places it). Materials are cloned: the stump's is shared
  // with the forest's stumps, which must not get the cabin's veil.
  const put = (source: Object3D | null | undefined, x: number, y: number, z: number, rx: number, ry: number, rz: number, scale = 1) => {
    if (!source) return
    const holder = new Group()
    holder.position.set(x, y, z)
    holder.rotation.set(rx, ry, rz)
    holder.scale.setScalar(scale)
    const item = source.clone()
    item.traverse((o) => {
      if (!(o instanceof Mesh)) return
      o.material = Array.isArray(o.material) ? o.material.map((m) => m.clone()) : o.material.clone()
      o.receiveShadow = true
    })
    holder.add(item)
    group.add(holder)
  }
  const pit = { x: 3.6, z: halfD + 3.4 }
  put(props.getObjectByName('fire_pit'), pit.x, 0.17, pit.z, 0, 0.4, 0)
  put(props.getObjectByName('stool'), 2.5, 0, halfD + 4.3, 0, 1.1, 0)
  put(props.getObjectByName('bucket'), DOOR.x - 0.85, 0, halfD + 0.4, 0, 0.3, 0)
  put(props.getObjectByName('crate'), FRONT_WINDOW.x + 0.15, 0, halfD + 0.38, 0, 0.05, 0)
  put(props.getObjectByName('lantern'), FRONT_WINDOW.x + 0.35, 0.33, halfD + 0.4, 0, 0.6, 0)
  // Chopping block with the axe's blade stuck in its top, handle up and leaning.
  put(stump, -halfW - 1.4, 0.1, halfD + 1.6, 0, 0.5, 0, 0.7)
  if (stump) put(props.getObjectByName('axe'), -halfW - 1.4, 0.38, halfD + 1.6, 0.35, 0.8, -0.25)

  // Furniture (scanned), on the plank floor. Seen from the side window (the journey's last
  // shot), along the right wall: a barrel stove under the pipe with a pot on it, a rocking chair
  // facing it, a table with the oil lamp, the yard's stool pulled up to it. Along the back wall,
  // passed on the way in: a day bed with pillows and a bookshelf.
  const furniture = (name: string) => interior.getObjectByName(name)
  put(furniture('stove'), pipeX, FLOOR, pipeZ, 0, 0.6, 0)
  put(furniture('pot'), pipeX + 0.05, STOVE_TOP, pipeZ + 0.06, 0, 1.1, 0)
  put(furniture('rocking_chair'), pipeX - 0.85, FLOOR - 0.1, pipeZ + 0.8, 0, 2.35, 0) // modeled 0.1 m up
  const TABLE = { x: innerX - 0.45, z: 1.25 }
  put(furniture('table'), TABLE.x, FLOOR, TABLE.z, 0, Math.PI / 2 + 0.06, 0)
  const LAMP = { x: TABLE.x - 0.05, z: TABLE.z - 0.3 }
  put(furniture('oil_lamp'), LAMP.x, FLOOR + 0.8, LAMP.z, 0, 0.4, 0)
  put(props.getObjectByName('stool'), TABLE.x - 0.65, FLOOR, TABLE.z + 0.3, 0, 0.3, 0)
  const BED = { x: -innerX + 1.25, z: -innerZ + 0.5 }
  put(furniture('day_bed'), BED.x, FLOOR, BED.z, 0, 0, 0)
  // The colorful throw pillows, at the end facing the room: where the scan's own grey pillows
  // were (removed from the model, see tools/forest-assets/drop_parts.ts).
  put(furniture('pillows'), BED.x + 0.5, FLOOR + 0.52, BED.z - 0.05, 0, 0.25, 0)
  put(furniture('bookshelf'), 0.6, FLOOR, -innerZ + 0.31, 0, 0, 0)

  // The campfire in the stone pit.
  const fire = createCampfire(config.seed + 9, textures.logs.color)
  fire.group.position.set(pit.x, 0.05, pit.z)
  group.add(fire.group)

  group.position.set(config.center[0], groundY - 0.06, config.center[1])
  group.rotation.y = config.yaw

  // Shared uniforms: the room box and the soft lights inside (oil lamp; daylight at the windows).
  group.updateMatrix()
  const toWorld = (x: number, y: number, z: number) => new Vector3(x, y, z).applyMatrix4(group.matrix)
  const LAMP_COLOR = new Color(1, 0.66, 0.38).multiplyScalar(1.4)
  const uniforms: CabinUniforms = {
    uCabinInverse: { value: group.matrix.clone().invert() },
    uRoom: { value: [halfW, halfD, liningY + 0.05, Math.tan(PITCH)] },
    uLights: {
      value: [
        toWorld(LAMP.x, FLOOR + 1.3, LAMP.z),
        toWorld(-innerX + 0.35, (SIDE_WINDOW.bottom + SIDE_WINDOW.top) / 2, SIDE_WINDOW.z),
        toWorld(FRONT_WINDOW.x, (FRONT_WINDOW.bottom + FRONT_WINDOW.top) / 2, innerZ - 0.35),
      ],
    },
    uLightColors: { value: [LAMP_COLOR.clone(), new Color(0.62, 0.66, 0.68), new Color(0.5, 0.54, 0.56)] },
    uLightRadius: { value: [2.6, 1.7, 1.5] },
  }
  // Every lit surface of the cabin, its furniture and props, and the fire's wood.
  group.traverse((o) => {
    if (!(o instanceof Mesh)) return
    for (const material of Array.isArray(o.material) ? o.material : [o.material]) enableCabinShading(material, uniforms)
  })
  // The oil lamp. The scan's glass and flame textures are JPG (no alpha), so both would draw
  // opaque: the glass becomes faintly tinted see-through glass, the flame card adds its light
  // (its black background adds nothing).
  group.traverse((o) => {
    if (!(o instanceof Mesh) || !(o.material instanceof MeshStandardMaterial)) return
    const material = o.material
    if (material.name.includes('flame')) {
      material.map = null
      material.color.set('#000000')
      material.emissive.set('#ffc78a')
      material.emissiveIntensity = 2.5
      material.blending = AdditiveBlending
      material.transparent = true
      material.depthWrite = false
    } else if (material.name.includes('glass')) {
      // Clear glass around a lit flame: a faint warm glow, one layer.
      material.map = null
      material.color.set('#ffffff')
      material.emissive.set('#ffd2a0')
      material.emissiveIntensity = 0.35
      material.transparent = true
      material.opacity = 0.16
      material.depthWrite = false
      material.roughness = 0.05
      material.side = FrontSide
    }
  })

  // Shadows only once the cabin is clear enough to be seen (the cached map is redrawn on change).
  let casting: boolean | null = null
  const setCasting = (on: boolean) => {
    if (on === casting) return
    casting = on
    group.traverse((o) => {
      if (o instanceof Mesh) o.castShadow = on
    })
    invalidateSunShadow()
  }

  // Always casting: the shadow map is static (drawn once for the whole walk), so toggling the
  // cabin's shadow with distance would redraw it mid-scroll. Far away its shadow sits in haze.
  setCasting(true)

  const firePosition = new Vector3()
  const update = (elapsed: number, camera: Vector3) => {
    // The oil lamp breathes a little.
    const flicker = 0.9 + 0.06 * Math.sin(elapsed * 7.3) + 0.04 * Math.sin(elapsed * 17.1)
    uniforms.uLightColors.value[0].copy(LAMP_COLOR).multiplyScalar(flicker)
    // Flames, sparks and the light skip the fog (they glow): fade them with fog and veil instead.
    fire.group.getWorldPosition(firePosition)
    const distance = camera.distanceTo(firePosition)
    fire.setStrength((1 - veil(distance)) * Math.exp(-((fogDensity * distance) ** 2)))
    fire.update(elapsed)
  }

  return {
    group,
    update,
    dispose: () => {
      meshes.forEach((m) => m.geometry.dispose())
      Object.values(materials).forEach((m) => m.dispose())
      fire.dispose()
    },
  }
}

/** Footprint test in the cabin's frame: inside the walls grown by `margin` meters. */
export function cabinContains(config: CabinConfig, x: number, z: number, margin: number): boolean {
  const dx = x - config.center[0]
  const dz = z - config.center[1]
  const c = Math.cos(config.yaw)
  const s = Math.sin(config.yaw)
  const lx = dx * c - dz * s
  const lz = dx * s + dz * c
  return Math.abs(lx) < config.size[0] / 2 + margin && Math.abs(lz) < config.size[1] / 2 + margin
}

/** Distance from a point to the outside of the cabin's log walls (0 inside), in meters. */
export function cabinWallDistance(config: CabinConfig, x: number, z: number): number {
  const dx = x - config.center[0]
  const dz = z - config.center[1]
  const c = Math.cos(config.yaw)
  const s = Math.sin(config.yaw)
  const outX = Math.max(0, Math.abs(dx * c - dz * s) - config.size[0] / 2 - LOG_RADIUS)
  const outZ = Math.max(0, Math.abs(dx * s + dz * c) - config.size[1] / 2 - LOG_RADIUS)
  return Math.hypot(outX, outZ)
}

/** The open yard in front of the door (no ferns there), in the cabin's frame. */
export function cabinYard(config: CabinConfig, x: number, z: number): boolean {
  const dx = x - config.center[0]
  const dz = z - config.center[1]
  const c = Math.cos(config.yaw)
  const s = Math.sin(config.yaw)
  const lx = dx * c - dz * s
  const lz = dx * s + dz * c
  return Math.abs(lx) < config.size[0] / 2 + 2.5 && lz > 0 && lz < config.size[1] / 2 + 5.5
}
