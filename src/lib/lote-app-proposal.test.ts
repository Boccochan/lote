import { describe, expect, it } from 'vitest'

import {
  formatPageProposalLabel,
  type PageProposal,
  parsePageProposalFromTool,
} from './lote-app.svelte'

describe('parsePageProposalFromTool', () => {
  it('parses create proposal JSON', () => {
    const json =
      '{"op":"create","title":"Hello","parentId":null}'
    const p = parsePageProposalFromTool(json)
    expect(p).toEqual({
      op: 'create',
      pageId: undefined,
      title: 'Hello',
      parentId: null,
      body: undefined,
    } satisfies PageProposal)
  })

  it('parses delete proposal JSON', () => {
    const json = '{"op":"delete","pageId":"abc","title":"Note"}'
    const p = parsePageProposalFromTool(json)
    expect(p?.op).toBe('delete')
    expect(p?.pageId).toBe('abc')
  })

  it('returns null for invalid payload', () => {
    expect(parsePageProposalFromTool('not json')).toBeNull()
    expect(parsePageProposalFromTool('{"op":"nope"}')).toBeNull()
  })
})

describe('formatPageProposalLabel', () => {
  it('describes each op', () => {
    expect(
      formatPageProposalLabel({
        op: 'create',
        title: 'T',
      }),
    ).toContain('Create')
    expect(
      formatPageProposalLabel({
        op: 'save',
        pageId: 'id-1',
        title: 'T',
        body: '',
      }),
    ).toContain('id-1')
    expect(
      formatPageProposalLabel({
        op: 'delete',
        pageId: 'x',
        title: 'Gone',
      }),
    ).toContain('Gone')
  })
})
