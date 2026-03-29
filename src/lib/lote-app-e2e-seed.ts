import { e2eLongDocAfter } from '$lib/e2e-long-doc-fixture'

/** Shapes mirror `lote-app.svelte.ts` (avoid importing `.svelte.ts` from here). */
export type E2eChatMsg = {
  role: string
  content?: string
  tool_calls?: { function: { name: string; arguments: unknown } }[]
  tool_name?: string
}

export type E2ePageProposal = {
  op: 'create' | 'save' | 'delete'
  pageId?: string
  title?: string
  parentId?: string | null
  body?: string
}

export type E2eDemoPack = {
  messages: E2eChatMsg[]
  proposal: E2ePageProposal
}

const E2E_AGENT_DEMO_TITLE = 'PR Demo Page'

function buildCreate(): E2eDemoPack {
  const toolContent = JSON.stringify({
    op: 'create',
    title: E2E_AGENT_DEMO_TITLE,
    parentId: null,
  })
  return {
    messages: [
      {
        role: 'user',
        content: `Create a new page titled "${E2E_AGENT_DEMO_TITLE}".`,
      },
      {
        role: 'assistant',
        content:
          'I will propose creating that page. Please confirm below to create it in your library.',
        tool_calls: [
          {
            function: {
              name: 'propose_page_create',
              arguments: { title: E2E_AGENT_DEMO_TITLE },
            },
          },
        ],
      },
      {
        role: 'tool',
        tool_name: 'propose_page_create',
        content: toolContent,
      },
    ],
    proposal: {
      op: 'create',
      title: E2E_AGENT_DEMO_TITLE,
      parentId: null,
    },
  }
}

function buildSave(selectedId: string): E2eDemoPack {
  /** Same title as created page so the diff focuses on content only. */
  const nextTitle = E2E_AGENT_DEMO_TITLE
  const nextBody = e2eLongDocAfter()
  const toolContent = JSON.stringify({
    op: 'save',
    pageId: selectedId,
    title: nextTitle,
    body: nextBody,
    parentId: null,
  })
  return {
    messages: [
      {
        role: 'user',
        content: 'Update the opening and closing lines of the long document.',
      },
      {
        role: 'assistant',
        content: 'Here is a proposed save. Confirm to apply.',
        tool_calls: [
          {
            function: {
              name: 'propose_page_save',
              arguments: { page_id: selectedId },
            },
          },
        ],
      },
      { role: 'tool', tool_name: 'propose_page_save', content: toolContent },
    ],
    proposal: {
      op: 'save',
      pageId: selectedId,
      title: nextTitle,
      body: nextBody,
      parentId: null,
    },
  }
}

function buildDelete(selectedId: string, selectedTitle: string): E2eDemoPack {
  const title = selectedTitle?.trim() || E2E_AGENT_DEMO_TITLE
  const toolContent = JSON.stringify({
    op: 'delete',
    pageId: selectedId,
    title,
  })
  return {
    messages: [
      { role: 'user', content: 'Delete this page.' },
      {
        role: 'assistant',
        content: 'I propose deleting this page. Confirm to remove it.',
        tool_calls: [
          {
            function: {
              name: 'propose_page_delete',
              arguments: { page_id: selectedId },
            },
          },
        ],
      },
      { role: 'tool', tool_name: 'propose_page_delete', content: toolContent },
    ],
    proposal: {
      op: 'delete',
      pageId: selectedId,
      title,
    },
  }
}

export function buildE2eAgentDemo(
  scenario: 'create' | 'save' | 'delete',
  selectedId: string | null,
  selectedTitle: string,
): E2eDemoPack | null {
  if (scenario === 'create') {
    return buildCreate()
  }
  if (scenario === 'save') {
    return selectedId ? buildSave(selectedId) : null
  }
  return selectedId ? buildDelete(selectedId, selectedTitle) : null
}
