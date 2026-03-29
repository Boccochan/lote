import { describe, expect, it } from 'vitest'

import {
  collapseLongUnchangedRuns,
  diffBodyToProposalRows,
  diffBodyToRows,
} from './proposal-preview'

describe('diffBodyToRows', () => {
  it('marks added and removed lines', () => {
    const rows = diffBodyToRows('a\nb', 'a\nc')
    const types = rows.map((r) => r.type)
    expect(types).toContain('unchanged')
    expect(types).toContain('remove')
    expect(types).toContain('add')
  })

  it('handles empty before', () => {
    const rows = diffBodyToRows('', 'only after')
    expect(rows.some((r) => r.type === 'add')).toBe(true)
  })
})

describe('collapseLongUnchangedRuns', () => {
  it('collapses runs of 10+ unchanged lines into one row', () => {
    const rows = Array.from({ length: 12 }, (_, i) => ({
      type: 'unchanged' as const,
      text: `x${i}`,
    }))
    const collapsed = collapseLongUnchangedRuns(rows, 10)
    expect(collapsed).toHaveLength(1)
    expect(collapsed[0].type).toBe('collapsed')
    if (collapsed[0].type === 'collapsed') {
      expect(collapsed[0].omittedCount).toBe(12)
    }
  })

  it('does not collapse fewer than 10 unchanged lines', () => {
    const rows = Array.from({ length: 9 }, (_, i) => ({
      type: 'unchanged' as const,
      text: `x${i}`,
    }))
    expect(collapseLongUnchangedRuns(rows, 10)).toHaveLength(9)
  })
})

describe('diffBodyToProposalRows', () => {
  it('collapses a long middle unchanged section', () => {
    const before = ['a', ...Array.from({ length: 15 }, () => 'mid'), 'z'].join('\n')
    const after = ['b', ...Array.from({ length: 15 }, () => 'mid'), 'z'].join('\n')
    const rows = diffBodyToProposalRows(before, after)
    expect(rows.some((r) => r.type === 'collapsed')).toBe(true)
  })
})
