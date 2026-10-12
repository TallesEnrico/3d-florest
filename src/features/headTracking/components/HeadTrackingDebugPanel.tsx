import { useHeadTrackingStore } from '../store/headTrackingStore.ts'
import type { HeadTrackingControls } from '../types/index.ts'

const format = (value: number) => (value >= 0 ? '+' : '') + value.toFixed(2)

interface HeadTrackingDebugPanelProps {
  controls: HeadTrackingControls
}

/** Developer panel (`?debug`, or the `D` key). Subscribes to every store update. */
export function HeadTrackingDebugPanel({ controls }: HeadTrackingDebugPanelProps) {
  const state = useHeadTrackingStore()
  const usingWebcam = state.source === 'webcam'

  return (
    <aside className="tracking-debug" aria-label="Depuração do rastreamento">
      <dl>
        <dt>Webcam</dt>
        <dd data-status={state.webcam}>{state.webcam}</dd>
        <dt>Rastreamento</dt>
        <dd data-status={state.tracking}>{state.tracking}</dd>
        <dt>Fonte</dt>
        <dd>{state.source}</dd>
        <dt>Offset X / Y</dt>
        <dd>
          {format(state.offset.x)} / {format(state.offset.y)}
        </dd>
        <dt>Inclinação</dt>
        <dd>{usingWebcam ? `${format(state.pitch)}°` : '—'}</dd>
        <dt>Navegação</dt>
        <dd data-status={state.navigation ? 'active' : undefined}>
          {state.navigation
            ? state.gesture.engaged
              ? `${state.gesture.direction} ▶ ${Math.round(state.gesture.intensity * 100)}%`
              : `${state.gesture.direction ?? '—'} ${Math.round(state.gesture.progress * 100)}%`
            : 'off'}
        </dd>
        <dt>Confiança</dt>
        <dd>
          {usingWebcam ? (
            <meter min={0} max={1} low={0.4} high={0.75} optimum={1} value={state.confidence}>
              {state.confidence.toFixed(2)}
            </meter>
          ) : (
            '—'
          )}
          {usingWebcam && <span> {state.confidence.toFixed(2)}</span>}
        </dd>
        <dt>Inferência</dt>
        <dd>
          {usingWebcam ? `${state.inferenceMs.toFixed(1)} ms · ${state.delegate ?? '—'}` : '—'}
        </dd>
        {state.errorDetail && (
          <>
            <dt>Erro</dt>
            <dd className="tracking-debug__error">{state.errorDetail}</dd>
          </>
        )}
      </dl>
      <button type="button" onClick={controls.recalibrate} disabled={!usingWebcam}>
        Recalibrar
      </button>
    </aside>
  )
}
