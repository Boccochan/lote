# GitHub issue workflow (reference)

Optional detail for `gh-issue-to-pr`. Load when listing issues, filtering, or debugging `gh`.

## List issues

```powershell
gh issue list --limit 20
gh issue list --label bug
gh issue list --state open
```

## View issue (human-readable)

```powershell
gh issue view 42
```

## View issue (JSON for agents)

```powershell
gh issue view 42 --json number,title,body,state,labels,assignees,url,comments
```

## Open issue in browser

```powershell
gh issue view 42 --web
```

## Notes

- Prefer `--json` when the agent must parse title/body without ambiguity.
- If the issue references another issue or PR, follow links in the body or use `gh issue view` / `gh pr view` for those numbers.
