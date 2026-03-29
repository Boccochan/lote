/**
 * UI-only preview for pending AI page proposals (before/after copy, not persisted).
 */

import { diffLines } from 'diff'

export type ProposalPreview =
  | {
      kind: 'create'
      afterTitle: string
      afterParentLabel: string
    }
  | {
      kind: 'save'
      before: { title: string; body: string; parentLabel: string }
      after: { title: string; body: string; parentLabel: string }
    }
  | {
      kind: 'delete'
      pageTitle: string
    }

/** One line in a git-style body diff (unchanged lines use neutral styling). */
export type BodyDiffRow = {
  type: 'unchanged' | 'add' | 'remove'
  text: string
}

/** Same as {@link BodyDiffRow} plus unified-diff line numbers (GitHub-style gutters). */
export type BodyDiffGutterRow = BodyDiffRow & {
  /** Line index in the old file; null on pure additions. */
  oldLine: number | null
  /** Line index in the new file; null on pure removals. */
  newLine: number | null
}

/**
 * Line-level diff for body text: removed lines → red, added → green, unchanged → neutral.
 */
export function diffBodyToRows(before: string, after: string): BodyDiffRow[] {
  const parts = diffLines(before ?? '', after ?? '')
  const rows: BodyDiffRow[] = []

  for (const part of parts) {
    const value = part.value
    const lines =
      value === ''
        ? ['']
        : value.endsWith('\n')
          ? value.slice(0, -1).split('\n')
          : value.split('\n')

    for (const line of lines) {
      if (part.added) {
        rows.push({ type: 'add', text: line })
      } else if (part.removed) {
        rows.push({ type: 'remove', text: line })
      } else {
        rows.push({ type: 'unchanged', text: line })
      }
    }
  }

  return rows
}

/**
 * Unified diff rows with old/new line numbers for a two-column gutter (like GitHub PRs).
 */
export function diffBodyToGutterRows(before: string, after: string): BodyDiffGutterRow[] {
  const base = diffBodyToRows(before, after)
  let oldN = 0
  let newN = 0
  const out: BodyDiffGutterRow[] = []

  for (const row of base) {
    if (row.type === 'remove') {
      oldN += 1
      out.push({ ...row, oldLine: oldN, newLine: null })
    } else if (row.type === 'add') {
      newN += 1
      out.push({ ...row, oldLine: null, newLine: newN })
    } else {
      oldN += 1
      newN += 1
      out.push({ ...row, oldLine: oldN, newLine: newN })
    }
  }

  return out
}
