/**
 * Parse WebVTT (and JSON3) subtitle content into timed cues.
 * Piped returns VTT or JSON3 format.
 */

export interface SubtitleCue {
  start: number
  end: number
  text: string
}

/** Parse WebVTT content into cues */
export function parseVTT(content: string): SubtitleCue[] {
  const cues: SubtitleCue[] = []
  const lines = content.split(/\r?\n/)
  let i = 0

  // Skip WEBVTT header and optional metadata
  while (i < lines.length && (lines[i].startsWith('WEBVTT') || lines[i].startsWith('NOTE') || lines[i] === '')) {
    i++
  }

  while (i < lines.length) {
    let timeLine = lines[i]
    let textStart = i + 1

    // Skip empty lines
    if (!timeLine?.trim()) {
      i++
      continue
    }

    // If current line is not timestamp, next might be (cue id format)
    if (!timeLine.includes('-->')) {
      timeLine = lines[i + 1]
      textStart = i + 2
    }
    if (!timeLine?.includes('-->')) {
      i++
      continue
    }

    const match = timeLine.match(/(\d{2}):(\d{2}):(\d{2})\.(\d{3})\s*-->\s*(\d{2}):(\d{2}):(\d{2})\.(\d{3})/)
    if (!match) {
      // Try MM:SS.mmm format
      const shortMatch = timeLine.match(/(\d{2}):(\d{2})\.(\d{3})\s*-->\s*(\d{2}):(\d{2})\.(\d{3})/)
      if (!shortMatch) {
        i = textStart
        continue
      }
      const start =
        parseInt(shortMatch[1], 10) * 60 +
        parseInt(shortMatch[2], 10) +
        parseInt(shortMatch[3], 10) / 1000
      const end =
        parseInt(shortMatch[4], 10) * 60 +
        parseInt(shortMatch[5], 10) +
        parseInt(shortMatch[6], 10) / 1000
      const textLines: string[] = []
      let j = textStart
      while (j < lines.length && lines[j]?.trim()) {
        textLines.push(lines[j].replace(/<[^>]+>/g, '').trim())
        j++
      }
      cues.push({ start, end, text: textLines.join(' ') })
      i = j + 1
      continue
    }

    const start =
      parseInt(match[1], 10) * 3600 +
      parseInt(match[2], 10) * 60 +
      parseInt(match[3], 10) +
      parseInt(match[4], 10) / 1000
    const end =
      parseInt(match[5], 10) * 3600 +
      parseInt(match[6], 10) * 60 +
      parseInt(match[7], 10) +
      parseInt(match[8], 10) / 1000

    const textLines: string[] = []
    let j = textStart
    while (j < lines.length && lines[j]?.trim()) {
      textLines.push(lines[j].replace(/<[^>]+>/g, '').trim())
      j++
    }
    cues.push({ start, end, text: textLines.join(' ') })
    i = j + 1
  }

  return cues
}

/** Parse YouTube JSON3 format */
export function parseJSON3(content: string): SubtitleCue[] {
  try {
    const data = JSON.parse(content)
    const events = data.events ?? []
    const cues: SubtitleCue[] = []
    for (const ev of events) {
      if (ev.tStartMs != null && ev.dDurationMs != null && ev.segs) {
        const text = ev.segs
          .map((s: { utf8?: string }) => s.utf8 ?? '')
          .join('')
          .replace(/\n/g, ' ')
          .trim()
        if (text) {
          cues.push({
            start: ev.tStartMs / 1000,
            end: (ev.tStartMs + ev.dDurationMs) / 1000,
            text,
          })
        }
      }
    }
    return cues
  } catch {
    return []
  }
}

/** Fetch and parse subtitle from URL (direct or via proxy) */
export async function fetchSubtitles(url: string): Promise<SubtitleCue[]> {
  let text: string
  try {
    const res = await fetch(url)
    if (!res.ok) throw new Error('Failed')
    text = await res.text()
  } catch {
    // Fallback: proxy (Vite dev server or backend)
    const proxyUrl = `/api/subtitles?url=${encodeURIComponent(url)}`
    const res = await fetch(proxyUrl)
    if (!res.ok) throw new Error('Failed to fetch subtitles')
    text = await res.text()
  }

  // Try JSON3 first (YouTube format)
  const trimmed = text.trim()
  if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
    const cues = parseJSON3(text)
    if (cues.length > 0) return cues
  }

  return parseVTT(text)
}
