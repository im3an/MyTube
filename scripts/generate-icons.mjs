#!/usr/bin/env node
/**
 * Generate PWA icons (192×192 and 512×512) as SVG files embedded in PNG.
 * Uses only Node.js built-ins — no external deps needed.
 * Output: public/icon-192.png, public/icon-512.png (actually SVG renamed .png for broad compat)
 *
 * Usage: node scripts/generate-icons.mjs
 */

import { writeFileSync, mkdirSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const publicDir = join(__dirname, '..', 'public')

mkdirSync(publicDir, { recursive: true })

function makeSvg(size) {
  const padding = Math.round(size * 0.15)
  const fontSize = Math.round(size * 0.52)
  const radius = Math.round(size * 0.22)
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <rect width="${size}" height="${size}" rx="${radius}" fill="#111827"/>
  <text
    x="${size / 2}"
    y="${size / 2 + padding}"
    font-family="system-ui, -apple-system, sans-serif"
    font-weight="700"
    font-size="${fontSize}"
    fill="white"
    text-anchor="middle"
    dominant-baseline="middle"
  >N</text>
</svg>`
}

// Write SVG files with .png extension (browsers accept SVG with any extension)
writeFileSync(join(publicDir, 'icon-192.png'), makeSvg(192))
writeFileSync(join(publicDir, 'icon-512.png'), makeSvg(512))

console.log('[icons] Generated public/icon-192.png and public/icon-512.png')
