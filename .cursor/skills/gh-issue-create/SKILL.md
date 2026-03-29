---
name: gh-issue-create
description: >
  Propose a GitHub issue title and body from the user's prompt; for frontend or UI work,
  include an ASCII wireframe for screen layout. After explicit user approval, create the
  issue with gh. Use when the user wants to draft or file a new issue from an idea or spec.
compatibility: Requires gh CLI authenticated (gh auth status). Windows uses PowerShell.
---

# GitHub issue creation (draft → approve → create)

## When to use

- The user wants to turn a prompt or rough idea into a GitHub issue.
- They want suggested title, body, and (for UI) an ASCII screen sketch before anything is filed.
- They asked to create an issue after reviewing a draft.

## Prerequisites

- `gh` installed and logged in (`gh auth status`).
- Prefer **PowerShell** on Windows for commands below.
- Default target is the **current repository** (`gh repo view`). If the user names another repo, pass `-R owner/repo` to `gh issue create`.

## Workflow

### 1. Clarify (only if needed)

If the prompt is missing essentials, ask briefly for:

- Goal and audience
- In scope / out of scope
- Priority or deadline (optional)

Do not block on perfection; infer reasonable defaults and state them in the draft.

### 2. Propose title and body (do not create yet)

- **Title**: Short, specific, actionable (imperative or “[area] one-line summary”). Avoid duplicates; prefer concrete nouns over “fix stuff”.
- **Body** should usually include:
  - **Context** — why this matters
  - **What to do** — bullets or user story
  - **Acceptance criteria** — checklist the implementer can verify
  - **Notes** — dependencies, risks, or follow-ups (optional)

Match the repository’s language for issue text if the user or `AGENTS.md` implies one language; otherwise default to **English** for consistency with `AGENTS.md`.

**Frontend / UI-heavy work**: Add a **screen wireframe** using ASCII art in a fenced code block (plain ` ``` ` fence for monospace). Keep width around **80 columns**; split into multiple blocks if there are multiple screens. Use simple symbols (`+---+`, `[Save]`, `[_______]`). State that the sketch is a layout hint, not final design.

Optional: suggest **labels** or milestones by name (only use them in `gh issue create` if they exist on the repo).

### 3. Approval gate (required)

**Do not run `gh issue create` until the user explicitly approves** (e.g. “create it”, “OK”, “yes”, “その内容で”, “issue を作成して”).

If they want edits, revise the draft and ask again.

### 4. Create the issue

Write the final body to a UTF-8 file to avoid escaping issues, then:

```powershell
gh issue create --title "<title>" --body-file <path-to-body.md>
```

Useful flags:

- `--label "name"` — repeat or comma-separate as supported by your `gh` version
- `-R owner/repo` — another repository

After success, share the issue URL or run `gh issue view <n> --web`.

### 5. Relation to other skills

- Implementation after filing: project skill **`gh-issue-to-pr`** (fetch issue → code → PR).
- Pull requests: project skill **`pr`**.

## Security

- Do not paste secrets, tokens, or `.env` contents into issue titles or bodies.

## Further reading

- ASCII and body structure: `references/ISSUE_BODY_GUIDE.md`.
