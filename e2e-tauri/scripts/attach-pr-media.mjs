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

function createEmptyGist() {
  const payload = {
    description: 'lote PR screenshots (automated)',
    public: true,
    files: {
      'README.md': { content: 'Automated desktop captures (PNGs pushed via git).\n' },
    },
  }
  const tmp = path.join(os.tmpdir(), `gist-init-${Date.now()}.json`)
  fs.writeFileSync(tmp, JSON.stringify(payload), 'utf8')
  const create = spawnSync('gh', ['api', 'gists', '-X', 'POST', '--input', tmp], {
    encoding: 'utf8',
  })
  try {
    fs.unlinkSync(tmp)
  } catch {
    /* ignore */
  }
  if (create.status !== 0) {
    console.error(create.stderr || create.stdout)
    process.exit(create.status ?? 1)
  }
  return JSON.parse(create.stdout)
}

function getGhToken() {
  const a = process.env.GH_TOKEN?.trim()
  const b = process.env.GITHUB_TOKEN?.trim()
  if (a) {
    return a
  }
  if (b) {
    return b
  }
  const t = spawnSync('gh', ['auth', 'token'], { encoding: 'utf8' })
  if (t.status === 0 && t.stdout?.trim()) {
    return t.stdout.trim()
  }
  return null
}

function pushPngsToGistRepo(gist, absDir, pngs) {
  const token = getGhToken()
  if (!token) {
    console.error(
      '[attach-pr-media] No GitHub token: set GH_TOKEN or run `gh auth login`, then retry.',
    )
    process.exit(1)
  }
  const id = gist.id
  const pullUrl = gist.git_pull_url ?? `https://gist.github.com/${id}.git`
  const u = new URL(pullUrl)
  u.username = 'x-access-token'
  u.password = token
  const authedUrl = u.href
  const work = fs.mkdtempSync(path.join(os.tmpdir(), 'gist-work-'))
  const clone = spawnSync('git', ['clone', '--depth', '1', authedUrl, work], {
    encoding: 'utf8',
    env: { ...process.env, GIT_TERMINAL_PROMPT: '0' },
  })
  if (clone.status !== 0) {
    console.error(clone.stderr || clone.stdout)
    try {
      fs.rmSync(work, { recursive: true, force: true })
    } catch {
      /* ignore */
    }
    process.exit(clone.status ?? 1)
  }
  spawnSync('git', ['-C', work, 'config', 'user.email', '41898282+github-actions[bot]@users.noreply.github.com'])
  spawnSync('git', ['-C', work, 'config', 'user.name', 'attach-pr-media'])
  for (const name of pngs) {
    fs.copyFileSync(path.join(absDir, name), path.join(work, name))
  }
  const add = spawnSync('git', ['-C', work, 'add', ...pngs], { encoding: 'utf8' })
  if (add.status !== 0) {
    console.error(add.stderr)
    process.exit(add.status ?? 1)
  }
  const commit = spawnSync('git', ['-C', work, 'commit', '-m', 'Add screenshots'], { encoding: 'utf8' })
  if (commit.status !== 0) {
    console.error(commit.stderr || commit.stdout)
    try {
      fs.rmSync(work, { recursive: true, force: true })
    } catch {
      /* ignore */
    }
    process.exit(commit.status ?? 1)
  }
  const push = spawnSync('git', ['-C', work, 'push', 'origin', 'HEAD'], {
    encoding: 'utf8',
    env: { ...process.env, GIT_TERMINAL_PROMPT: '0' },
  })
  try {
    fs.rmSync(work, { recursive: true, force: true })
  } catch {
    /* ignore */
  }
  if (push.status !== 0) {
    console.error(push.stderr || push.stdout)
    process.exit(push.status ?? 1)
  }
}

function createGistWithPngs(absDir, pngs) {
  /**
   * JSON `content` stores text only; base64 is not decoded to binary, so `raw_url` would not be a PNG.
   * Push real binaries via `git` to the gist repo (see gist `git_pull_url`).
   */
  const gist = createEmptyGist()
  pushPngsToGistRepo(gist, absDir, pngs)
  const refresh = spawnSync('gh', ['api', `gists/${gist.id}`], { encoding: 'utf8' })
  if (refresh.status !== 0) {
    console.error(refresh.stderr)
    process.exit(refresh.status ?? 1)
  }
  return JSON.parse(refresh.stdout)
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
