import type { WebcamStatus } from '../types/index.ts'

export interface WebcamOptions {
  width: number
  height: number
  frameRate: number
}

export class WebcamError extends Error {
  readonly status: Extract<WebcamStatus, 'denied' | 'unavailable' | 'insecure' | 'error'>

  constructor(status: WebcamError['status'], detail: string) {
    super(detail)
    this.status = status
  }
}

/** Maps getUserMedia failures (by DOMException name) to a user-facing status. */
function classify(error: unknown): WebcamError {
  const name = error instanceof DOMException ? error.name : ''
  const detail = error instanceof Error ? `${error.name}: ${error.message}` : String(error)
  if (name === 'NotAllowedError' || name === 'SecurityError') return new WebcamError('denied', detail)
  if (name === 'NotFoundError' || name === 'NotReadableError' || name === 'OverconstrainedError') {
    return new WebcamError('unavailable', detail)
  }
  return new WebcamError('error', detail)
}

/**
 * Opens the front camera into a hidden, muted <video> that MediaPipe reads from.
 * The element is kept in the DOM (some browsers stop decoding detached videos) but invisible.
 */
export async function openWebcam(options: WebcamOptions): Promise<HTMLVideoElement> {
  if (!window.isSecureContext) {
    throw new WebcamError('insecure', 'Camera requires a secure context (HTTPS or localhost)')
  }
  if (!navigator.mediaDevices?.getUserMedia) {
    throw new WebcamError('unavailable', 'navigator.mediaDevices.getUserMedia is not available')
  }

  let stream: MediaStream
  try {
    stream = await navigator.mediaDevices.getUserMedia({
      audio: false,
      video: {
        facingMode: 'user',
        width: { ideal: options.width },
        height: { ideal: options.height },
        frameRate: { ideal: options.frameRate },
      },
    })
  } catch (error) {
    throw classify(error)
  }

  const video = document.createElement('video')
  video.muted = true
  video.playsInline = true
  video.setAttribute('aria-hidden', 'true')
  video.style.cssText =
    'position:fixed;left:0;top:0;width:1px;height:1px;opacity:0;pointer-events:none'
  video.srcObject = stream
  document.body.append(video)

  try {
    await video.play()
  } catch (error) {
    closeWebcam(video)
    throw classify(error)
  }
  return video
}

/** Stops every track (turns the camera light off) and removes the element. */
export function closeWebcam(video: HTMLVideoElement | null): void {
  if (!video) return
  const stream = video.srcObject as MediaStream | null
  stream?.getTracks().forEach((track) => track.stop())
  video.srcObject = null
  video.remove()
}
