/** Pass-through vertex shader for full-plane effects: exposes the plane UV as `vUv`. */
export const planeVertexShader = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`
