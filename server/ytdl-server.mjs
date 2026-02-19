#!/usr/bin/env node
/**
 * yt-dlp download server.
 * Requires: yt-dlp, ffmpeg (for MP4 merge)
 * Run: node server/ytdl-server.mjs
 */

import { createServer } from 'http'
import { spawn } from 'child_process'
import { mkdtempSync, rmSync, readdirSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'

const PORT = Number(process.env.YTDL_PORT) || 3001
const CORS_ORIGIN = process.env.CORS_ORIGIN || '*'

function parseBody(req) {
  return new Promise((resolve, reject) => {
    let body = ''
    req.on('data', (chunk) => { body += chunk })
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {})
      } catch {
        reject(new Error('Invalid JSON'))
      }
    })
    req.on('error', reject)
  })
}

function safeRmSync(path) {
  try {
    rmSync(path, { recursive: true, force: true })
  } catch (e) {
    console.warn(`[ytdl] Could not clean temp dir ${path}:`, e.message)
  }
}

function isValidYoutubeUrl(url) {
  if (!url || typeof url !== 'string') return false
  return /youtube\.com|youtu\.be/i.test(url.trim())
}

function buildYtdlArgs(url, format, quality) {
  const args = ['--no-warnings', '--no-playlist', '-o', '%(id)s.%(ext)s', url.trim()]

  if (format === 'mp3') {
    args.push('-x', '--audio-format', 'mp3')
    const q = quality === '128' ? '128K' : quality === '192' ? '192K' : '320K'
    args.push('--audio-quality', q)
  } else if (format === 'wav') {
    args.push('-x', '--audio-format', 'wav')
  } else if (format === 'mp4') {
    const height = quality === '720p' ? 720 : quality === '1080p' ? 1080 : 2160
    args.push('-f', `bestvideo[height<=${height}]+bestaudio/best[height<=${height}]`, '--merge-output-format', 'mp4')
  }

  return args
}

async function runYtdl(url, format, quality) {
  const tmpDir = mkdtempSync(join(tmpdir(), 'ytdl-'))
  const args = buildYtdlArgs(url, format, quality)

  return new Promise((resolve, reject) => {
    const proc = spawn('yt-dlp', args, {
      cwd: tmpDir,
      stdio: ['ignore', 'pipe', 'pipe'],
    })

    let stderr = ''
    proc.stderr?.on('data', (d) => { stderr += d.toString() })
    proc.on('error', (err) => {
      safeRmSync(tmpDir)
      reject(new Error(`yt-dlp not found: ${err.message}. Install: pip install yt-dlp`))
    })
    proc.on('close', (code) => {
      if (code !== 0) {
        safeRmSync(tmpDir)
        reject(new Error(stderr || `yt-dlp exited ${code}`))
        return
      }
      const files = readdirSync(tmpDir)
      const file = files[0]
      if (!file) {
        safeRmSync(tmpDir)
        reject(new Error('No output file'))
        return
      }
      resolve({ path: join(tmpDir, file), filename: file, tmpDir })
    })
  })
}

const server = createServer(async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', CORS_ORIGIN)
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') {
    res.writeHead(204)
    res.end()
    return
  }

  if (req.method !== 'POST' || req.url !== '/download') {
    res.writeHead(404, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ error: 'Not found' }))
    return
  }

  try {
    const body = await parseBody(req)
    const { url, format = 'mp3', quality = '320' } = body

    if (!isValidYoutubeUrl(url)) {
      res.writeHead(400, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ error: 'Invalid YouTube URL' }))
      return
    }

    const validFormats = ['mp3', 'wav', 'mp4']
    if (!validFormats.includes(format)) {
      res.writeHead(400, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ error: 'Invalid format' }))
      return
    }

    const { path: filePath, filename, tmpDir } = await runYtdl(url, format, quality)

    const { createReadStream, statSync } = await import('fs')
    const stat = statSync(filePath)
    res.writeHead(200, {
      'Content-Type': format === 'mp4' ? 'video/mp4' : format === 'mp3' ? 'audio/mpeg' : 'audio/wav',
      'Content-Length': stat.size,
      'Content-Disposition': `attachment; filename="${filename}"`,
    })
    createReadStream(filePath).pipe(res).on('finish', () => {
      safeRmSync(tmpDir)
    })
  } catch (err) {
    res.writeHead(500, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ error: err.message || 'Download failed' }))
  }
})

server.listen(PORT, () => {
  console.log(`[ytdl] Server running at http://localhost:${PORT}`)
  console.log('[ytdl] Requires: yt-dlp, ffmpeg')
})
