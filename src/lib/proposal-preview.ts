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
  type: 'unchanged' | 'add' | 'remove' | 'collapsed'
  text: string
  /** Set when {@link type} is `collapsed`: number of unchanged lines folded into this row. */
  omittedCount?: number
}

const DEFAULT_COLLAPSE_THRESHOLD = 10

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
 * Replaces each run of {@code threshold} or more consecutive unchanged lines with a single
 * {@link BodyDiffRow} of type `collapsed` (for compact proposal previews).
 */
export function collapseLongUnchangedRuns(
  rows: BodyDiffRow[],
  threshold: number = DEFAULT_COLLAPSE_THRESHOLD,
): BodyDiffRow[] {
  if (threshold < 2) {
    return rows
  }

  const out: BodyDiffRow[] = []
  let i = 0

  while (i < rows.length) {
    const row = rows[i]
    if (row.type !== 'unchanged') {
      out.push(row)
      i += 1
      continue
    }

    const start = i
    while (i < rows.length && rows[i].type === 'unchanged') {
      i += 1
    }
    const runLen = i - start
    if (runLen >= threshold) {
      out.push({
        type: 'collapsed',
        text: '',
        omittedCount: runLen,
      })
    } else {
      out.push(...rows.slice(start, i))
    }
  }

  return out
}

/**
 * Body diff rows for the proposal UI: line diff, then collapse long unchanged runs.
 */
export function diffBodyToProposalRows(
  before: string,
  after: string,
  collapseThreshold: number = DEFAULT_COLLAPSE_THRESHOLD,
): BodyDiffRow[] {
  return collapseLongUnchangedRuns(diffBodyToRows(before, after), collapseThreshold)
}
