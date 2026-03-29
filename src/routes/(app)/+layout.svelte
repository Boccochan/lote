<script lang="ts">
  import type { Snippet } from 'svelte'

  import { resolve } from '$app/paths'
  import { page } from '$app/state'
  import {
    loadPages,
    lote,
    newPage,
    openPage,
    parseSearchHitsFromTool,
    runPageSearch,
    sendChat,
  } from '$lib/lote-app.svelte'
  import * as pageTree from '$lib/pages-helpers'

  import ActionButton from '../../components/action-button'
  import AppHeader from '../../components/app-header'
  import ErrorBanner from '../../components/error-banner'
  import JsonPre from '../../components/json-pre'
  import PanelTitle from '../../components/panel-title'
  import TextField from '../../components/text-field'
  import TypingDots from '../../components/typing-dots'

  let { children }: { children: Snippet } = $props()

  const onEditor = $derived(page.url.pathname === '/')
  const onSettings = $derived(page.url.pathname === '/settings')

  $effect(() => {
    void loadPages()
  })
</script>

<div class="flex h-full min-h-0 flex-col bg-white text-zinc-900" data-testid="lote-app">
  <AppHeader
    title="Lote"
    subtitle="Local notes · Ollama · MCP (Tauri + SvelteKit, no Next.js)"
  />

  <ErrorBanner message={lote.err} />

  <div class="grid min-h-0 flex-1 grid-cols-[240px_1fr_320px] gap-0">
    <!-- Sidebar -->
    <aside class="flex min-h-0 flex-col border-r border-zinc-200 bg-zinc-50/80">
      <div class="flex gap-1 border-b border-zinc-200 p-2">
        <ActionButton dataTestId="btn-new-root-page" onclick={() => newPage(true)}>+ Page</ActionButton>
        <ActionButton disabled={!lote.selectedId} onclick={() => newPage(false)}>+ Child</ActionButton>
      </div>
      <div class="border-b border-zinc-200 p-2">
        <div class="flex gap-1">
          <TextField
            class="min-w-0 flex-1 text-xs"
            placeholder="Search pages…"
            bind:value={lote.searchQuery}
            onkeydown={(e) =>
              e.key === 'Enter' && (e.preventDefault(), void runPageSearch())}
          />
          <ActionButton disabled={lote.searchBusy} onclick={() => void runPageSearch()}>Search</ActionButton>
        </div>
        {#if lote.searchHits.length > 0}
          <p class="mt-2 text-[10px] font-medium uppercase tracking-wide text-zinc-500">Results</p>
          <ul class="mt-1 max-h-40 list-none space-y-2 overflow-y-auto pl-0">
            {#each lote.searchHits as h (h.entity.id)}
              <li>
                <button
                  type="button"
                  class="block w-full cursor-pointer text-left text-sm font-medium text-sky-700 underline decoration-sky-600/50 underline-offset-2 hover:text-sky-900 hover:decoration-sky-800"
                  onclick={() => void openPage(h.entity.id)}
                >
                  {h.title || '(untitled)'}
                </button>
                {#if h.snippet}
                  <p class="mt-0.5 line-clamp-2 pl-0 text-[10px] leading-snug text-zinc-500">{h.snippet}</p>
                {/if}
              </li>
            {/each}
          </ul>
        {/if}
      </div>
      <nav class="min-h-0 flex-1 overflow-y-auto p-2">
        {#each pageTree.orderedPages(lote.pages) as p (p.id)}
          <button
            type="button"
            class="mb-0.5 w-full rounded-md px-2 py-1.5 text-left text-sm {lote.selectedId === p.id && onEditor
              ? 'bg-zinc-200 text-zinc-900'
              : 'text-zinc-700 hover:bg-zinc-100'}"
            style="padding-left: {0.5 + pageTree.depthOf(p, lote.pages) * 0.75}rem"
            onclick={() => void openPage(p.id)}
          >
            {p.title || '(untitled)'}
          </button>
        {:else}
          <p class="px-2 text-xs text-zinc-500">No pages yet</p>
        {/each}
      </nav>
      <div class="shrink-0 border-t border-zinc-200 p-2">
        <a
          href={resolve('/settings')}
          data-testid="sidebar-settings"
          data-sveltekit-preload-data="hover"
          class="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm no-underline {onSettings
            ? 'bg-zinc-200 text-zinc-900'
            : 'text-zinc-700 hover:bg-zinc-100'}"
        >
          <svg
            class="h-4 w-4 shrink-0 text-zinc-600"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            stroke-width="1.5"
            stroke="currentColor"
            aria-hidden="true"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 00-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.932 6.932 0 010 .255c-.007.378.138.75.43.99l1.005.827c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.37.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 001.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.827a1.125 1.125 0 00-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z"
            />
            <path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          Settings
        </a>
      </div>
    </aside>

    <main class="flex min-h-0 flex-col">
      {@render children()}
    </main>

    <!-- Right: Ollama / AI chat (full column height) -->
    <aside class="flex min-h-0 flex-col border-l border-zinc-200 bg-zinc-50/50">
      <section class="flex min-h-0 flex-1 flex-col p-3">
        <PanelTitle>Ollama</PanelTitle>
        <TextField
          class="mb-2 w-full text-xs"
          placeholder="Model name"
          bind:value={lote.model}
        />
        <label class="mb-2 flex cursor-pointer items-center gap-2 text-[10px] text-zinc-600">
          <input type="checkbox" bind:checked={lote.showAgentDebug} class="rounded border-zinc-300" />
          Show agent debug (tool trace)
        </label>
        {#if lote.showAgentDebug && lote.agentDebugTrace.length > 0}
          <JsonPre
            class="mb-2 max-h-28 min-h-0 p-2 text-[10px] leading-snug text-zinc-600"
            text={lote.agentDebugTrace.join('\n')}
          />
        {/if}
        <div class="min-h-0 flex-1 overflow-y-auto rounded-md border border-zinc-200 bg-white p-2 text-xs">
          {#each lote.chatMessages.filter((m) => m.role !== 'system') as m, i (i)}
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
                          <button
                            type="button"
                            class="cursor-pointer text-left text-[12px] font-medium text-sky-800 underline decoration-sky-600/50 underline-offset-2 hover:text-sky-950"
                            onclick={() => void openPage(h.entity.id)}
                          >
                            {h.title || '(untitled)'}
                          </button>
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
          {#if lote.chatBusy}
            <TypingDots />
          {/if}
        </div>
        <div class="mt-2 flex gap-1">
          <TextField
            class="min-w-0 flex-1 text-xs"
            placeholder="Message…"
            bind:value={lote.chatInput}
            onkeydown={(e) =>
              e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), void sendChat())}
          />
          <ActionButton disabled={lote.chatBusy} onclick={() => void sendChat()}>Send</ActionButton>
        </div>
      </section>
    </aside>
  </div>
</div>
