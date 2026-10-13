import { useSyncExternalStore } from 'react'
import type { ActivityLevel } from '../types/index.ts'
import { getActivity, subscribeActivity } from '../utils/activity.ts'

export function useActivityLevel(): ActivityLevel {
  return useSyncExternalStore(subscribeActivity, getActivity, () => 'active')
}
