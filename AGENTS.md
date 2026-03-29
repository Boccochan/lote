# Agent notes

## Language

This project uses **English** for source code, comments, user-facing strings, commit messages, and documentation unless a file or area is explicitly localized.

## Shell environment

Development and automation on this machine assume **PowerShell** (Windows). Use PowerShell syntax for shell examples and scripts (e.g. path separators, environment variables, and command invocation).

## Programming principles

High-level rules for design and quality (linting covers style and many correctness checks).

- **Separation of concerns** — Keep UI, state, I/O (network/storage), and pure logic in clear boundaries; avoid mixing unrelated change reasons in one place.
- **DRY** — Prefer one obvious place for behavior that must stay in sync; abstract only when repetition shares the same reason to change, not merely similar code.
- **Simplicity** — Favor straightforward control flow and names over clever shortcuts.
- **Security** — Never commit secrets or expose them to the client; treat user and external input as untrusted; use least privilege for data and capabilities.
- **Dependencies** — Add libraries with a clear benefit; prefer existing project patterns and small, well-maintained deps.
- **Errors** — Surface failures users or callers can understand; avoid silent catches; do not blanket-wrap without a purpose.
- **Consistency** — Match existing naming, file layout, and patterns unless there is a strong reason to diverge.

## ESLint

Follow the project ESLint configuration in `eslint.config.js`. Changes should pass `npm run lint` with no errors.

## Tauri desktop capture (PR assets)

Automated WebView screenshots/video: `npm run e2e:tauri:capture` (needs `cargo install tauri-driver --locked`; Windows downloads Edge WebDriver on first run). Outputs under `docs/pr-assets/tauri-desktop/` (gitignored PNG/MP4 so they are not committed).

To **put screenshots in the PR description without committing binaries**, use `gh auth` and an **open PR** for the branch, then run **`npm run e2e:tauri:capture:publish`** from the repo root (one command: capture + upload PNGs to a public Gist + append image markdown to the PR body). Or run `e2e:tauri:capture` then `pr:attach-captures` separately. **Agents opening a PR** should run `e2e:tauri:capture:publish` locally after `gh pr create` when the change affects the Tauri desktop UI.

**Skill smoke test:** Use throwaway branches (for example `chore/skill-workflow-smoke`) to verify `gh pr create` plus optional `e2e:tauri:capture:publish`; merge or close the PR after confirming the workflow.
