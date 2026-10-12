// GPU cost of the forest (dev tool, not part of the site): milliseconds of GPU work per frame,
// measured with EXT_disjoint_timer_query_webgl2 around each render of the forest canvas. Unlike
// frame intervals, this doesn't depend on vsync or on a 30 fps cap when the machine is busy.
// Reports the hero (still and while the head/mouse moves it), each forest chapter (still camera)
// and a continuous scroll through the whole journey.
//
// Usage (dev server on :5173): bun tools/perf/gpu-cost.ts <tmpDir> [--query=a=b]
// CHROME=<path to the Chrome binary> overrides the macOS default.
import { spawn } from 'node:child_process'
import { mkdtempSync } from 'node:fs'
import { join } from 'node:path'

const args = process.argv.slice(2)
const outDir = args[0]
const query = args.find((a) => a.startsWith('--query='))?.slice(8) ?? ''
const W = 1512
const H = 945
const chrome = process.env.CHROME ?? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
const port = 9200 + Math.floor(Math.random() * 600)
const proc = spawn(chrome, ['--headless=new', `--remote-debugging-port=${port}`, `--user-data-dir=${mkdtempSync(join(outDir, 'p-'))}`, '--no-first-run', `--window-size=${W},${H}`, '--enable-gpu', '--ignore-gpu-blocklist', 'about:blank'], { stdio: 'ignore' })
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))
let wsUrl = ''
for (let i = 0; i < 40 && !wsUrl; i++) {
  await sleep(250)
  try {
    wsUrl = ((await (await fetch(`http://127.0.0.1:${port}/json`)).json()) as { type: string; webSocketDebuggerUrl: string }[]).find((t) => t.type === 'page')?.webSocketDebuggerUrl ?? ''
  } catch {}
}
const ws = new WebSocket(wsUrl)
await new Promise((r) => (ws.onopen = r))
let id = 0
const pending = new Map<number, (v: unknown) => void>()
ws.onmessage = (e) => {
  const m = JSON.parse(String(e.data))
  if (m.id && pending.has(m.id)) {
    pending.get(m.id)!(m.result)
    pending.delete(m.id)
  }
}
const send = (method: string, params: object = {}) =>
  new Promise<any>((r) => {
    const i = ++id
    pending.set(i, r)
    ws.send(JSON.stringify({ id: i, method, params }))
  })
const ev = async (e: string) => (await send('Runtime.evaluate', { expression: e, returnByValue: true, awaitPromise: true })).result?.value

await send('Runtime.enable')
await send('Emulation.setDeviceMetricsOverride', { width: W, height: H, deviceScaleFactor: 2, mobile: false })
await send('Page.navigate', { url: `http://localhost:5173/${query ? '?' + query : ''}` })
for (let i = 0; i < 80 && !(await ev('typeof window.__forestRenderer === "object" && typeof window.__heroRenderer === "object"')); i++) await sleep(250)
await sleep(3000)

// Wrap each renderer's render() in GPU timer queries (results land in window.__gpu).
await ev(`(() => {
  window.__gpu = []
  for (const r of [window.__forestRenderer, window.__heroRenderer]) {
  const gl = r.getContext(), ext = gl.getExtension('EXT_disjoint_timer_query_webgl2')
  const open = []
  const poll = () => {
    for (let i = open.length - 1; i >= 0; i--) {
      const q = open[i]
      if (!gl.getQueryParameter(q, gl.QUERY_RESULT_AVAILABLE)) continue
      if (!gl.getParameter(ext.GPU_DISJOINT_EXT)) window.__gpu.push(gl.getQueryParameter(q, gl.QUERY_RESULT) / 1e6)
      gl.deleteQuery(q)
      open.splice(i, 1)
    }
  }
  const render = r.render.bind(r)
  r.render = (scene, camera) => {
    poll()
    const q = gl.createQuery()
    gl.beginQuery(ext.TIME_ELAPSED_EXT, q)
    render(scene, camera)
    gl.endQuery(ext.TIME_ELAPSED_EXT)
    open.push(q)
  }
  }
})()`)

const stats = (values: number[]) => {
  const s = [...values].sort((a, b) => a - b)
  const at = (p: number) => s[Math.min(s.length - 1, Math.floor(s.length * p))] ?? NaN
  return `median ${at(0.5).toFixed(1)} ms, p90 ${at(0.9).toFixed(1)}, max ${(s[s.length - 1] ?? NaN).toFixed(1)} (${s.length} frames)`
}
const center = (cid: string) =>
  ev(`(() => { const el = document.getElementById('${cid}'); const r = el.getBoundingClientRect(); window.scrollTo({ top: scrollY + r.top + r.height / 2 - innerHeight / 2, behavior: 'instant' }) })()`)

await ev(`window.scrollTo({ top: 0, behavior: 'instant' })`)
await sleep(1500)
await ev('window.__gpu = []')
await sleep(1500)
console.log(`hero           GPU ${stats((await ev('window.__gpu')) as number[])}`)
// Head/mouse moving the window (pointer sweeping over the hero).
await ev('window.__gpu = []')
for (let i = 0; i <= 60; i++) {
  await send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: W * (0.15 + 0.7 * (i / 60)), y: H * (0.3 + 0.3 * Math.sin(i / 6)) })
  await sleep(25)
}
console.log(`hero moving    GPU ${stats((await ev('window.__gpu')) as number[])}`)
for (const cid of ['manifesto', 'como-funciona', 'recursos', 'bastidores', 'experimente', 'perguntas', 'creditos']) {
  await center(cid)
  await sleep(1500)
  await ev('window.__gpu = []')
  await sleep(1500)
  const tris = await ev('window.__forestRenderer.info.render.triangles')
  console.log(`${cid.padEnd(14)} GPU ${stats((await ev('window.__gpu')) as number[])}  · ${(tris / 1e6).toFixed(2)} M triangles`)
}
const top = await ev(`document.querySelector('.forest-journey').getBoundingClientRect().top + scrollY`)
const end = await ev(`document.querySelector('.forest-journey').getBoundingClientRect().bottom + scrollY - innerHeight`)
await ev(`window.scrollTo({ top: ${top}, behavior: 'instant' })`)
await sleep(1500)
await ev('window.__gpu = []')
await ev(`new Promise(res => { const t0 = performance.now(); const step = (t) => { const k = Math.min(1, (t - t0) / 8000); window.scrollTo({ top: ${top} + (${end} - ${top}) * k, behavior: 'instant' }); if (k < 1) requestAnimationFrame(step); else res() }; requestAnimationFrame(step) })`)
await sleep(500)
console.log(`scroll         GPU ${stats((await ev('window.__gpu')) as number[])}`)
ws.close()
proc.kill()
