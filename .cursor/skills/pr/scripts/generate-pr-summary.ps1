<#
  Summarize commits and diff stat from origin/<BaseBranch> to HEAD for PR description drafts.
  Run from repository root: .\.agent\skills\pr\scripts\generate-pr-summary.ps1 -BaseBranch main
#>
param(
    [Parameter(Mandatory = $true)]
    [string] $BaseBranch
)

$ErrorActionPreference = "Stop"
$remote = "origin/$BaseBranch"

git rev-parse --is-inside-work-tree *> $null
if ($LASTEXITCODE -ne 0) { throw "Not a git repository." }

$null = git rev-parse "refs/remotes/$remote" 2>$null
if ($LASTEXITCODE -ne 0) {
    Write-Warning "Fetching $remote ..."
    git fetch origin $BaseBranch
}

Write-Output "## Commits ($remote..HEAD)"
Write-Output ""
git log --oneline "$remote..HEAD"
Write-Output ""
Write-Output "## Diff stat ($remote...HEAD)"
Write-Output ""
git diff --stat "$remote...HEAD"
Write-Output ""
