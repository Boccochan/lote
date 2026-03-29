import { describe, expect, it } from 'vitest'

import { compareBodyLines } from './proposal-preview'

describe('compareBodyLines', () => {
  it('marks differing lines', () => {
    const rows = compareBodyLines('a\nb', 'a\nc')
    expect(rows[0].unchanged).toBe(true)
    expect(rows[1].unchanged).toBe(false)
  })
})
