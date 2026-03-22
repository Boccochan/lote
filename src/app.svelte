<script lang="ts">
  import { invoke } from '@tauri-apps/api/core'

  import ActionButton from './components/action-button.svelte'
  import AppHeader from './components/app-header.svelte'
  import ErrorBanner from './components/error-banner.svelte'
  import JsonPre from './components/json-pre.svelte'
  import PanelTitle from './components/panel-title.svelte'
  import TextArea from './components/text-area.svelte'
  import TextField from './components/text-field.svelte'
  import * as pageTree from './lib/pages-helpers'
  import type { PageDetail, PageMeta } from './lib/types'

  let pages = $state<PageMeta[]>([])
  let selectedId = $state<string | null>(null)
  let title = $state('')
  let body = $state('')
  /** empty string = root */
  let parentSelect = $state('')
  let status = $state('')
  let err = $state('')

  /** Ollama library tag: https://ollama.com/library/gemma3:1b */
  let model = $state('gemma3:1b')
  let chatInput = $state('')
  let chatLog = $state<{ role: 'user' | 'assistant'; text: string }[]>([])
  let chatBusy = $state(false)

  let mcpEndpoint = $state('')
  let mcpToolsRaw = $state('')
  let mcpToolName = $state('')
  let mcpToolArgs = $state('{}')
  let mcpResult = $state('')

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
    chatBusy = true
    err = ''
    chatLog = [...chatLog, { role: 'user', text: msg }]
    chatInput = ''
    try {
      const reply = await invoke<string>('ollama_chat', { model, userMessage: msg })
      chatLog = [...chatLog, { role: 'assistant', text: reply }]
    } catch (e) {
      err = String(e)
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
        <div class="min-h-0 flex-1 overflow-y-auto rounded-md border border-zinc-200 bg-white p-2 text-xs">
          {#each chatLog as m, i (i)}
            <div class="mb-2 {m.role === 'user' ? 'text-zinc-800' : 'text-emerald-700'}">
              <span class="font-semibold">{m.role === 'user' ? 'You' : 'Model'}:</span>
              {m.text}
            </div>
          {/each}
          {#if chatBusy}
            <p class="text-zinc-400">…</p>
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
