import { useLoader, useThree } from '@react-three/fiber'
import { useEffect } from 'react'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import { forestConfig } from '../config/forestConfig.ts'
import type { RealisticForest } from '../models/buildRealisticForest.ts'
import { useGltfExtensions, useKtx2Textures } from './forestLoaders.ts'
import { invalidateSunShadow } from './sunShadow.ts'
import { warmUpForest } from './warmUpForest.ts'

const { cabin } = forestConfig.assets
const MODELS = [cabin.props, cabin.interior]
const TEXTURES = [cabin.logs, cabin.ends, cabin.planks, cabin.roof, cabin.gables].flatMap((set) => [set.color, set.normal, set.arm])

interface ForestCabinProps {
  forest: RealisticForest
}

/**
 * Second loading stage: the log cabin, its furniture and campfire. Only fetched once the forest
 * is built and warmed up (the cabin is first seen chapters later, veiled by the mist), then
 * placed in the clearing and warmed up on its own.
 */
export function ForestCabin({ forest }: ForestCabinProps) {
  const [props, interior] = useLoader(GLTFLoader, MODELS, useGltfExtensions())
  const textures = useKtx2Textures(TEXTURES)
  const gl = useThree((state) => state.gl)
  const scene = useThree((state) => state.scene)
  const camera = useThree((state) => state.camera)
  const advance = useThree((state) => state.advance)

  useEffect(() => {
    let cancelled = false
    const set = (i: number) => ({ color: textures[i * 3], normal: textures[i * 3 + 1], arm: textures[i * 3 + 2] })
    const group = forest.addCabin(props.scene, interior.scene, {
      logs: set(0),
      ends: set(1),
      planks: set(2),
      roof: set(3),
      gables: set(4),
    })
    invalidateSunShadow()
    warmUpForest(gl, scene, camera, group, advance, () => cancelled).catch((error: unknown) =>
      console.error('Cabin warm-up failed', error),
    )
    return () => {
      cancelled = true
      forest.removeCabin()
      invalidateSunShadow()
    }
  }, [forest, props, interior, textures, gl, scene, camera, advance])

  return null
}
