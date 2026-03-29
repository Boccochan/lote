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
