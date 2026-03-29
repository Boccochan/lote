import { describe, expect, it } from 'vitest'

import { diffBodyToGutterRows, diffBodyToRows } from './proposal-preview'

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

describe('diffBodyToGutterRows', () => {
  it('assigns old/new line numbers like a unified diff', () => {
    const rows = diffBodyToGutterRows('a\nb', 'a\nc')
    expect(rows.map((r) => [r.type, r.oldLine, r.newLine])).toEqual([
      ['unchanged', 1, 1],
      ['remove', 2, null],
      ['add', null, 2],
    ])
  })

  it('numbers only-new lines from 1 upward', () => {
    const rows = diffBodyToGutterRows('', 'x\ny')
    expect(rows.map((r) => [r.oldLine, r.newLine])).toEqual([
      [null, 1],
      [null, 2],
    ])
  })
})
