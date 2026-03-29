import { invoke } from '@tauri-apps/api/core'

import { goto } from '$app/navigation'
import { resolve } from '$app/paths'
import type { PageDetail, PageMeta, SearchHit } from '$lib/types'

/** Matches Rust `ChatMessage` / Ollama JSON (snake_case fields). */
export type AgentChatMessage = {
  role: string
  content?: string
  tool_calls?: { function: { name: string; arguments: unknown } }[]
  tool_name?: string
}

type AgentChatResult = {
  messages: AgentChatMessage[]
  assistantReply: string
  stepsUsed: number
  debugTrace?: string[]
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

export async function sendChat() {
  const msg = lote.chatInput.trim()
  if (!msg || lote.chatBusy) return
  lote.chatBusy = true
  lote.err = ''
  const messages: AgentChatMessage[] = [...lote.chatMessages, { role: 'user', content: msg }]
  lote.chatInput = ''
  try {
    const result = await invoke<AgentChatResult>('agent_chat', {
      model: lote.model,
      messages,
      max_steps: 8,
    })
    lote.chatMessages = (result.messages ?? []).filter((m) => m.role !== 'system')
    lote.agentDebugTrace = result.debugTrace ?? []
  } catch (e) {
    lote.err = String(e)
    lote.agentDebugTrace = []
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
