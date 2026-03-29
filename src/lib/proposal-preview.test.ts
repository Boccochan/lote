import { describe, expect, it } from 'vitest'

import { diffBodyToRows } from './proposal-preview'

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
