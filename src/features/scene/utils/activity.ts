import { sceneConfig } from '../config/sceneConfig.ts'
import type { ActivityLevel } from '../types/index.ts'

const { idleAfter, sleepAfter } = sceneConfig.activity
const INPUT_EVENTS = ['pointermove', 'pointerdown', 'wheel', 'keydown', 'touchstart', 'scroll'] as const

let level: ActivityLevel = 'active'
let lastInput = 0
let timer = 0
let keepAwake = false
const listeners = new Set<() => void>()

const isAway = () => document.hidden || !document.hasFocus()

function publish(next: ActivityLevel) {
  if (next === level) return
  level = next
  listeners.forEach((listener) => listener())
}

function evaluate() {
  window.clearTimeout(timer)
  timer = 0
  if (isAway()) return publish('away')
  const quiet = keepAwake ? 0 : (performance.now() - lastInput) / 1000
  if (quiet < idleAfter) {
    publish('active')
    if (!keepAwake) timer = window.setTimeout(evaluate, (idleAfter - quiet) * 1000)
  } else if (quiet < sleepAfter) {
    publish('idle')
    timer = window.setTimeout(evaluate, (sleepAfter - quiet) * 1000)
  } else {
    publish('asleep')
  }
}

function onInput() {
  lastInput = performance.now()
  if (level !== 'active') evaluate()
}

function onPresenceChange() {
  lastInput = performance.now()
  evaluate()
}

function start() {
  lastInput = performance.now()
  INPUT_EVENTS.forEach((type) => window.addEventListener(type, onInput, { passive: true }))
  window.addEventListener('focus', onPresenceChange)
  window.addEventListener('blur', onPresenceChange)
  document.addEventListener('visibilitychange', onPresenceChange)
  evaluate()
}

function stop() {
  INPUT_EVENTS.forEach((type) => window.removeEventListener(type, onInput))
  window.removeEventListener('focus', onPresenceChange)
  window.removeEventListener('blur', onPresenceChange)
  document.removeEventListener('visibilitychange', onPresenceChange)
  window.clearTimeout(timer)
  timer = 0
}

export function subscribeActivity(listener: () => void): () => void {
  if (listeners.size === 0) start()
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
    if (listeners.size === 0) stop()
  }
}

export function getActivity(): ActivityLevel {
  return level
}

export function frameloopFor(paused: boolean, activity: ActivityLevel): 'always' | 'demand' | 'never' {
  if (paused) return 'never'
  return activity === 'active' ? 'always' : 'demand'
}

export function setKeepAwake(value: boolean): void {
  if (keepAwake === value) return
  keepAwake = value
  lastInput = performance.now()
  if (listeners.size > 0) evaluate()
}
