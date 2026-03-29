#!/usr/bin/env node
/**
 * Builds capture-timeline.mp4 from numbered PNGs in docs/pr-assets/tauri-desktop/
 * if ffmpeg is on PATH. Non-fatal when ffmpeg is missing.
 */
import { spawnSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'

const root = process.cwd()
const dir = path.join(root, 'docs', 'pr-assets', 'tauri-desktop')
const pattern = /^\d{2}-.*\.png$/i

if (!fs.existsSync(dir)) {
  process.exit(0)
}

const files = fs.readdirSync(dir).filter((f) => pattern.test(f)).sort()
if (files.length === 0) {
  process.exit(0)
}

const ffmpeg = spawnSync('ffmpeg', ['-version'], { encoding: 'utf8' })
if (ffmpeg.status !== 0) {
  console.warn(
    '[e2e-tauri] ffmpeg not found; skipping capture-timeline.mp4 (PNG captures are still in docs/pr-assets/tauri-desktop/)',
  )
  process.exit(0)
}

const listPath = path.join(dir, '.ffmpeg-concat.txt')
const relLines = []
for (const f of files) {
  relLines.push(`file '${f.replace(/'/g, `'\\''`)}'`)
  relLines.push('duration 1.8')
}
relLines.push(`file '${files.at(-1).replace(/'/g, `'\\''`)}'`)
fs.writeFileSync(listPath, relLines.join('\n'), 'utf8')

const out = path.join(dir, 'capture-timeline.mp4')
const r = spawnSync(
  'ffmpeg',
  [
    '-y',
    '-f',
    'concat',
    '-safe',
    '0',
    '-i',
    listPath,
    '-vf',
    'format=yuv420p',
    '-movflags',
    '+faststart',
    out,
  ],
  { stdio: 'inherit', cwd: dir },
)

try {
  fs.unlinkSync(listPath)
} catch {
  /* ignore */
}

if (r.status !== 0) {
  console.warn('[e2e-tauri] ffmpeg concat failed; PNGs are unchanged.')
  process.exit(0)
}

console.log(`[e2e-tauri] Wrote ${out}`)
