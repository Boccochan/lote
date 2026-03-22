<script lang="ts">
  import { invoke } from '@tauri-apps/api/core'
  import type { PageMeta, PageDetail } from './lib/types'
  import * as pageTree from './lib/pages-helpers'

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

<div class="flex h-full min-h-0 flex-col bg-zinc-950 text-zinc-100">
  <header
    class="flex shrink-0 items-center justify-between border-b border-zinc-800 px-4 py-2"
  >
    <h1 class="text-sm font-semibold tracking-tight text-zinc-100">Lote</h1>
    <p class="text-xs text-zinc-500">Local notes · Ollama · MCP (Tauri + Svelte, no Next.js)</p>
  </header>

  {#if err}
    <div class="shrink-0 border-b border-red-900/60 bg-red-950/40 px-4 py-2 text-sm text-red-200">
      {err}
    </div>
  {/if}

  <div class="grid min-h-0 flex-1 grid-cols-[240px_1fr_320px] gap-0">
    <!-- Sidebar -->
    <aside class="flex min-h-0 flex-col border-r border-zinc-800 bg-zinc-900/40">
      <div class="flex gap-1 border-b border-zinc-800 p-2">
        <button
          type="button"
          class="rounded-md bg-zinc-800 px-2 py-1 text-xs hover:bg-zinc-700"
          onclick={() => newPage(true)}
        >
          + Page
        </button>
        <button
          type="button"
          class="rounded-md bg-zinc-800 px-2 py-1 text-xs hover:bg-zinc-700 disabled:opacity-40"
          disabled={!selectedId}
          onclick={() => newPage(false)}
        >
          + Child
        </button>
      </div>
      <nav class="min-h-0 flex-1 overflow-y-auto p-2">
        {#each pageTree.orderedPages(pages) as p (p.id)}
          <button
            type="button"
            class="mb-0.5 w-full rounded-md px-2 py-1.5 text-left text-sm {selectedId === p.id
              ? 'bg-zinc-700 text-white'
              : 'text-zinc-300 hover:bg-zinc-800'}"
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
      <div class="flex items-center gap-2 border-b border-zinc-800 px-3 py-2">
        <input
          class="min-w-0 flex-1 rounded-md border border-zinc-700 bg-zinc-900 px-2 py-1 text-sm outline-none focus:border-zinc-500"
          placeholder="Title"
          bind:value={title}
        />
        <label class="flex items-center gap-1 text-xs text-zinc-400">
          Parent
          <select
            class="rounded-md border border-zinc-700 bg-zinc-900 px-1 py-1 text-xs"
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
        <button
          type="button"
          class="rounded-md bg-emerald-800 px-3 py-1 text-xs font-medium text-white hover:bg-emerald-700 disabled:opacity-40"
          disabled={!selectedId}
          onclick={() => void savePage()}
        >
          Save
        </button>
        <button
          type="button"
          class="rounded-md bg-zinc-800 px-2 py-1 text-xs text-red-300 hover:bg-red-950/50 disabled:opacity-40"
          disabled={!selectedId}
          onclick={() => void deletePage()}
        >
          Delete
        </button>
        {#if status}
          <span class="text-xs text-zinc-500">{status}</span>
        {/if}
      </div>
      <textarea
        class="min-h-0 flex-1 resize-none bg-zinc-950 p-4 font-mono text-sm leading-relaxed text-zinc-200 outline-none"
        placeholder="Markdown…"
        bind:value={body}
      ></textarea>
    </main>

    <!-- Right: AI + MCP -->
    <aside class="flex min-h-0 flex-col border-l border-zinc-800 bg-zinc-900/30">
      <section class="flex min-h-0 flex-1 flex-col border-b border-zinc-800 p-3">
        <h2 class="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-400">
          Ollama
        </h2>
        <input
          class="mb-2 w-full rounded-md border border-zinc-700 bg-zinc-900 px-2 py-1 text-xs"
          placeholder="Model name"
          bind:value={model}
        />
        <div class="min-h-0 flex-1 overflow-y-auto rounded-md border border-zinc-800 bg-zinc-950/80 p-2 text-xs">
          {#each chatLog as m, i (i)}
            <div class="mb-2 {m.role === 'user' ? 'text-zinc-200' : 'text-emerald-200/90'}">
              <span class="font-semibold">{m.role === 'user' ? 'You' : 'Model'}:</span>
              {m.text}
            </div>
          {/each}
          {#if chatBusy}
            <p class="text-zinc-500">…</p>
          {/if}
        </div>
        <div class="mt-2 flex gap-1">
          <input
            class="min-w-0 flex-1 rounded-md border border-zinc-700 bg-zinc-900 px-2 py-1 text-xs"
            placeholder="Message…"
            bind:value={chatInput}
            onkeydown={(e) => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), void sendChat())}
          />
          <button
            type="button"
            class="rounded-md bg-zinc-800 px-2 py-1 text-xs hover:bg-zinc-700"
            onclick={() => void sendChat()}
            disabled={chatBusy}
          >
            Send
          </button>
        </div>
      </section>

      <section class="flex max-h-[45%] min-h-0 flex-col p-3">
        <h2 class="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-400">
          MCP client
        </h2>
        <input
          class="mb-2 w-full rounded-md border border-zinc-700 bg-zinc-900 px-2 py-1 text-xs"
          placeholder="MCP HTTP endpoint (JSON-RPC POST)"
          bind:value={mcpEndpoint}
        />
        <div class="mb-2 flex gap-1">
          <button
            type="button"
            class="rounded-md bg-zinc-800 px-2 py-1 text-xs hover:bg-zinc-700"
            onclick={() => void refreshMcpTools()}
          >
            List tools
          </button>
        </div>
        <pre
          class="mb-2 max-h-24 min-h-0 overflow-auto rounded-md border border-zinc-800 bg-zinc-950 p-2 text-[10px] text-zinc-400"
        >{mcpToolsRaw || '—'}</pre>
        <input
          class="mb-1 w-full rounded-md border border-zinc-700 bg-zinc-900 px-2 py-1 text-xs"
          placeholder="tool name"
          bind:value={mcpToolName}
        />
        <textarea
          class="mb-2 min-h-[52px] w-full resize-none rounded-md border border-zinc-700 bg-zinc-900 px-2 py-1 font-mono text-[10px]"
          placeholder="JSON object for arguments"
          bind:value={mcpToolArgs}
        ></textarea>
        <button
          type="button"
          class="mb-2 rounded-md bg-zinc-800 px-2 py-1 text-xs hover:bg-zinc-700"
          onclick={() => void runMcpTool()}
        >
          Call tool
        </button>
        <pre
          class="min-h-0 flex-1 overflow-auto rounded-md border border-zinc-800 bg-zinc-950 p-2 text-[10px] text-zinc-300"
        >{mcpResult || '—'}</pre>
      </section>

      <section class="border-t border-zinc-800 p-3">
        <h2 class="mb-1 text-xs font-semibold uppercase tracking-wide text-zinc-500">
          MCP server (stub)
        </h2>
        <p class="text-[10px] leading-snug text-zinc-600">
          Exposing this app as an MCP server for cloud AIs is not implemented in this MVP.
        </p>
      </section>
    </aside>
  </div>
</div>
