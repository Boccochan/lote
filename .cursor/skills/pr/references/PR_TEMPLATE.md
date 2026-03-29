# PR title

<!-- Short imperative summary, e.g. "Add error banner to chat panel" -->

## Summary

<!-- 1–3 sentences: what changed and why. -->

## Base branch

<!-- e.g. main -->

## Changes

<!-- Bullet list keyed to the diff; group by area if helpful. -->

-

## How to test

<!-- Steps or commands, e.g. npm run dev, npm run lint, manual QA. -->

1.

## Screenshots / recording

<!-- Omit this whole section when the PR does not change user-visible UI (docs-only, tooling-only, CI-only, etc.). -->

When UI **does** change:

- Prefer one short note and the **Screenshots (auto-uploaded)** block appended by `npm run pr:attach-captures` / `e2e:tauri:capture:publish` (Gist URLs). Do **not** link `github.com/.../raw/<branch>/docs/...` for gitignored capture files.
- Add **Before / After** subsections only when a side-by-side comparison helps reviewers; otherwise skip them.
- **Demo video**: include only if you have a clip; otherwise omit this line entirely.

## Checklist

- [ ] `npm run lint` passes (or note exception).
- [ ] No secrets or env values in code or PR text.
- [ ] Breaking changes documented if any.
