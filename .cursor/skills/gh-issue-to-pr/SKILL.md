---
name: gh-issue-to-pr
description: >
  Fetch a GitHub issue with gh, create a git worktree from the default branch (e.g. main),
  implement and add unit tests, run lint and typecheck until clean (and Rust fmt/clippy
  when src-tauri changes), then open or update a PR using the project pr skill. Use when
  the user gives an issue number or URL or asks to implement an issue through to a pull request.
compatibility: Requires gh CLI authenticated (gh auth status). Windows uses PowerShell.
---

# GitHub issue → implementation → PR

## When to use

- A GitHub issue number, URL, or explicit request to implement an issue and open a PR.
- The user wants the full path: understand issue → code → tests → quality gate → PR.

## Prerequisites

- `gh` installed and logged in (`gh auth status`).
- Prefer **PowerShell** on Windows for commands below.

## Workflow

### 1. Fetch and understand the issue

```powershell
gh issue view <N> --json number,title,body,state,labels,assignees,url
```

- If acceptance criteria are unclear, ask the user before coding.
- Keep scope aligned with the issue; follow `AGENTS.md` (English for code and commits; PowerShell for shell examples).

### 2. Create a worktree from the default branch

Implement the issue from a **git worktree** whose branch starts from the latest **default branch** (`main` or whatever `gh repo view` reports)—not from an unrelated branch or a stale base.

1. `git fetch origin`
2. Resolve `<base>`:

   ```powershell
   gh repo view --json defaultBranchRef -q .defaultBranchRef.name
   ```

3. Add a worktree with a new branch from `origin/<base>` (use a sibling path and a branch name that includes the issue number):

   ```powershell
   git fetch origin
   $base = gh repo view --json defaultBranchRef -q .defaultBranchRef.name
   $wt = "..\<repo>-issue-<N>"
   $branch = "issue-<N>-<short-topic>"
   git worktree add $wt -b $branch "origin/$base"
   Set-Location $wt
   ```

4. Run implementation, tests, commits, and the PR steps from this worktree.

**Exception:** If you are already in a checkout whose current branch was created from the latest `origin/<base>` and is dedicated to this issue, you may continue there instead of adding another worktree.

### 3. Implement

- Match existing project patterns; keep changes minimal and focused on the issue.
- If the change touches **Rust** under `src-tauri/`, include Rust formatting and clippy in the quality gate (step 5).

### 4. Unit tests

From the repository root:

```powershell
npm run test
```

- Add or update tests for new behavior. The project uses Vitest with the **unit** project (`vitest run --project=unit`).

### 5. Lint, typecheck, and Rust (repeat until clean)

**JavaScript / TypeScript / Svelte** (run for relevant changes; always before a PR):

```powershell
npm run lint
npm run check
```

- Fix all reported issues and re-run until **no errors**. ESLint is required for changes per `AGENTS.md` (`npm run lint`).

**Rust** (when `src-tauri/` or Rust sources change):

```powershell
npm run fmt:rust
npm run lint:rust
```

- If the same failure persists after two fix attempts, stop and ask the user.

### 6. Pull request

Only after step 5 succeeds:

1. Follow the project skill **`pr`** (`.cursor/skills/pr/SKILL.md`): `git fetch origin`, review `git log` / `git diff` against the base branch, fill `.cursor/skills/pr/references/PR_TEMPLATE.md`, push the branch, then `gh pr create` or `gh pr edit`.
2. If the change affects **Tauri desktop UI**, **run locally** `npm run e2e:tauri:capture:publish` from the repo root **after** the PR exists (captures screenshots and appends them to the PR body via Gist; requires `gh auth` and `cargo install tauri-driver --locked`). The agent should execute this command, not only document it.
3. Optional helper: `.\.cursor\skills\pr\scripts\generate-pr-summary.ps1 -BaseBranch <base>`
4. PR title and body in **English** unless the repository explicitly uses another language for PRs (`AGENTS.md`).

## Security

- Do not paste secrets, tokens, or `.env` contents into issues, commits, or PR text.

## Further reading

- Additional `gh issue` patterns and edge cases: `references/GH_ISSUE_WORKFLOW.md`.
