/**
 * Cobalt API integration for video/audio downloads.
 * @see https://github.com/imputnet/cobalt
 *
 * Configure VITE_COBALT_API_URL in .env (default: https://api.cobalt.tools).
 * Hosted instances may use bot protection — consider self-hosting.
 */

const API_BASE = '/api/cobalt'

export type CobaltStatus = 'tunnel' | 'redirect' | 'picker' | 'local-processing' | 'error'

export interface CobaltTunnelResponse {
  status: 'tunnel' | 'redirect'
  url: string
  filename: string
}

export interface CobaltPickerItem {
  type: 'photo' | 'video' | 'gif'
  url: string
  thumb?: string
}

export interface CobaltPickerResponse {
  status: 'picker'
  picker: CobaltPickerItem[]
  audio?: string
  audioFilename?: string
}

export interface CobaltErrorResponse {
  status: 'error'
  error: { code: string; context?: Record<string, unknown> }
}

export type CobaltResponse =
  | CobaltTunnelResponse
  | CobaltPickerResponse
  | CobaltErrorResponse
  | { status: 'local-processing'; [key: string]: unknown }

export interface CobaltRequest {
  url: string
  videoQuality?: string
  audioFormat?: string
  downloadMode?: 'auto' | 'audio' | 'mute'
  filenameStyle?: string
}

/** Request a download from Cobalt API */
export async function requestDownload(
  youtubeUrl: string,
  options?: Partial<CobaltRequest>
): Promise<CobaltResponse> {
  if (!youtubeUrl?.trim() || !youtubeUrl.includes('youtube.com')) {
    throw new Error('Invalid YouTube URL')
  }
  const body: CobaltRequest = {
    url: youtubeUrl,
    videoQuality: '1080',
    downloadMode: 'auto',
    filenameStyle: 'basic',
    ...options,
  }

  const res = await fetch(API_BASE, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(60000),
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    const code = err.error?.code ?? `HTTP ${res.status}`
    // api.cobalt.tools uses bot protection; suggest self-hosting for reliability
    const hint = res.status === 400 ? ' The hosted API may block requests. Try self-hosting Cobalt (see .env COBALT_API_URL).' : ''
    throw new Error(`${code}${hint}`)
  }

  return res.json()
}

/** Fetch a direct stream URL for playback (custom player). Returns null on failure. */
export async function fetchStreamUrl(youtubeUrl: string): Promise<string | null> {
  if (!youtubeUrl?.trim() || !youtubeUrl.includes('youtube.com')) return null
  try {
    const res = await requestDownload(youtubeUrl)
    if (res.status === 'tunnel' || res.status === 'redirect') return res.url
    if (res.status === 'picker' && res.picker?.length) {
      const video = res.picker.find((p) => p.type === 'video')
      return video?.url ?? res.picker[0]?.url ?? null
    }
  } catch {
    /* ignore */
  }
  return null
}

/** Trigger download from URL (opens in new tab or starts download) */
export function triggerDownload(url: string, filename?: string) {
  const a = document.createElement('a')
  a.href = url
  a.download = filename ?? ''
  a.target = '_blank'
  a.rel = 'noopener noreferrer'
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
}
