<script lang="ts">
  import { invoke } from '@tauri-apps/api/core'

  import ActionButton from './components/action-button'
  import AppHeader from './components/app-header'
  import ErrorBanner from './components/error-banner'
  import JsonPre from './components/json-pre'
  import PanelTitle from './components/panel-title'
  import TextArea from './components/text-area'
  import TextField from './components/text-field'
  import TypingDots from './components/typing-dots'
  import * as pageTree from './lib/pages-helpers'
  import type { PageDetail, PageMeta, SearchHit } from './lib/types'

  /** Matches Rust `ChatMessage` / Ollama JSON (snake_case fields). */
  type AgentChatMessage = {
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

  let pages = $state<PageMeta[]>([])
  let selectedId = $state<string | null>(null)
  let title = $state('')
  let body = $state('')
  /** empty string = root */
  let parentSelect = $state('')
  let status = $state('')
  let err = $state('')

  /** Ollama model tag. See https://ollama.com/search */
  let model = $state('orieg/gemma3-tools:1b')
  let chatInput = $state('')
  let chatMessages = $state<AgentChatMessage[]>([])
  let chatBusy = $state(false)
  let showAgentDebug = $state(false)
  let agentDebugTrace = $state<string[]>([])

  let mcpEndpoint = $state('')
  let mcpToolsRaw = $state('')
  let mcpToolName = $state('')
  let mcpToolArgs = $state('{}')
  let mcpResult = $state('')

  let searchQuery = $state('')
  let searchHits = $state<SearchHit[]>([])
  let searchBusy = $state(false)

  async function loadPages() {
    err = ''
    try {
      pages = await invoke<PageMeta[]>('pages_list')
      if (selectedId && !pages.some((p) => p.id === selectedId)) {
        selectedId = null
        title = ''
        body = ''
        parentSelect = ''
      }
    } catch (e) {
      err = String(e)
    }
  }

  /** Fragment used for in-app page links (open in editor on click). */
  function pageHref(id: string): string {
    return `#page/${encodeURIComponent(id)}`
  }

  function parseSearchHitsFromTool(content: string | undefined): SearchHit[] | null {
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
        const title = (row as { title?: unknown }).title
        const snippet = (row as { snippet?: unknown }).snippet
        out.push({
          entity: { kind: typeof ent?.kind === 'string' ? ent.kind : 'page', id },
          title: typeof title === 'string' ? title : '',
          snippet: typeof snippet === 'string' ? snippet : undefined,
        })
      }
      return out
    } catch {
      return null
    }
  }

  async function openPage(id: string) {
    err = ''
    selectedId = id
    try {
      const d = await invoke<PageDetail>('pages_get', { id })
      title = d.meta.title
      body = d.body
      parentSelect = d.meta.parent_id ?? ''
    } catch (e) {
      err = String(e)
    }
  }

  async function savePage() {
    if (!selectedId) return
    err = ''
    status = 'Saving…'
    try {
      await invoke('pages_save', {
        id: selectedId,
        title,
        parentId: parentSelect || null,
        body,
      })
      status = 'Saved'
      await loadPages()
    } catch (e) {
      err = String(e)
      status = ''
    }
  }

  async function newPage(root: boolean) {
    err = ''
    status = ''
    try {
      const meta = await invoke<PageMeta>('pages_create', {
        title: 'Untitled',
        parentId: root ? null : selectedId,
      })
      await loadPages()
      await openPage(meta.id)
    } catch (e) {
      err = String(e)
    }
  }

  async function runPageSearch() {
    const q = searchQuery.trim()
    if (!q) {
      searchHits = []
      return
    }
    searchBusy = true
    err = ''
    try {
      searchHits = await invoke<SearchHit[]>('pages_search', { query: q, limit: 25 })
    } catch (e) {
      err = String(e)
    } finally {
      searchBusy = false
    }
  }

  async function deletePage() {
    if (!selectedId) return
    if (!confirm('Delete this page?')) return
    err = ''
    try {
      await invoke('pages_delete', { id: selectedId })
      selectedId = null
      title = ''
      body = ''
      parentSelect = ''
      await loadPages()
    } catch (e) {
      err = String(e)
    }
  }

  async function sendChat() {
    const msg = chatInput.trim()
    if (!msg || chatBusy) return
    err = ''
    chatMessages = [...chatMessages, { role: 'user', content: msg }]
    chatInput = ''
    chatBusy = true
    const messages: AgentChatMessage[] = [...chatMessages]
    try {
      const result = await invoke<AgentChatResult>('agent_chat', {
        model,
        messages,
        max_steps: 8,
      })
      chatMessages = (result.messages ?? []).filter((m) => m.role !== 'system')
      agentDebugTrace = result.debugTrace ?? []
    } catch (e) {
      err = String(e)
      agentDebugTrace = []
    } finally {
      chatBusy = false
    }
  }

  async function refreshMcpTools() {
    err = ''
    mcpResult = ''
    if (!mcpEndpoint.trim()) {
      err = 'Set MCP endpoint URL first'
      return
    }
    try {
      const v = await invoke<unknown>('mcp_list_tools', { endpoint: mcpEndpoint.trim() })
      mcpToolsRaw = JSON.stringify(v, null, 2)
    } catch (e) {
      err = String(e)
    }
  }

  async function runMcpTool() {
    err = ''
    mcpResult = ''
    if (!mcpEndpoint.trim()) {
      err = 'Set MCP endpoint URL'
      return
    }
    let args: Record<string, unknown>
    try {
      args = JSON.parse(mcpToolArgs || '{}') as Record<string, unknown>
    } catch {
      err = 'Tool arguments must be valid JSON'
      return
    }
    try {
      const v = await invoke<unknown>('mcp_call_tool', {
        endpoint: mcpEndpoint.trim(),
        name: mcpToolName.trim(),
        arguments: args,
      })
      mcpResult = JSON.stringify(v, null, 2)
    } catch (e) {
      err = String(e)
    }
  }

  $effect(() => {
    void loadPages()
  })
</script>

<div class="flex h-full min-h-0 flex-col bg-white text-zinc-900">
  <AppHeader
    title="Lote"
    subtitle="Local notes · Ollama · MCP (Tauri + Svelte, no Next.js)"
  />

  <ErrorBanner message={err} />

  <div class="grid min-h-0 flex-1 grid-cols-[240px_1fr_320px] gap-0">
    <!-- Sidebar -->
    <aside class="flex min-h-0 flex-col border-r border-zinc-200 bg-zinc-50/80">
      <div class="flex gap-1 border-b border-zinc-200 p-2">
        <ActionButton onclick={() => newPage(true)}>+ Page</ActionButton>
        <ActionButton disabled={!selectedId} onclick={() => newPage(false)}>+ Child</ActionButton>
      </div>
      <div class="border-b border-zinc-200 p-2">
        <div class="flex gap-1">
          <TextField
            class="min-w-0 flex-1 text-xs"
            placeholder="Search pages…"
            bind:value={searchQuery}
            onkeydown={(e) =>
              e.key === 'Enter' && (e.preventDefault(), void runPageSearch())}
          />
          <ActionButton disabled={searchBusy} onclick={() => void runPageSearch()}>Search</ActionButton>
        </div>
        {#if searchHits.length > 0}
          <p class="mt-2 text-[10px] font-medium uppercase tracking-wide text-zinc-500">Results</p>
          <ul class="mt-1 max-h-40 list-none space-y-2 overflow-y-auto pl-0">
            {#each searchHits as h (h.entity.id)}
              <li>
                <a
                  href={pageHref(h.entity.id)}
                  class="block text-sm font-medium text-sky-700 underline decoration-sky-600/50 underline-offset-2 hover:text-sky-900 hover:decoration-sky-800"
                  onclick={(e) => {
                    e.preventDefault()
                    void openPage(h.entity.id)
                  }}
                >
                  {h.title || '(untitled)'}
                </a>
                {#if h.snippet}
                  <p class="mt-0.5 line-clamp-2 pl-0 text-[10px] leading-snug text-zinc-500">{h.snippet}</p>
                {/if}
              </li>
            {/each}
          </ul>
        {/if}
      </div>
      <nav class="min-h-0 flex-1 overflow-y-auto p-2">
        {#each pageTree.orderedPages(pages) as p (p.id)}
          <button
            type="button"
            class="mb-0.5 w-full rounded-md px-2 py-1.5 text-left text-sm {selectedId === p.id
              ? 'bg-zinc-200 text-zinc-900'
              : 'text-zinc-700 hover:bg-zinc-100'}"
            style="padding-left: {0.5 + pageTree.depthOf(p, pages) * 0.75}rem"
            onclick={() => openPage(p.id)}
          >
            {p.title || '(untitled)'}
          </button>
        {:else}
          <p class="px-2 text-xs text-zinc-500">No pages yet</p>
        {/each}
      </nav>
    </aside>

    <!-- Editor -->
    <main class="flex min-h-0 flex-col">
      <div class="flex items-center gap-2 border-b border-zinc-200 px-3 py-2">
        <TextField
          class="min-w-0 flex-1"
          placeholder="Title"
          bind:value={title}
        />
        <label class="flex items-center gap-1 text-xs text-zinc-600">
          Parent
          <select
            class="rounded-md border border-zinc-300 bg-white px-1 py-1 text-xs text-zinc-900"
            bind:value={parentSelect}
          >
            <option value="">—</option>
            {#each pages as p (p.id)}
              {#if p.id !== selectedId}
                <option value={p.id}>{p.title}</option>
              {/if}
            {/each}
          </select>
        </label>
        <ActionButton variant="primary" disabled={!selectedId} onclick={() => void savePage()}>Save</ActionButton>
        <ActionButton variant="danger" disabled={!selectedId} onclick={() => void deletePage()}>Delete</ActionButton>
        {#if status}
          <span class="text-xs text-zinc-500">{status}</span>
        {/if}
      </div>
      <TextArea
        plain
        class="min-h-0 flex-1 p-4 font-mono text-sm leading-relaxed text-zinc-800"
        placeholder="Markdown…"
        bind:value={body}
      />
    </main>

    <!-- Right: AI + MCP -->
    <aside class="flex min-h-0 flex-col border-l border-zinc-200 bg-zinc-50/50">
      <section class="flex min-h-0 flex-1 flex-col border-b border-zinc-200 p-3">
        <PanelTitle>Ollama</PanelTitle>
        <TextField
          class="mb-2 w-full text-xs"
          placeholder="Model name"
          bind:value={model}
        />
        <label class="mb-2 flex cursor-pointer items-center gap-2 text-[10px] text-zinc-600">
          <input type="checkbox" bind:checked={showAgentDebug} class="rounded border-zinc-300" />
          Show agent debug (tool trace)
        </label>
        {#if showAgentDebug && agentDebugTrace.length > 0}
          <JsonPre
            class="mb-2 max-h-28 min-h-0 p-2 text-[10px] leading-snug text-zinc-600"
            text={agentDebugTrace.join('\n')}
          />
        {/if}
        <div class="min-h-0 flex-1 overflow-y-auto rounded-md border border-zinc-200 bg-white p-2 text-xs">
          {#each chatMessages.filter((m) => m.role !== 'system') as m, i (i)}
            {#if m.role === 'user'}
              <div class="mb-2 text-zinc-800">
                <span class="font-semibold">You:</span>
                {m.content ?? ''}
              </div>
            {:else if m.role === 'tool' && m.tool_name === 'search_pages'}
              {@const toolHits = parseSearchHitsFromTool(m.content)}
              <div class="mb-2 text-amber-950">
                <span class="font-semibold">Tool (search_pages):</span>
                {#if toolHits !== null}
                  {#if toolHits.length === 0}
                    <p class="mt-1 text-[11px] text-amber-900/90">No matching pages.</p>
                  {:else}
                    <ul class="mt-1 list-none space-y-2 pl-0">
                      {#each toolHits as h (h.entity.id)}
                        <li>
                          <a
                            href={pageHref(h.entity.id)}
                            class="text-[12px] font-medium text-sky-800 underline decoration-sky-600/50 underline-offset-2 hover:text-sky-950"
                            onclick={(e) => {
                              e.preventDefault()
                              void openPage(h.entity.id)
                            }}
                          >
                            {h.title || '(untitled)'}
                          </a>
                          {#if h.snippet}
                            <p class="mt-0.5 line-clamp-2 text-[10px] leading-snug text-zinc-600">{h.snippet}</p>
                          {/if}
                        </li>
                      {/each}
                    </ul>
                  {/if}
                {:else}
                  <pre class="mt-1 max-h-32 overflow-auto whitespace-pre-wrap break-words font-mono text-[10px] text-amber-900/90">{m.content ?? ''}</pre>
                {/if}
              </div>
            {:else if m.role === 'tool'}
              <div class="mb-2 text-amber-900">
                <span class="font-semibold">Tool ({m.tool_name ?? '?'}):</span>
                {m.content ?? ''}
              </div>
            {:else}
              <div class="mb-2 text-emerald-800">
                <span class="font-semibold">Model:</span>
                {m.content ?? ''}
                {#if m.tool_calls?.length}
                  <span class="text-zinc-500">
                    [tools:
                    {m.tool_calls.map((t) => t.function?.name ?? '?').join(', ')}]
                  </span>
                {/if}
              </div>
            {/if}
          {/each}
          {#if chatBusy}
            <TypingDots />
          {/if}
        </div>
        <div class="mt-2 flex gap-1">
          <TextField
            class="min-w-0 flex-1 text-xs"
            placeholder="Message…"
            bind:value={chatInput}
            onkeydown={(e) =>
              e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), void sendChat())}
          />
          <ActionButton disabled={chatBusy} onclick={() => void sendChat()}>Send</ActionButton>
        </div>
      </section>

      <section class="flex max-h-[45%] min-h-0 flex-col p-3">
        <PanelTitle>MCP client</PanelTitle>
        <TextField
          class="mb-2 w-full text-xs"
          placeholder="MCP HTTP endpoint (JSON-RPC POST)"
          bind:value={mcpEndpoint}
        />
        <div class="mb-2 flex gap-1">
          <ActionButton onclick={() => void refreshMcpTools()}>List tools</ActionButton>
        </div>
        <JsonPre
          class="mb-2 max-h-24 min-h-0 p-2 text-[10px] text-zinc-600"
          text={mcpToolsRaw}
        />
        <TextField
          class="mb-1 w-full text-xs"
          placeholder="tool name"
          bind:value={mcpToolName}
        />
        <TextArea
          class="mb-2 min-h-[52px] w-full px-2 py-1 font-mono text-[10px]"
          placeholder="JSON object for arguments"
          bind:value={mcpToolArgs}
        />
        <ActionButton class="mb-2" onclick={() => void runMcpTool()}>Call tool</ActionButton>
        <JsonPre
          class="min-h-0 flex-1 p-2 text-[10px] text-zinc-700"
          text={mcpResult}
        />
      </section>

      <section class="border-t border-zinc-200 p-3">
        <PanelTitle tone="muted" class="!mb-1">MCP server (stub)</PanelTitle>
        <p class="text-[10px] leading-snug text-zinc-500">
          Exposing this app as an MCP server for cloud AIs is not implemented in this MVP.
        </p>
      </section>
    </aside>
  </div>
</div>
