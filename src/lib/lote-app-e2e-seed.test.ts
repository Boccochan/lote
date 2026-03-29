import { describe, expect, it } from 'vitest'

import { buildE2eAgentDemo } from './lote-app-e2e-seed'

describe('buildE2eAgentDemo', () => {
  it('returns create pack without a selected page', () => {
    const p = buildE2eAgentDemo('create', null, '')
    expect(p?.proposal.op).toBe('create')
    expect(p?.messages.some((m) => m.role === 'user')).toBe(true)
  })

  it('returns null for save when no page is selected', () => {
    expect(buildE2eAgentDemo('save', null, '')).toBeNull()
  })

  it('returns save pack when a page id is provided', () => {
    const p = buildE2eAgentDemo('save', 'abc', 'T')
    expect(p?.proposal.op).toBe('save')
    expect(p?.proposal.pageId).toBe('abc')
  })
})
