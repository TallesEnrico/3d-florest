// Scroll performance audit (dev tool, not part of the site). Opens the dev server in headless
// Chrome at Retina density and scrolls the whole page with real wheel events, top to footer and
// back. Reports: long tasks while loading, frame intervals while scrolling (and where the slow
// ones are), shader programs compiled mid-scroll (should be none), renderer stats and,
// with --profile, the top CPU functions.
//
// Usage (dev server on :5173): bun tools/perf/scroll-audit.ts <tmpDir> [--vsync] [--profile] [--camera[=face.y4m]] [--query=a=b]
// --camera: Chrome's fake webcam is turned on before scrolling, so face tracking runs the whole
// way, as it does once a visitor turns the camera on. Without a file it shows a test pattern (no
// face: detection only); with a .y4m of a face (docs/qa/testing-checklist.md) the full landmark
// model runs, like with a real visitor.
// CHROME=<path to the Chrome binary> overrides the macOS default.
// Frame times depend on machine load (another browser using the GPU or screen recording can cap
// even a blank page at 30 fps); long tasks and mid-scroll compiles do not.
import { spawn } from 'node:child_process'
import { mkdtempSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
const args = process.argv.slice(2)
const outDir = args[0]
const vsync = args.includes('--vsync')
const cameraArg = args.find((a) => a === '--camera' || a.startsWith('--camera='))
const camera = cameraArg !== undefined
const cameraFile = cameraArg?.split('=')[1]
const query = args.find((a) => a.startsWith('--query='))?.slice(8) ?? ''
const profile = args.includes('--profile')
const W = 1512, H = 945, DSF = 2
const innerHeightGuess = H
const port = 9200 + Math.floor(Math.random() * 600)
const flags = ['--headless=new', `--remote-debugging-port=${port}`, `--user-data-dir=${mkdtempSync(join(outDir, 'p-'))}`, '--no-first-run', `--window-size=${W},${H}`, '--enable-gpu', '--ignore-gpu-blocklist']
if (!vsync) flags.push('--disable-gpu-vsync', '--disable-frame-rate-limit')
if (camera) flags.push('--use-fake-device-for-media-stream', '--use-fake-ui-for-media-stream')
if (cameraFile) flags.push(`--use-file-for-fake-video-capture=${cameraFile}`)
const chrome = process.env.CHROME ?? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
const proc = spawn(chrome, [...flags, 'about:blank'], { stdio: 'ignore' })
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))
let wsUrl = ''; for (let i = 0; i < 40 && !wsUrl; i++) { await sleep(250); try { wsUrl = ((await (await fetch(`http://127.0.0.1:${port}/json`)).json()) as any[]).find((t) => t.type === 'page')?.webSocketDebuggerUrl ?? '' } catch {} }
const ws = new WebSocket(wsUrl); await new Promise((r) => (ws.onopen = r)); let id = 0; const pending = new Map<number, (v: any) => void>(); const errs: string[] = []
ws.onmessage = (e) => { const m = JSON.parse(String(e.data)); if (m.id && pending.has(m.id)) { pending.get(m.id)!(m.result); pending.delete(m.id) }; if (m.method === 'Runtime.exceptionThrown') errs.push(m.params.exceptionDetails.exception?.description?.slice(0, 200)) }
const send = (method: string, params: object = {}) => new Promise<any>((r) => { const i = ++id; pending.set(i, r); ws.send(JSON.stringify({ id: i, method, params })) })
const ev = async (e: string) => (await send('Runtime.evaluate', { expression: e, returnByValue: true, awaitPromise: true })).result?.value
await send('Runtime.enable'); await send('Page.enable')
await send('Emulation.setDeviceMetricsOverride', { width: W, height: H, deviceScaleFactor: DSF, mobile: false })
await send('Page.addScriptToEvaluateOnNewDocument', { source: `window.__long=[];new PerformanceObserver(l=>l.getEntries().forEach(e=>window.__long.push([Math.round(e.startTime),Math.round(e.duration)]))).observe({type:'longtask',buffered:true});
  window.__resizes=[]; new MutationObserver((ms) => ms.forEach((m) => { if (m.target.tagName === 'CANVAS' && m.attributeName === 'width') window.__resizes.push([Math.round(performance.now()), Math.round(scrollY), m.target.width, m.target.closest('.forest-journey') ? 'forest' : 'hero']) })).observe(document, { subtree: true, attributes: true, attributeFilter: ['width'] });
  if (location.search.includes('nobackdrop')) { const s = document.createElement('style'); s.textContent = '* { backdrop-filter: none !important; -webkit-backdrop-filter: none !important }'; document.documentElement.append(s) }
  window.__frames=[]; window.__fy=[]; (function loop(t){ window.__frames.push(t); window.__fy.push(scrollY); requestAnimationFrame(loop) })(performance.now());` })
const t0 = Date.now()
await send('Page.navigate', { url: `http://localhost:5173/${query ? '?' + query : ''}` })
let readyAt = 0
for (let i = 0; i < 80; i++) { await sleep(250); if (await ev('typeof window.__forestStats === "function"')) { readyAt = Date.now() - t0; break } }
await sleep(3000)
const loadLong = (await ev('window.__long')) as [number, number][]
console.log(`forest ready ${(readyAt / 1000).toFixed(1)} s; long tasks during load: ${loadLong.length}, total ${loadLong.reduce((a, b) => a + b[1], 0)} ms, worst ${Math.max(0, ...loadLong.map((l) => l[1]))} ms`)
console.log('  load long tasks (start ms, duration ms):', JSON.stringify(loadLong.filter((l) => l[1] > 80)))

// Wheel scroll from the top of the page to the footer and back up to the river, like a person.
const wheelPhase = async (label: string, direction: 1 | -1, steps: number) => {
  await ev('window.__long=[]; window.__frames=[]; window.__fy=[]; window.__shadowRenders = 0')
  if (profile && label === 'down') { await send('Profiler.enable'); await send('Profiler.setSamplingInterval', { interval: 200 }); await send('Profiler.start') }
  for (let i = 0; i < steps; i++) {
    await send('Input.dispatchMouseEvent', { type: 'mouseWheel', x: W / 2, y: H / 2, deltaX: 0, deltaY: 90 * direction })
    await sleep(16)
  }
  await sleep(800)
  let cpu: any = null
  if (profile && label === 'down') cpu = (await send('Profiler.stop')).profile
  const frames = (await ev('window.__frames')) as number[]
  const d = frames.slice(1).map((t, i) => t - frames[i]).slice(2)
  const s = [...d].sort((a, b) => a - b)
  const avg = d.reduce((a, b) => a + b, 0) / d.length
  const long = (await ev('window.__long')) as [number, number][]
  const ys = (await ev('window.__fy')) as number[]
  const marks = (await ev(`['inicio','manifesto','como-funciona','recursos','bastidores','experimente','perguntas','creditos','rodape'].map(id => [id, document.getElementById(id).getBoundingClientRect().top + scrollY])`)) as [string, number][]
  const where = (y: number) => { const mid = y + innerHeightGuess / 2; let name = marks[0][0]; for (const [n, top] of marks) if (top <= mid) name = n; return name }
  const spikes = d.map((x, i) => [x, ys[i + 3]] as [number, number]).filter(([x]) => x > 33.4)
  if (spikes.length) console.log('   slow frames at:', spikes.map(([x, y]) => `${x.toFixed(0)} ms @ y=${Math.round(y)} (${where(y)})`).join(', '))
  console.log(`${label.padEnd(5)} frames ${d.length}, avg ${avg.toFixed(1)} ms (${(1000 / avg).toFixed(0)} fps), p50 ${s[Math.floor(s.length * 0.5)].toFixed(1)}, p95 ${s[Math.floor(s.length * 0.95)].toFixed(1)}, p99 ${s[Math.floor(s.length * 0.99)].toFixed(1)}, max ${s[s.length - 1].toFixed(1)} ms, >33ms: ${d.filter((x) => x > 33.4).length}, >50ms: ${d.filter((x) => x > 50).length}; long tasks ${long.length} (${long.map((l) => l[1]).join(',')})`)
  return cpu
}
// The store module the app actually loaded (after a hot update its URL carries ?t=…).
const STORE = `import(performance.getEntriesByType('resource').map((e) => e.name).filter((n) => n.includes('/headTracking/store/headTrackingStore.ts')).pop() ?? '/src/features/headTracking/store/headTrackingStore.ts').then((m) => m.useHeadTrackingStore.getState())`
const cameraState = async () => ev(`${STORE}.then((s) => ({ webcam: s.webcam, tracking: s.tracking, source: s.source, inferenceMs: +s.inferenceMs.toFixed(1), delegate: s.delegate }))`)
if (camera) {
  // Like a visitor: the header's "Ativar câmera".
  await ev(`[...document.querySelectorAll('.site-header button')].find((b) => b.textContent.includes('Ativar câmera'))?.click()`)
  for (let i = 0; i < 60; i++) {
    await sleep(250)
    const state = (await cameraState()) as { webcam: string; tracking: string }
    if (state.webcam === 'active' && !['loading', 'idle'].includes(state.tracking)) break
  }
  await sleep(1500)
  console.log('camera on:', JSON.stringify(await cameraState()))
}
const programs = () => ev(`(() => { const r = window.__forestRenderer; return r ? r.info.programs.map(p => p.name + ' | ' + p.cacheKey.slice(0, 160)) : [] })()`)
const before = new Set((await programs()) as string[])
const cpu = await wheelPhase('down', 1, 260)
const after = (await programs()) as string[]
console.log('programs compiled during scroll:', after.filter((p) => !before.has(p)))
await wheelPhase('up', -1, 120)
if (camera) console.log('camera after scrolling the whole page:', JSON.stringify(await cameraState()))
console.log('canvas resizes (t, scrollY, width, canvas):', JSON.stringify(await ev('window.__resizes')))
const info = await ev(`(() => { const r = window.__forestRenderer; return r ? { calls: r.info.render.calls, triangles: r.info.render.triangles, programs: r.info.programs?.length, geometries: r.info.memory.geometries, textures: r.info.memory.textures } : null })()`)
console.log('renderer (last frame):', JSON.stringify(info), 'quality:', await ev('window.__forestQuality'))
if (cpu) {
  // Self time per function (sampled).
  const byId = new Map<number, any>(cpu.nodes.map((n: any) => [n.id, n]))
  const self = new Map<string, number>()
  const dt = cpu.timeDeltas as number[]
  const counts = new Map<number, number>()
  cpu.samples.forEach((sid: number, i: number) => counts.set(sid, (counts.get(sid) ?? 0) + (dt[i] ?? 0)))
  for (const [sid, us] of counts) {
    const n = byId.get(sid); const f = n.callFrame
    const key = `${f.functionName || '(anon)'} ${f.url.split('/').pop()?.split('?')[0]}:${f.lineNumber + 1}`
    self.set(key, (self.get(key) ?? 0) + us)
  }
  const total = [...self.values()].reduce((a, b) => a + b, 0)
  console.log(`CPU profile (scroll down), total ${(total / 1000).toFixed(0)} ms; top self time:`)
  ;[...self.entries()].sort((a, b) => b[1] - a[1]).slice(0, 22).forEach(([k, v]) => console.log(`  ${(v / 1000).toFixed(1).padStart(7)} ms  ${(100 * v / total).toFixed(1).padStart(5)}%  ${k}`))
  writeFileSync(join(outDir, 'scroll.cpuprofile'), JSON.stringify(cpu))
}
if (errs.length) console.log('errors:', errs.slice(0, 3))
ws.close(); proc.kill()
