import { BufferAttribute, BufferGeometry, type Material, Mesh, type Object3D } from 'three'

/** One drawable piece of a model: a geometry in model space and the material it uses. */
export interface ModelPart {
  geometry: BufferGeometry
  material: Material
}

const ATTRIBUTES = ['position', 'normal', 'uv'] as const

/** Copies an attribute to plain floats (quantized glTF data is normalized ints, sometimes interleaved). */
function toFloat(attribute: BufferGeometry['attributes'][string]) {
  const { count, itemSize } = attribute
  const array = new Float32Array(count * itemSize)
  for (let i = 0; i < count; i++) {
    array[i * itemSize] = attribute.getX(i)
    if (itemSize > 1) array[i * itemSize + 1] = attribute.getY(i)
    if (itemSize > 2) array[i * itemSize + 2] = attribute.getZ(i)
  }
  return new BufferAttribute(array, itemSize)
}

/**
 * Extracts the meshes under a glTF node as standalone parts: the node's transform (including
 * meshopt dequantization) is baked into float geometry with position/normal/uv only, so every
 * part can share one batched/instanced buffer with the others.
 */
export function bakeParts(root: Object3D, nodeName: string): ModelPart[] {
  const node = root.getObjectByName(nodeName)
  if (!node) throw new Error(`Forest asset: node "${nodeName}" not found`)
  root.updateMatrixWorld(true)
  const parts: ModelPart[] = []
  node.traverse((object) => {
    if (!(object instanceof Mesh)) return
    const source = object.geometry as BufferGeometry
    const geometry = new BufferGeometry()
    for (const name of ATTRIBUTES) {
      const attribute = source.getAttribute(name)
      if (attribute) geometry.setAttribute(name, toFloat(attribute))
    }
    const index = source.getIndex()
    if (index) geometry.setIndex(Array.from(index.array as ArrayLike<number>))
    geometry.applyMatrix4(object.matrixWorld)
    geometry.computeBoundingSphere()
    parts.push({ geometry, material: object.material as Material })
  })
  return parts
}

/** Largest horizontal distance from the trunk axis among vertices below `height` (model units). */
export function reachBelow(parts: ModelPart[], height: number): number {
  let reach = 0
  for (const { geometry } of parts) {
    const position = geometry.getAttribute('position')
    for (let i = 0; i < position.count; i++) {
      if (position.getY(i) < height) reach = Math.max(reach, Math.hypot(position.getX(i), position.getZ(i)))
    }
  }
  return reach
}
