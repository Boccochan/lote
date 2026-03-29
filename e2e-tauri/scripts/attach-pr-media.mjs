#!/usr/bin/env node
/**
 * Uploads capture PNGs to a public GitHub Gist (via `gh`), then appends markdown
 * with raw image URLs to the PR body. Images are not committed to the repo.
 *
 * GitHub does not expose the same "paste into PR" user-images upload API for CLI;
 * Gist raw URLs render in PR bodies and avoid bloating git history.
 *
 * Usage: node e2e-tauri/scripts/attach-pr-media.mjs [--dir <path>] [--pr <n>]
 */
import { spawnSync } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

const MARKER_START = '<!-- pr-auto-media:begin -->'
const MARKER_END = '<!-- pr-auto-media:end -->'

function parseArgs() {
  const out = { dir: 'docs/pr-assets/tauri-desktop', pr: null }
  const argv = process.argv.slice(2)
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--dir') {
      out.dir = argv[++i]
    } else if (argv[i] === '--pr') {
      out.pr = argv[++i]
    }
  }
  return out
}

function escapeRegex(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function extractGistId(stdout) {
  const m = stdout.match(/gist\.github\.com\/(?:[^/\s]+\/)?([a-f0-9]+)/i)
  return m ? m[1] : null
}

function readPngList(absDir) {
  const pngs = fs
    .readdirSync(absDir)
    .filter((f) => f.endsWith('.png'))
    .sort()
  if (pngs.length === 0) {
    console.error('[attach-pr-media] No .png files in', absDir)
    process.exit(1)
  }
  return pngs
}

function createGistWithPngs(absDir, pngs) {
  const filePaths = pngs.map((f) => path.join(absDir, f))
  const create = spawnSync(
    'gh',
    ['gist', 'create', '--public', '-d', 'lote PR screenshots (automated)', ...filePaths],
    { encoding: 'utf8' },
  )
  if (create.status !== 0) {
    console.error(create.stderr || create.stdout)
    process.exit(create.status ?? 1)
  }
  const gistId = extractGistId(create.stdout)
  if (!gistId) {
    console.error('[attach-pr-media] Could not parse gist URL from:', create.stdout)
    process.exit(1)
  }
  const api = spawnSync('gh', ['api', `gists/${gistId}`], { encoding: 'utf8' })
  if (api.status !== 0) {
    console.error(api.stderr)
    process.exit(api.status ?? 1)
  }
  return JSON.parse(api.stdout)
}

function buildMediaSection(gist, pngs) {
  const lines = [
    '## Screenshots (auto-uploaded)',
    '',
    `_Hosted on GitHub Gist (not in this repository): ${gist.html_url}_`,
    '',
  ]
  for (const name of pngs) {
    const meta = gist.files?.[name]
    const raw = meta?.raw_url
    if (!raw) {
      console.error('[attach-pr-media] Missing gist file:', name, Object.keys(gist.files ?? {}))
      process.exit(1)
    }
    lines.push(`### ${name}`, '', `![${name}](${raw})`, '')
  }
  return [MARKER_START, ...lines, MARKER_END].join('\n')
}

function resolvePrNumber(prArg) {
  if (prArg) {
    return prArg
  }
  const fromEnv = process.env.PR_NUMBER?.trim() || process.env.GITHUB_PR_NUMBER?.trim()
  if (fromEnv) {
    return fromEnv
  }
  const pv = spawnSync('gh', ['pr', 'view', '--json', 'number', '-q', '.number'], {
    encoding: 'utf8',
  })
  if (pv.status !== 0) {
    console.error(
      '[attach-pr-media] No PR found for this branch. Push the branch and open a PR, or pass --pr N',
      pv.stderr,
    )
    process.exit(1)
  }
  return pv.stdout.trim()
}

function mergePrBody(pr, newSection) {
  const bodyR = spawnSync('gh', ['pr', 'view', pr, '--json', 'body', '-q', '.body'], {
    encoding: 'utf8',
  })
  if (bodyR.status !== 0) {
    console.error(bodyR.stderr)
    process.exit(bodyR.status ?? 1)
  }
  let body = bodyR.stdout ?? ''
  if (body.includes(MARKER_START)) {
    const re = new RegExp(
      `${escapeRegex(MARKER_START)}[\\s\\S]*?${escapeRegex(MARKER_END)}\\n?`,
      'm',
    )
    body = body.replace(re, '')
  }
  return `${body.trimEnd()}\n\n${newSection}\n`
}

function writePrBody(pr, body) {
  const tmp = path.join(os.tmpdir(), `lote-pr-body-${Date.now()}.md`)
  fs.writeFileSync(tmp, body, 'utf8')
  const ed = spawnSync('gh', ['pr', 'edit', pr, '--body-file', tmp], { stdio: 'inherit' })
  try {
    fs.unlinkSync(tmp)
  } catch {
    /* ignore */
  }
  if (ed.status !== 0) {
    process.exit(ed.status ?? 1)
  }
}

function main() {
  const { dir, pr: prArg } = parseArgs()
  const absDir = path.resolve(process.cwd(), dir)
  if (!fs.existsSync(absDir)) {
    console.error('[attach-pr-media] Directory not found:', absDir)
    process.exit(1)
  }

  const pngs = readPngList(absDir)
  const gist = createGistWithPngs(absDir, pngs)
  const newSection = buildMediaSection(gist, pngs)
  const pr = resolvePrNumber(prArg)
  const body = mergePrBody(pr, newSection)
  writePrBody(pr, body)
  console.log(`[attach-pr-media] Updated PR #${pr} with ${pngs.length} image(s).`)
}

main()
