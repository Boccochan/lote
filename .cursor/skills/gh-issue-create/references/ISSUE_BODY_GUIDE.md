# Issue body and ASCII wireframes

Use this reference when drafting issues under **`gh-issue-create`**. Keep the main `SKILL.md` short; load this file when the user needs detail or examples.

## Body structure

1. **Context** — Problem or opportunity in 1–3 sentences.
2. **Proposal / scope** — Bullets or a short user story (“As a … I want … so that …”).
3. **Acceptance criteria** — Checklist (`- [ ]`) that is testable.
4. **Out of scope** (optional) — Prevents scope creep.
5. **Wireframe** — Only for UI/frontend issues; see below.

If the repo uses GitHub issue templates under `.github/ISSUE_TEMPLATE/`, align headings with the template the user intends to use. For `gh issue create --template`, check `gh issue create --help` for template support.

## ASCII wireframe rules

- **Purpose**: Communicate layout and major regions, not pixels or branding.
- **Width**: Aim for ≤80 characters per line so the issue renders on narrow views.
- **Fence**: Use a markdown code fence with **no language tag** so the font stays monospace.
- **Symbols**: Boxes (`┌─┐` or `+---+`), labels, buttons like `[Submit]`, single-line inputs like `[________________]`.
- **Multiple screens**: Separate sketches with a short `### Screen: …` heading.
- **Disclaimer**: One line such as “Wireframe is indicative; final layout may differ.”

Example:

```text
+----------------------------------------------------------+
|  App title                              [@user] [Settings]|
+----------------------------------------------------------+
|  Sidebar          |  Main                                |
|  - Item A         |  +----------------------------------+ |
|  - Item B         |  |  Primary content                 | |
|                   |  +----------------------------------+ |
|                   |  [ Cancel ]  [ Save ]                |
+-------------------+--------------------------------------+
```

## Labels

Before passing `--label`, list labels with `gh label list` or confirm names in the GitHub UI. Unknown labels may cause `gh issue create` to fail.
