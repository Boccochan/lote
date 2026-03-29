#!/usr/bin/env node
/**
 * Downloads Microsoft Edge WebDriver into e2e-tauri/.webdrivers/ (Windows x64).
 * Linux/macOS: install platform WebDriver per Tauri docs and set MSEDGEDRIVER_PATH or PATH.
 */
import { spawnSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(__dirname, '..')
const outDir = path.join(root, '.webdrivers')
const exePath = path.join(outDir, 'msedgedriver.exe')

function decodeVersionText(buf) {
  const b = Buffer.from(buf)
  if (b.length >= 2 && b[0] === 0xff && b[1] === 0xfe) {
    return b.slice(2).toString('utf16le').replace(/\0/g, '').trim()
  }
  return b.toString('utf8').trim()
}

async function main() {
  if (process.platform !== 'win32') {
    console.warn(
      '[e2e-tauri] Auto-install is Windows-only. On Linux install WebKitWebDriver; set MSEDGEDRIVER_PATH or PATH.',
    )
    process.exit(0)
  }

  if (fs.existsSync(exePath)) {
    console.log(`[e2e-tauri] Using existing ${exePath}`)
    process.exit(0)
  }

  fs.mkdirSync(outDir, { recursive: true })

  const verRes = await fetch('https://msedgedriver.microsoft.com/LATEST_STABLE')
  if (!verRes.ok) {
    console.error('[e2e-tauri] Failed to fetch LATEST_STABLE:', verRes.status)
    process.exit(1)
  }
  const version = decodeVersionText(await verRes.arrayBuffer()).replace(/\r|\n/g, '')
  if (!/^\d+\.\d+\.\d+\.\d+$/.test(version)) {
    console.error('[e2e-tauri] Unexpected version string:', JSON.stringify(version))
    process.exit(1)
  }

  const zipUrl = `https://msedgedriver.microsoft.com/${version}/edgedriver_win64.zip`
  console.log('[e2e-tauri] Downloading', zipUrl)
  const zipRes = await fetch(zipUrl)
  if (!zipRes.ok) {
    console.error('[e2e-tauri] Download failed:', zipRes.status, zipUrl)
    process.exit(1)
  }
  const zipPath = path.join(outDir, 'edgedriver_win64.zip')
  fs.writeFileSync(zipPath, Buffer.from(await zipRes.arrayBuffer()))

  const expanded = path.join(outDir, 'extracted')
  if (fs.existsSync(expanded)) {
    fs.rmSync(expanded, { recursive: true, force: true })
  }
  fs.mkdirSync(expanded, { recursive: true })

  const ps = spawnSync(
    'powershell.exe',
    [
      '-NoProfile',
      '-Command',
      `Expand-Archive -LiteralPath '${zipPath.replace(/'/g, "''")}' -DestinationPath '${expanded.replace(/'/g, "''")}' -Force`,
    ],
    { stdio: 'inherit' },
  )
  if (ps.status !== 0) {
    console.error('[e2e-tauri] Expand-Archive failed')
    process.exit(1)
  }

  const nested = path.join(expanded, 'msedgedriver.exe')
  if (!fs.existsSync(nested)) {
    console.error('[e2e-tauri] msedgedriver.exe not found after extract:', nested)
    process.exit(1)
  }
  fs.copyFileSync(nested, exePath)
  try {
    fs.unlinkSync(zipPath)
    fs.rmSync(expanded, { recursive: true, force: true })
  } catch {
    /* ignore */
  }
  console.log('[e2e-tauri] Installed', exePath)
}

void main()
