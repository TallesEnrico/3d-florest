import { requestCamera } from '../../headTracking/controls.ts'
import { useHeadTrackingStore } from '../../headTracking/store/headTrackingStore.ts'
import { HERO_ID } from '../config/landingContent.ts'
import { scrollToSection } from '../utils/scrollToSection.ts'

interface CameraCtaProps {
  className?: string
  /** Runs after the click (e.g. closing the mobile menu). */
  onActivate?: () => void
}

/**
 * Primary call to action: starts the camera inside the click (keeps the user gesture for the
 * permission prompt) and brings the hero into view. Hidden on touch screens (landing plan D7).
 */
export function CameraCta({ className, onActivate }: CameraCtaProps) {
  const cameraOn = useHeadTrackingStore((state) => state.source === 'webcam')

  const handleClick = () => {
    requestCamera()
    scrollToSection(HERO_ID)
    onActivate?.()
  }

  return (
    <button type="button" className={`button button--primary camera-only ${className ?? ''}`} onClick={handleClick}>
      {cameraOn ? 'Voltar à janela' : 'Ativar câmera'}
    </button>
  )
}
