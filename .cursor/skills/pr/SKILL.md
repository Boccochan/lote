---
name: pr
description: Open or update a GitHub pull request using the gh CLI after reviewing the diff against the base branch; fill references/PR_TEMPLATE.md; for UI changes, add before/after screenshots and a short demo video to the PR.
---

# Pull request (GitHub CLI)

## When to use

- The user asks to open a PR, draft a PR description, update PR metadata, or push a branch and create the PR on GitHub.

## Prerequisites

- `gh` installed and authenticated (`gh auth status`; run `gh auth login` if needed).
- Prefer **PowerShell** on Windows; examples below use PowerShell syntax.

## Workflow

### 1. Sync and resolve the base branch

```powershell
git fetch origin
```

Default base (if the user did not specify one):

```powershell
gh repo view --json defaultBranchRef -q .defaultBranchRef.name
```

Use that value as `<base>` below, or the branch the user named.

**Issue-driven implementation:** Prefer a branch created from `origin/<base>` in a dedicated **git worktree** so the PR compares cleanly to the default branch. See `.cursor/skills/gh-issue-to-pr/SKILL.md` (step 2).

### 2. Understand the diff from the base

Replace `<base>` with the remote-tracking branch name (usually `main` or `master`):

```powershell
git log origin/<base>..HEAD --oneline
git diff --stat origin/<base>...HEAD
git diff origin/<base>...HEAD
```

Optional: run the helper script from the repo root (writes a markdown snippet you can paste into the PR body):

```powershell
.\.cursor\skills\pr\scripts\generate-pr-summary.ps1 -BaseBranch <base>
```

### 3. Fill the PR body

1. Open `references/PR_TEMPLATE.md` in this skill folder.
2. Replace placeholders and sections with a concise summary grounded in the diff and commits.
3. Use **English** for the PR title and body unless the repository explicitly uses another language for PRs (see project `AGENTS.md`).

Do not paste secrets, tokens, or contents of `.env` files into the title or body.

### 4. UI / visual changes

If the change affects user-visible UI (components, styles, layouts, copy in the app):

1. **Screenshots**: Capture the **same screens** before and after (or document “before” from the base branch if only “after” exists on the feature branch). Prefer pairing: same viewport and flow.
2. **Video**: Record a **short** clip (roughly 10–60 seconds) showing the main interaction or regression area. Mention in the PR what the viewer should notice.
3. **Attaching media**
   - **Recommended**: Add images under `docs/pr-assets/<topic-or-branch>/` on the PR branch, commit, push, then reference them in the PR body using the GitHub **raw** URL for that branch, e.g. `https://github.com/<owner>/<repo>/raw/<branch>/docs/pr-assets/.../after.png`.
   - Alternatively, upload screenshots or video via the GitHub PR web UI (drag-and-drop into the description).

If the project has Playwright or Storybook visual checks, prefer those for consistent captures when applicable.

### 5. Create or update the PR

Write the final body to a temp file (e.g. `pr-body.md` in the repo root or `%TEMP%`), then:

```powershell
gh pr create --base <base> --title "<imperative summary>" --body-file pr-body.md
```

Useful flags:

- `--draft` — work in progress.
- `--fill` — use commits for title/body (only when appropriate; usually prefer the template).

If a PR for this branch already exists:

```powershell
gh pr view
gh pr edit --title "..." --body-file pr-body.md
```

## Security and scope

- Never commit large unnecessary binaries; keep images reasonably sized.
- Title and body should reflect **this branch’s** changes vs `<base>`, not unrelated history.
