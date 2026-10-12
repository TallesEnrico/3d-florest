import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  base: './',
  optimizeDeps: {
    // three/addons used by the forest: pre-bundled with the rest, so the dev server never
    // discovers them late (which would re-optimize and load a second copy of three).
    include: ['three/addons/loaders/GLTFLoader.js', 'three/addons/libs/meshopt_decoder.module.js'],
  },
})
