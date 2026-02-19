/**
 * yt-dlp download API client.
 * Backend must have yt-dlp and ffmpeg installed.
 */

const API_BASE = '/api/ytdl'

export type DownloadFormat = 'mp3' | 'wav' | 'mp4'

export type DownloadQuality =
  | '128'   // MP3 128 kbps
  | '192'   // MP3 192 kbps
  | '320'   // MP3 320 kbps
  | 'lossless'  // WAV
  | '720p'  // MP4
  | '1080p' // MP4
  | '4k'    // MP4

export interface YtdlDownloadRequest {
  url: string
  format: DownloadFormat
  quality: DownloadQuality
}

export interface YtdlDownloadResponse {
  ok: boolean
  filename?: string
  error?: string
}

/** Request a download; returns blob URL or error */
export async function requestYtdlDownload(
  req: YtdlDownloadRequest
): Promise<{ blobUrl: string; filename: string } | { error: string }> {
  const res = await fetch(`${API_BASE}/download`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(req),
    signal: AbortSignal.timeout(300000), // 5 min for large files
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    return { error: err.error ?? `HTTP ${res.status}` }
  }

  const blob = await res.blob()
  const disposition = res.headers.get('Content-Disposition')
  const filename =
    disposition?.match(/filename="?([^";\n]+)"?/)?.[1] ??
    `download.${req.format === 'mp4' ? 'mp4' : req.format}`

  const blobUrl = URL.createObjectURL(blob)
  return { blobUrl, filename }
}
