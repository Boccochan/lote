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

## Adding pages

### Note pages (user content in the app)

Lote stores **notes as pages** in local storage via Tauri, not as new files in this repo.

- **Create a root-level page:** Click **+ Page** in the left sidebar (or use the control tagged `data-testid="btn-new-root-page"` in automation). This calls the backend to create a page with no parent.
- **Create a child page:** Select a page in the sidebar, then click **+ Child**. The new page’s parent is the currently selected page.
- **Edit:** Select a page in the tree, change the **Title** and body, then **Save**. Parent can be adjusted with the **Parent** dropdown when needed.
- **Delete:** With a page selected, use **Delete** and confirm.

Adding a note page does **not** add a `src/` file; it only changes application data through `invoke` (see Rust commands such as `pages_create`, `pages_list`, `pages_get`, `pages_save`, `pages_delete`).

### Frontend routes (SvelteKit)

When the frontend uses **SvelteKit** (filesystem routes under `src/routes/`), a **new URL / screen** is a new route file, separate from note pages above.

- Put routes that share the main shell (sidebar, Ollama, MCP) under the same **route group** as the rest of the app (for example `src/routes/(app)/`), so they reuse `+layout.svelte`.
- Add a page at a path by creating **`+page.svelte`** in that segment, e.g. `src/routes/(app)/example/+page.svelte` → `/example`.
- Prefer **`resolve(...)`** from `$app/paths` with **`goto`** / `<a href={...}>` so links respect the base path and satisfy ESLint navigation rules.
- If the screen needs the same shared UI state as the rest of the shell, extend the existing pattern (the `lote` object in `src/lib/lote-app.svelte.ts`) instead of duplicating `invoke` wiring.

## Tauri desktop capture (PR assets)

Automated WebView screenshots/video: `npm run e2e:tauri:capture` (needs `cargo install tauri-driver --locked`; Windows downloads Edge WebDriver on first run). Outputs under `docs/pr-assets/tauri-desktop/` (gitignored PNG/MP4 so they are not committed).

To **put screenshots in the PR description without committing binaries**, use `gh auth` and an **open PR** for the branch, then run **`npm run e2e:tauri:capture:publish`** from the repo root (one command: capture + upload PNGs to a public Gist + append image markdown to the PR body). Or run `e2e:tauri:capture` then `pr:attach-captures` separately. **Agents opening a PR** should run `e2e:tauri:capture:publish` locally after `gh pr create` when the change affects the Tauri desktop UI.

### `data-testid` for capture (document here)

**Requirement (PRs that touch capture):** If you add or change a **`data-testid`** (or a **`dataTestId`** prop that renders one) **because** desktop E2E or **`npm run e2e:tauri:capture*`** / PR screenshot automation needs a stable selector, you **must** update **this `AGENTS.md` subsection** (table + text) in the **same pull request** as the UI and `e2e-tauri/specs/` changes. Reviewers use this list to see what the capture flow depends on; merging selector-only code without the registry update is not OK.

Prefer **`kebab-case`** values on the DOM (`data-testid="my-target"`). Reusable controls may expose `dataTestId` props (see `ActionButton`, `TextField`), which render as `data-testid` on the host element.

| `data-testid` | Where used | Purpose |
| --- | --- | --- |
| `lote-app` | Root shell in `src/routes/(app)/+layout.svelte` | Wait for app ready |
| `btn-new-root-page` | “+ Page” in `src/routes/(app)/+layout.svelte` | Create root page in capture flow |
| `editor-title` | Title field in `src/routes/(app)/+page.svelte` | Editor / title editing in capture flow |
| `sidebar-settings` | Settings link in `src/routes/(app)/+layout.svelte` | Open `/settings` in capture flow (when present) |
| `settings-view` | Settings panel in `src/routes/(app)/settings/+page.svelte` | Assert Settings view in capture flow (when present) |

Add or update a row **in the same PR** whenever you introduce or rename a `data-testid` used by `e2e-tauri/specs/desktop-capture.e2e.js` (or by a sibling spec under `e2e-tauri/specs/`). Remove rows if selectors are deleted from the spec.

**Skill smoke test:** Use throwaway branches (for example `chore/skill-workflow-smoke`) to verify `gh pr create` plus optional `e2e:tauri:capture:publish`; merge or close the PR after confirming the workflow.
