/**
 * UI-only preview for pending AI page proposals (before/after copy, not persisted).
 */

export type ProposalPreview =
  | {
      kind: 'create'
      /** Short human label for the “before” column */
      beforeSummary: string
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

/** One row of body line comparison for save proposals. */
export type BodyLineCompareRow = {
  beforeLine: string
  afterLine: string
  /** Same text on both sides — no highlight */
  unchanged: boolean
}

/**
 * Line-aligned comparison: differing lines get Before highlighted (red) and After (green) in the UI.
 */
export function compareBodyLines(before: string, after: string): BodyLineCompareRow[] {
  const a = before.split('\n')
  const b = after.split('\n')
  const n = Math.max(a.length, b.length)
  const rows: BodyLineCompareRow[] = []
  for (let i = 0; i < n; i++) {
    const beforeLine = i < a.length ? a[i] : ''
    const afterLine = i < b.length ? b[i] : ''
    rows.push({
      beforeLine,
      afterLine,
      unchanged: beforeLine === afterLine,
    })
  }
  return rows
}
