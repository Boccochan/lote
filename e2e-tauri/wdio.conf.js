import { spawn, spawnSync } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(__dirname, '..')

let tauriDriver
let exit = false

function tauriBinary() {
  const name = process.platform === 'win32' ? 'app.exe' : 'app'
  return path.join(root, 'src-tauri', 'target', 'debug', name)
}

function tauriDriverBinary() {
  if (process.env.TAURI_DRIVER) {
    return process.env.TAURI_DRIVER
  }
  const base = path.join(os.homedir(), '.cargo', 'bin', 'tauri-driver')
  return process.platform === 'win32' ? `${base}.exe` : base
}

/** Edge WebDriver for Windows (tauri-driver); Linux uses WebKitWebDriver on PATH. */
function resolveNativeWebDriver() {
  if (process.env.MSEDGEDRIVER_PATH && fs.existsSync(process.env.MSEDGEDRIVER_PATH)) {
    return process.env.MSEDGEDRIVER_PATH
  }
  const bundled = path.join(__dirname, '.webdrivers', 'msedgedriver.exe')
  if (process.platform === 'win32' && fs.existsSync(bundled)) {
    return bundled
  }
  try {
    const cmd = process.platform === 'win32' ? 'where' : 'which'
    const out = spawnSync(cmd, ['msedgedriver'], {
      encoding: 'utf8',
      shell: process.platform === 'win32',
    })
    if (out.status === 0 && out.stdout?.trim()) {
      const first = out.stdout.trim().split(/\r?\n/)[0]
      if (fs.existsSync(first)) {
        return first
      }
    }
  } catch {
    /* ignore */
  }
  return null
}

export const config = {
  hostname: '127.0.0.1',
  port: 4444,
  specs: [path.join(__dirname, 'specs', '**', '*.e2e.js')],
  maxInstances: 1,
  capabilities: [
    {
      maxInstances: 1,
      'tauri:options': {
        application: tauriBinary(),
      },
    },
  ],
  reporters: ['spec'],
  framework: 'mocha',
  mochaOpts: {
    ui: 'bdd',
    timeout: 120_000,
  },

  onPrepare: () => {
    const outDir = path.join(root, 'docs', 'pr-assets', 'tauri-desktop')
    fs.mkdirSync(outDir, { recursive: true })
    const build = spawnSync('npm', ['run', 'tauri', 'build', '--', '--debug', '--no-bundle'], {
      cwd: root,
      stdio: 'inherit',
      shell: true,
    })
    if (build.status !== 0) {
      process.exit(build.status ?? 1)
    }
    if (!fs.existsSync(tauriBinary())) {
      console.error(`Expected Tauri binary missing: ${tauriBinary()}`)
      process.exit(1)
    }
  },

  beforeSession: () => {
    const driverPath = tauriDriverBinary()
    if (!fs.existsSync(driverPath)) {
      console.error(
        `tauri-driver not found at ${driverPath}. Install with: cargo install tauri-driver --locked`,
      )
      process.exit(1)
    }
    const native = resolveNativeWebDriver()
    if (process.platform === 'win32' && !native) {
      console.error(
        'msedgedriver.exe not found. Run: npm run e2e:tauri:install-driver\n' +
          'Or install Edge WebDriver from Microsoft and set MSEDGEDRIVER_PATH.',
      )
      process.exit(1)
    }
    const args = native ? ['--native-driver', native] : []
    tauriDriver = spawn(driverPath, args, { stdio: [null, process.stdout, process.stderr] })
    tauriDriver.on('error', (error) => {
      console.error('tauri-driver error:', error)
      process.exit(1)
    })
    tauriDriver.on('exit', (code) => {
      if (!exit) {
        console.error('tauri-driver exited with code:', code)
        process.exit(1)
      }
    })
  },

  afterSession: () => {
    closeTauriDriver()
  },
}

function closeTauriDriver() {
  exit = true
  tauriDriver?.kill()
}

function onShutdown(fn) {
  const cleanup = () => {
    try {
      fn()
    } finally {
      process.exit()
    }
  }
  process.on('exit', cleanup)
  process.on('SIGINT', cleanup)
  process.on('SIGTERM', cleanup)
  process.on('SIGHUP', cleanup)
  process.on('SIGBREAK', cleanup)
}

onShutdown(() => {
  closeTauriDriver()
})
