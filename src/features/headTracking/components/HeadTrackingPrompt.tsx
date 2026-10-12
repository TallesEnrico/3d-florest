import { useEffect, useState } from 'react'
import { setHeadNavigation } from '../controls.ts'
import { useHeadTrackingStore } from '../store/headTrackingStore.ts'
import type { HeadTrackingControls, TrackingStatus, WebcamStatus } from '../types/index.ts'

type Action = 'start' | 'retry' | 'recalibrate' | 'navigate' | 'stop' | 'cancel'

interface PromptContent {
  message: string
  actions: Action[]
  busy?: boolean
}

// While tracking is stable, the prompt fades back so the scene stays the protagonist.
const QUIET_AFTER_MS = 3500

const PRIVACY_NOTE = 'O vídeo é processado só no seu navegador. Nada é gravado ou enviado.'

function describe(webcam: WebcamStatus, tracking: TrackingStatus): PromptContent {
  switch (webcam) {
    case 'requesting':
      return {
        message: 'Permita o acesso à câmera na janela do navegador.',
        // Always a way out: some browsers keep the permission prompt pending indefinitely.
        actions: ['cancel'],
        busy: true,
      }
    case 'denied':
      return {
        message:
          'A câmera está bloqueada para este site. Libere-a no ícone de cadeado da barra de endereço. Enquanto isso, o mouse controla a cena.',
        actions: ['retry'],
      }
    case 'unavailable':
      return {
        message:
          'Nenhuma câmera disponível, ou ela está em uso por outro app. Enquanto isso, o mouse controla a cena.',
        actions: ['retry'],
      }
    case 'insecure':
      return {
        message: 'A câmera só funciona em conexão segura (https). O mouse controla a cena.',
        actions: [],
      }
    case 'error':
      return {
        message: 'Não foi possível iniciar o rastreamento. O mouse controla a cena.',
        actions: ['retry'],
      }
    case 'active':
      if (tracking === 'loading') {
        return { message: 'Preparando o rastreamento…', actions: ['stop'], busy: true }
      }
      if (tracking === 'calibrating') {
        return { message: 'Olhe para a tela e fique parado por um instante…', actions: ['stop'], busy: true }
      }
      if (tracking === 'searching') {
        return { message: 'Procurando seu rosto. Posicione-se de frente para a câmera.', actions: ['stop'] }
      }
      return {
        message: 'Mova a cabeça para olhar pela janela.',
        actions: ['recalibrate', 'navigate', 'stop'],
      }
    case 'idle':
      return { message: 'Mova o mouse para explorar, ou use a cabeça.', actions: ['start'] }
  }
}

const LABELS: Record<Exclude<Action, 'navigate'>, string> = {
  start: 'Ativar câmera',
  retry: 'Tentar de novo',
  recalibrate: 'Recentralizar',
  stop: 'Desligar câmera',
  cancel: 'Cancelar',
}

/** True once `condition` has held for `delayMs` (resets as soon as it stops holding). */
function useHeldFor(condition: boolean, delayMs: number): boolean {
  const [held, setHeld] = useState(false)
  useEffect(() => {
    if (!condition) return
    const timer = window.setTimeout(() => setHeld(true), delayMs)
    return () => {
      window.clearTimeout(timer)
      setHeld(false)
    }
  }, [condition, delayMs])
  return condition && held
}

interface HeadTrackingPromptProps {
  controls: HeadTrackingControls
}

/** Discreet status line + actions at the bottom of the screen. */
export function HeadTrackingPrompt({ controls }: HeadTrackingPromptProps) {
  const webcam = useHeadTrackingStore((state) => state.webcam)
  const tracking = useHeadTrackingStore((state) => state.tracking)
  const navigation = useHeadTrackingStore((state) => state.navigation)
  const { message, actions, busy } = describe(webcam, tracking)
  const quiet = useHeldFor(webcam === 'active' && tracking === 'tracking', QUIET_AFTER_MS)

  const run: Record<Action, () => void> = {
    start: () => void controls.start(),
    retry: () => void controls.start(),
    recalibrate: controls.recalibrate,
    navigate: () => setHeadNavigation(!navigation),
    stop: controls.stop,
    cancel: controls.stop,
  }

  return null;

  return (
    <section
      // camera-only: hidden on touch screens, where the camera is not offered (landing plan D7).
      className={`tracking-prompt camera-only${quiet ? ' tracking-prompt--quiet' : ''}`}
      aria-label="Controle por câmera"
    >
      {/* key → the message fades in whenever it changes */}
      <p
        key={message}
        className="tracking-prompt__message"
        role="status"
        aria-live="polite"
        aria-busy={busy}
      >
        {busy && <span className="tracking-prompt__pulse" aria-hidden="true" />}
        {message}
      </p>
      {actions.length > 0 && (
        <div className="tracking-prompt__actions">
          {actions.map((action) => (
            <button
              key={action}
              type="button"
              className={`tracking-prompt__button tracking-prompt__button--${action}`}
              aria-pressed={action === 'navigate' ? navigation : undefined}
              onClick={run[action]}
            >
              {action === 'navigate'
                ? navigation
                  ? 'Parar navegação'
                  : 'Navegar com a cabeça'
                : LABELS[action]}
            </button>
          ))}
        </div>
      )}
      {webcam === 'idle' && <p className="tracking-prompt__note">{PRIVACY_NOTE}</p>}
    </section>
  )
}
