import { invoke } from '@tauri-apps/api/core'

import { goto } from '$app/navigation'
import { resolve } from '$app/paths'
import { buildE2eAgentDemo } from '$lib/lote-app-e2e-seed'
import type { ProposalPreview } from '$lib/proposal-preview'
import type { PageDetail, PageMeta, SearchHit } from '$lib/types'

/** Matches Rust `ChatMessage` / Ollama JSON (snake_case fields). */
export type AgentChatMessage = {
  role: string
  content?: string
  tool_calls?: { function: { name: string; arguments: unknown } }[]
  tool_name?: string
}

/** Matches Rust `PageProposal` (camelCase). */
export type PageProposal = {
  op: 'create' | 'save' | 'delete'
  pageId?: string
  title?: string
  /** Absent vs null: treat absent as undefined; empty string means root when saving. */
  parentId?: string | null
  body?: string
}

type AgentChatResult = {
  messages: AgentChatMessage[]
  assistantReply: string
  stepsUsed: number
  debugTrace?: string[]
  pendingProposal?: PageProposal | null
}

export const lote = $state({
  pages: [] as PageMeta[],
  selectedId: null as string | null,
  title: '',
  body: '',
  /** empty string = root */
  parentSelect: '',
  status: '',
  err: '',

  model: 'orieg/gemma3-tools:1b',
  chatInput: '',
  chatMessages: [] as AgentChatMessage[],
  chatBusy: false,
  /** Set when the model used a `propose_page_*` tool; cleared on confirm, dismiss, or new chat message. */
  pendingProposal: null as PageProposal | null,
  /** Human-readable before/after for the approval card (not sent to the model). */
  pendingProposalPreview: null as ProposalPreview | null,
  showAgentDebug: false,
  agentDebugTrace: [] as string[],

  mcpEndpoint: '',
  mcpToolsRaw: '',
  mcpToolName: '',
  mcpToolArgs: '{}',
  mcpResult: '',

  searchQuery: '',
  searchHits: [] as SearchHit[],
  searchBusy: false,
})

export async function loadPages() {
  lote.err = ''
  try {
    lote.pages = await invoke<PageMeta[]>('pages_list')
    if (lote.selectedId && !lote.pages.some((p) => p.id === lote.selectedId)) {
      lote.selectedId = null
      lote.title = ''
      lote.body = ''
      lote.parentSelect = ''
    }
  } catch (e) {
    lote.err = String(e)
  }
}

/** Short label for the confirmation banner (English, user-facing). */
export function formatPageProposalLabel(p: PageProposal): string {
  if (p.op === 'create') {
    return `Create page "${(p.title ?? 'Untitled').trim() || 'Untitled'}"`
  }
  if (p.op === 'save') {
    return `Update page ${p.pageId ?? '(unknown id)'}`
  }
  return `Delete "${(p.title ?? p.pageId ?? 'page').trim() || 'page'}"`
}

export function parsePageProposalFromTool(content: string | undefined): PageProposal | null {
  if (!content?.trim()) return null
  try {
    const v = JSON.parse(content) as Record<string, unknown>
    if (!v || typeof v !== 'object') return null
    const op = v.op
    if (op !== 'create' && op !== 'save' && op !== 'delete') return null
    const parentId = v.parentId
    let normalizedParent: string | null | undefined
    if (parentId === undefined) normalizedParent = undefined
    else if (parentId === null) normalizedParent = null
    else if (typeof parentId === 'string') normalizedParent = parentId
    else return null
    return {
      op,
      pageId: typeof v.pageId === 'string' ? v.pageId : undefined,
      title: typeof v.title === 'string' ? v.title : undefined,
      parentId: normalizedParent,
      body: typeof v.body === 'string' ? v.body : undefined,
    }
  } catch {
    return null
  }
}

export function parseSearchHitsFromTool(content: string | undefined): SearchHit[] | null {
  if (!content?.trim()) return null
  try {
    const v = JSON.parse(content) as unknown
    if (!Array.isArray(v)) return null
    const out: SearchHit[] = []
    for (const row of v) {
      if (!row || typeof row !== 'object') continue
      const ent = (row as { entity?: { id?: unknown; kind?: unknown }; title?: unknown }).entity
      const id = ent?.id
      if (typeof id !== 'string' || !id) continue
      const rowTitle = (row as { title?: unknown }).title
      const snippet = (row as { snippet?: unknown }).snippet
      out.push({
        entity: { kind: typeof ent?.kind === 'string' ? ent.kind : 'page', id },
        title: typeof rowTitle === 'string' ? rowTitle : '',
        snippet: typeof snippet === 'string' ? snippet : undefined,
      })
    }
    return out
  } catch {
    return null
  }
}

export async function openPage(id: string) {
  lote.err = ''
  lote.selectedId = id
  try {
    const d = await invoke<PageDetail>('pages_get', { id })
    lote.title = d.meta.title
    lote.body = d.body
    lote.parentSelect = d.meta.parent_id ?? ''
    await goto(resolve('/'), { replaceState: false })
  } catch (e) {
    lote.err = String(e)
  }
}

export async function savePage() {
  if (!lote.selectedId) return
  lote.err = ''
  lote.status = 'Saving…'
  try {
    await invoke('pages_save', {
      id: lote.selectedId,
      title: lote.title,
      parentId: lote.parentSelect || null,
      body: lote.body,
    })
    lote.status = 'Saved'
    await loadPages()
  } catch (e) {
    lote.err = String(e)
    lote.status = ''
  }
}

export async function newPage(root: boolean) {
  lote.err = ''
  lote.status = ''
  try {
    const meta = await invoke<PageMeta>('pages_create', {
      title: 'Untitled',
      parentId: root ? null : lote.selectedId,
    })
    await loadPages()
    await openPage(meta.id)
  } catch (e) {
    lote.err = String(e)
  }
}

export async function runPageSearch() {
  const q = lote.searchQuery.trim()
  if (!q) {
    lote.searchHits = []
    return
  }
  lote.searchBusy = true
  lote.err = ''
  try {
    lote.searchHits = await invoke<SearchHit[]>('pages_search', { query: q, limit: 25 })
  } catch (e) {
    lote.err = String(e)
  } finally {
    lote.searchBusy = false
  }
}

export async function deletePage() {
  if (!lote.selectedId) return
  if (!confirm('Delete this page?')) return
  lote.err = ''
  try {
    await invoke('pages_delete', { id: lote.selectedId })
    lote.selectedId = null
    lote.title = ''
    lote.body = ''
    lote.parentSelect = ''
    await loadPages()
  } catch (e) {
    lote.err = String(e)
  }
}

function parentFolderLabel(pages: PageMeta[], parentId: string | null | undefined): string {
  if (parentId === null || parentId === undefined || parentId === '') {
    return 'Root'
  }
  const p = pages.find((x) => x.id === parentId)
  return p?.title?.trim() || 'Folder'
}

/**
 * Fills {@link lote.pendingProposalPreview} from current pages + disk so the UI can show Before/After without raw ids.
 */
export async function refreshProposalPreview(): Promise<void> {
  const p = lote.pendingProposal
  if (!p) {
    lote.pendingProposalPreview = null
    return
  }
  await loadPages()
  const pages = lote.pages

  if (p.op === 'create') {
    lote.pendingProposalPreview = {
      kind: 'create',
      beforeSummary: 'No page yet',
      afterTitle: (p.title ?? 'Untitled').trim() || 'Untitled',
      afterParentLabel: parentFolderLabel(pages, p.parentId),
    }
    return
  }

  if (p.op === 'delete') {
    let pageTitle = p.title?.trim()
    if (!pageTitle && p.pageId) {
      try {
        const d = await invoke<PageDetail>('pages_get', { id: p.pageId })
        pageTitle = d.meta.title
      } catch {
        pageTitle = undefined
      }
    }
    lote.pendingProposalPreview = {
      kind: 'delete',
      pageTitle: pageTitle?.trim() || 'This page',
    }
    return
  }

  if (p.op === 'save' && p.pageId) {
    try {
      const d = await invoke<PageDetail>('pages_get', { id: p.pageId })
      lote.pendingProposalPreview = {
        kind: 'save',
        before: {
          title: d.meta.title,
          body: d.body,
          parentLabel: parentFolderLabel(pages, d.meta.parent_id),
        },
        after: {
          title: p.title ?? '',
          body: p.body ?? '',
          parentLabel: parentFolderLabel(pages, p.parentId),
        },
      }
    } catch {
      lote.pendingProposalPreview = null
    }
    return
  }

  lote.pendingProposalPreview = null
}

/**
 * Populates chat + pending proposal to mimic an agent turn (desktop capture / PR screenshots only).
 * No-op unless the app was built with `VITE_E2E_CAPTURE=true`.
 */
export async function seedE2eAgentProposalDemo(scenario: 'create' | 'save' | 'delete'): Promise<void> {
  if (import.meta.env.VITE_E2E_CAPTURE !== 'true') {
    return
  }
  lote.chatBusy = false
  const pack = buildE2eAgentDemo(scenario, lote.selectedId, lote.title)
  if (!pack) {
    lote.pendingProposal = null
    lote.pendingProposalPreview = null
    return
  }
  lote.chatMessages = pack.messages as AgentChatMessage[]
  lote.pendingProposal = pack.proposal as PageProposal
  await refreshProposalPreview()
}

export function dismissPendingProposal() {
  lote.pendingProposal = null
  lote.pendingProposalPreview = null
}

export async function confirmPendingProposal() {
  const p = lote.pendingProposal
  if (!p || lote.chatBusy) return
  lote.chatBusy = true
  lote.err = ''
  try {
    if (p.op === 'create') {
      const meta = await invoke<PageMeta>('pages_create', {
        title: p.title?.trim() || 'Untitled',
        parentId: p.parentId && p.parentId !== '' ? p.parentId : null,
      })
      lote.pendingProposal = null
      lote.pendingProposalPreview = null
      await loadPages()
      await openPage(meta.id)
      return
    }
    if (p.op === 'save') {
      const id = p.pageId
      if (!id) {
        lote.err = 'Proposal is missing page id'
        return
      }
      await invoke('pages_save', {
        id,
        title: p.title ?? '',
        parentId: p.parentId && p.parentId !== '' ? p.parentId : null,
        body: p.body ?? '',
      })
      lote.pendingProposal = null
      lote.pendingProposalPreview = null
      await loadPages()
      if (lote.selectedId === id) {
        const d = await invoke<PageDetail>('pages_get', { id })
        lote.title = d.meta.title
        lote.body = d.body
        lote.parentSelect = d.meta.parent_id ?? ''
      }
      return
    }
    if (p.op === 'delete') {
      const id = p.pageId
      if (!id) {
        lote.err = 'Proposal is missing page id'
        return
      }
      await invoke('pages_delete', { id })
      lote.pendingProposal = null
      lote.pendingProposalPreview = null
      if (lote.selectedId === id) {
        lote.selectedId = null
        lote.title = ''
        lote.body = ''
        lote.parentSelect = ''
      }
      await loadPages()
    }
  } catch (e) {
    lote.err = String(e)
  } finally {
    lote.chatBusy = false
  }
}

export async function sendChat() {
  const msg = lote.chatInput.trim()
  if (!msg || lote.chatBusy) return
  lote.chatBusy = true
  lote.err = ''
  lote.pendingProposal = null
  lote.pendingProposalPreview = null
  const messages: AgentChatMessage[] = [...lote.chatMessages, { role: 'user', content: msg }]
  lote.chatMessages = messages
  lote.chatInput = ''
  try {
    const result = await invoke<AgentChatResult>('agent_chat', {
      model: lote.model,
      messages,
      max_steps: 8,
    })
    lote.chatMessages = (result.messages ?? []).filter((m) => m.role !== 'system')
    lote.agentDebugTrace = result.debugTrace ?? []
    const pending = result.pendingProposal
    lote.pendingProposal =
      pending && typeof pending === 'object' && 'op' in pending ? pending : null
    await refreshProposalPreview()
  } catch (e) {
    lote.err = String(e)
    lote.agentDebugTrace = []
    lote.pendingProposalPreview = null
  } finally {
    lote.chatBusy = false
  }
}

export async function refreshMcpTools() {
  lote.err = ''
  lote.mcpResult = ''
  if (!lote.mcpEndpoint.trim()) {
    lote.err = 'Set MCP endpoint URL first'
    return
  }
  try {
    const v = await invoke<unknown>('mcp_list_tools', { endpoint: lote.mcpEndpoint.trim() })
    lote.mcpToolsRaw = JSON.stringify(v, null, 2)
  } catch (e) {
    lote.err = String(e)
  }
}

export async function runMcpTool() {
  lote.err = ''
  lote.mcpResult = ''
  if (!lote.mcpEndpoint.trim()) {
    lote.err = 'Set MCP endpoint URL'
    return
  }
  let args: Record<string, unknown>
  try {
    args = JSON.parse(lote.mcpToolArgs || '{}') as Record<string, unknown>
  } catch {
    lote.err = 'Tool arguments must be valid JSON'
    return
  }
  try {
    const v = await invoke<unknown>('mcp_call_tool', {
      endpoint: lote.mcpEndpoint.trim(),
      name: lote.mcpToolName.trim(),
      arguments: args,
    })
    lote.mcpResult = JSON.stringify(v, null, 2)
  } catch (e) {
    lote.err = String(e)
  }
}
