import { BufferGeometry, Color, Float32BufferAttribute, Vector3 } from 'three'

export const smoothstep = (edge0: number, edge1: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - edge0) / (edge1 - edge0)))
  return t * t * (3 - 2 * t)
}

/**
 * Bakes a color per vertex (the materials use `vertexColors`). `paint` receives the vertex
 * position and normal and writes into `color`; scratch objects are reused, so don't keep them.
 */
export function paintVertices(
  geometry: BufferGeometry,
  paint: (position: Vector3, normal: Vector3, color: Color) => void,
): void {
  const position = geometry.getAttribute('position')
  const normal = geometry.getAttribute('normal')
  const colors = new Float32Array(position.count * 3)
  const p = new Vector3()
  const n = new Vector3()
  const c = new Color()
  for (let i = 0; i < position.count; i++) {
    p.fromBufferAttribute(position, i)
    n.fromBufferAttribute(normal, i)
    paint(p, n, c)
    colors[i * 3] = c.r
    colors[i * 3 + 1] = c.g
    colors[i * 3 + 2] = c.b
  }
  geometry.setAttribute('color', new Float32BufferAttribute(colors, 3))
}
