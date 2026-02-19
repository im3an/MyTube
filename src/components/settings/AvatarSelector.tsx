/**
 * Profile picture selector: presets + upload with resize & compress.
 */

import { useRef } from 'react'
import { Avatar } from '@/components/base/avatar/avatar'

const PRESETS = [
  'preset:1', 'preset:2', 'preset:3', 'preset:4', 'preset:5', 'preset:6',
  'preset:7', 'preset:8', 'preset:9', 'preset:10', 'preset:11', 'preset:12',
]

/** Generate a data URL for a preset avatar. */
function presetToDataUrl(key: string): string {
  const idx = parseInt(key.replace('preset:', ''), 10) || 1
  const svg = PRESET_SVGS[(idx - 1) % PRESET_SVGS.length]
  return `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(svg)))}`
}

/** Cool preset SVG avatars: gradients, patterns, abstract shapes */
const PRESET_SVGS: string[] = [
  /* 1 – Sunset */
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><defs><linearGradient id="g1" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" style="stop-color:#ff6b6b"/><stop offset="100%" style="stop-color:#feca57"/></linearGradient></defs><rect fill="url(#g1)" width="100" height="100"/><circle cx="50" cy="45" r="12" fill="white" opacity="0.9"/></svg>`,
  /* 2 – Ocean */
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><defs><linearGradient id="g2" x1="0%" y1="100%" x2="0%" y2="0%"><stop offset="0%" style="stop-color:#0c2461"/><stop offset="100%" style="stop-color:#74b9ff"/></linearGradient></defs><rect fill="url(#g2)" width="100" height="100"/><circle cx="30" cy="70" r="8" fill="white" opacity="0.4"/><circle cx="70" cy="60" r="6" fill="white" opacity="0.5"/></svg>`,
  /* 3 – Forest */
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><defs><linearGradient id="g3" x1="0%" y1="100%" x2="50%" y2="0%"><stop offset="0%" style="stop-color:#2d5016"/><stop offset="100%" style="stop-color:#55efc4"/></linearGradient></defs><rect fill="url(#g3)" width="100" height="100"/><polygon fill="white" opacity="0.3" points="50,20 80,70 20,70"/></svg>`,
  /* 4 – Aurora */
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><defs><linearGradient id="g4" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" style="stop-color:#00b894"/><stop offset="50%" style="stop-color:#0984e3"/><stop offset="100%" style="stop-color:#6c5ce7"/></linearGradient></defs><rect fill="url(#g4)" width="100" height="100"/><path d="M0 50 Q25 30 50 50 T100 50" stroke="white" stroke-width="4" fill="none" opacity="0.6"/></svg>`,
  /* 5 – Fire */
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><defs><radialGradient id="g5" cx="50%" cy="50%" r="50%"><stop offset="0%" style="stop-color:#ffeaa7"/><stop offset="50%" style="stop-color:#fdcb6e"/><stop offset="100%" style="stop-color:#e17055"/></radialGradient></defs><rect fill="url(#g5)" width="100" height="100"/><path d="M50 25 L65 55 L50 45 L35 55 Z" fill="white" opacity="0.5"/></svg>`,
  /* 6 – Cosmic */
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><defs><radialGradient id="g6" cx="30%" cy="30%" r="70%"><stop offset="0%" style="stop-color:#a29bfe"/><stop offset="100%" style="stop-color:#2d3436"/></radialGradient></defs><rect fill="url(#g6)" width="100" height="100"/><circle cx="75" cy="25" r="3" fill="white"/><circle cx="25" cy="75" r="2" fill="white" opacity="0.8"/><circle cx="50" cy="50" r="4" fill="white" opacity="0.4"/></svg>`,
  /* 7 – Geometric hexagon */
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><defs><linearGradient id="g7" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" style="stop-color:#fd79a8"/><stop offset="100%" style="stop-color:#e84393"/></linearGradient></defs><rect fill="url(#g7)" width="100" height="100"/><polygon fill="white" opacity="0.5" points="50,15 85,35 85,65 50,85 15,65 15,35"/></svg>`,
  /* 8 – Dot pattern */
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><defs><linearGradient id="g8" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" style="stop-color:#00cec9"/><stop offset="100%" style="stop-color:#0984e3"/></linearGradient></defs><rect fill="url(#g8)" width="100" height="100"/><circle cx="30" cy="30" r="6" fill="white" opacity="0.6"/><circle cx="70" cy="30" r="6" fill="white" opacity="0.6"/><circle cx="50" cy="60" r="8" fill="white" opacity="0.5"/></svg>`,
  /* 9 – Minimalist */
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect fill="#636e72" width="100" height="100"/><circle cx="50" cy="40" r="12" fill="none" stroke="white" stroke-width="3" opacity="0.9"/><path d="M35 75 Q50 55 65 75" stroke="white" stroke-width="2" fill="none" opacity="0.8"/></svg>`,
  /* 10 – Coral */
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><defs><linearGradient id="g10" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" style="stop-color:#ff7675"/><stop offset="100%" style="stop-color:#fd79a8"/></linearGradient></defs><rect fill="url(#g10)" width="100" height="100"/><circle cx="50" cy="50" r="25" fill="white" opacity="0.2"/><circle cx="50" cy="50" r="15" fill="white" opacity="0.3"/></svg>`,
  /* 11 – Midnight */
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><defs><linearGradient id="g11" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" style="stop-color:#192a56"/><stop offset="100%" style="stop-color:#0f3460"/></linearGradient></defs><rect fill="url(#g11)" width="100" height="100"/><path d="M50 20 L55 45 L75 45 L60 60 L65 85 L50 70 L35 85 L40 60 L25 45 L45 45 Z" fill="#f1c40f" opacity="0.9"/></svg>`,
  /* 12 – Mint */
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><defs><linearGradient id="g12" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" style="stop-color:#00b894"/><stop offset="100%" style="stop-color:#81ecec"/></linearGradient></defs><rect fill="url(#g12)" width="100" height="100"/><circle cx="50" cy="50" r="18" fill="none" stroke="white" stroke-width="4" opacity="0.6"/></svg>`,
]

export function resolveAvatarUrl(url: string | null | undefined): string | undefined {
  if (!url) return undefined
  if (url.startsWith('preset:')) return presetToDataUrl(url)
  return url
}

const MAX_SIZE = 256
const JPEG_QUALITY = 0.82
const MAX_BYTES = 80_000 // ~80KB target

/** Resize and compress an image file to a small JPEG data URL */
async function resizeAndCompress(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const url = URL.createObjectURL(file)
    img.onload = () => {
      URL.revokeObjectURL(url)
      const w = img.width
      const h = img.height
      const scale = Math.min(MAX_SIZE / w, MAX_SIZE / h, 1)
      const cw = Math.round(w * scale)
      const ch = Math.round(h * scale)
      const canvas = document.createElement('canvas')
      canvas.width = cw
      canvas.height = ch
      const ctx = canvas.getContext('2d')
      if (!ctx) {
        reject(new Error('Canvas not available'))
        return
      }
      ctx.drawImage(img, 0, 0, cw, ch)

      let quality = JPEG_QUALITY
      let dataUrl = canvas.toDataURL('image/jpeg', quality)
      while (dataUrl.length > MAX_BYTES && quality > 0.3) {
        quality -= 0.1
        dataUrl = canvas.toDataURL('image/jpeg', quality)
      }
      resolve(dataUrl)
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('Failed to load image'))
    }
    img.src = url
  })
}

interface AvatarSelectorProps {
  currentAvatarUrl: string | null
  onSelect: (avatarUrl: string | null) => void
}

export function AvatarSelector({ currentAvatarUrl, onSelect }: AvatarSelectorProps) {
  const inputRef = useRef<HTMLInputElement>(null)

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !file.type.startsWith('image/')) return
    try {
      const dataUrl = await resizeAndCompress(file)
      onSelect(dataUrl)
    } catch {
      // fallback: use original if resize fails
      const reader = new FileReader()
      reader.onload = () => {
        const result = reader.result as string
        if (result && result.length < 200_000) onSelect(result)
      }
      reader.readAsDataURL(file)
    }
    e.target.value = ''
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap justify-center gap-3">
        {PRESETS.map((key) => {
          const dataUrl = presetToDataUrl(key)
          const isSelected =
            currentAvatarUrl === key ||
            currentAvatarUrl === dataUrl ||
            (currentAvatarUrl?.startsWith('preset:') && currentAvatarUrl === key)
          return (
            <button
              key={key}
              type="button"
              onClick={() => onSelect(key)}
              className={`rounded-full ring-2 transition-all ${
                isSelected
                  ? 'ring-primary ring-offset-2 dark:ring-offset-gray-900'
                  : 'ring-transparent hover:ring-gray-300'
              }`}
            >
              <Avatar src={dataUrl} alt="" size="md" className="size-12" />
            </button>
          )
        })}
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="flex size-12 shrink-0 items-center justify-center rounded-full border-2 border-dashed border-gray-300 bg-gray-50 text-gray-500 transition-colors hover:border-gray-400 hover:bg-gray-100 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-400 dark:hover:border-gray-500"
        >
          +
        </button>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFileChange}
        />
      </div>
      {currentAvatarUrl && currentAvatarUrl.startsWith('data:') && (
        <p className="text-center text-xs text-gray-500 dark:text-gray-400">
          Custom image (resized & compressed for fast loading)
        </p>
      )}
    </div>
  )
}
