<script lang="ts">
  import { deletePage, lote, savePage } from '$lib/lote-app.svelte'
  import { renderMarkdownToHtml } from '$lib/markdown/render-markdown'

  import ActionButton from '../../components/action-button'
  import TextArea from '../../components/text-area'
  import TextField from '../../components/text-field'

  let editorMode = $state<'edit' | 'preview'>('edit')
  let previewHtml = $state('')
  let previewError = $state('')

  $effect(() => {
    const mode = editorMode
    const body = lote.body
    if (mode !== 'preview') {
      previewError = ''
      return
    }
    let cancelled = false
    previewError = ''
    void renderMarkdownToHtml(body).then(
      (html) => {
        if (!cancelled) previewHtml = html
      },
      (err: unknown) => {
        if (!cancelled) {
          previewError = err instanceof Error ? err.message : String(err)
          previewHtml = ''
        }
      },
    )
    return () => {
      cancelled = true
    }
  })
</script>

<div class="flex min-h-0 flex-1 flex-col">
  <div class="flex flex-wrap items-center gap-2 border-b border-zinc-200 px-3 py-2">
    <TextField
      class="min-w-0 flex-1"
      dataTestId="editor-title"
      placeholder="Title"
      bind:value={lote.title}
    />
    <label class="flex items-center gap-1 text-xs text-zinc-600">
      Parent
      <select
        class="rounded-md border border-zinc-300 bg-white px-1 py-1 text-xs text-zinc-900"
        bind:value={lote.parentSelect}
      >
        <option value="">—</option>
        {#each lote.pages as p (p.id)}
          {#if p.id !== lote.selectedId}
            <option value={p.id}>{p.title}</option>
          {/if}
        {/each}
      </select>
    </label>
    <ActionButton variant="primary" disabled={!lote.selectedId} onclick={() => void savePage()}>Save</ActionButton>
    <ActionButton variant="danger" disabled={!lote.selectedId} onclick={() => void deletePage()}>Delete</ActionButton>
    {#if lote.status}
      <span class="text-xs text-zinc-500">{lote.status}</span>
    {/if}
    <div
      class="ml-auto inline-flex rounded-lg border border-zinc-200/80 bg-zinc-100 p-0.5 shadow-sm"
      role="group"
      aria-label="Editor mode"
      data-testid="editor-mode-toggle"
    >
      <button
        type="button"
        class="rounded-md px-3 py-1 text-xs font-medium transition-colors focus-visible:outline focus-visible:ring-2 focus-visible:ring-zinc-400 {editorMode === 'edit'
          ? 'bg-white text-zinc-900 shadow-sm ring-1 ring-zinc-300 ring-inset'
          : 'bg-transparent text-zinc-600 hover:bg-zinc-200/70 hover:text-zinc-800'}"
        data-testid="editor-mode-edit"
        onclick={() => {
          editorMode = 'edit'
        }}>Edit</button>
      <button
        type="button"
        class="rounded-md px-3 py-1 text-xs font-medium transition-colors focus-visible:outline focus-visible:ring-2 focus-visible:ring-zinc-400 {editorMode === 'preview'
          ? 'bg-white text-zinc-900 shadow-sm ring-1 ring-zinc-300 ring-inset'
          : 'bg-transparent text-zinc-600 hover:bg-zinc-200/70 hover:text-zinc-800'}"
        data-testid="editor-mode-preview"
        onclick={() => {
          editorMode = 'preview'
        }}>Preview</button>
    </div>
  </div>
  {#if editorMode === 'edit'}
    <TextArea
      plain
      dataTestId="editor-body"
      class="min-h-0 flex-1 p-4 font-mono text-sm leading-relaxed text-zinc-800"
      placeholder="Markdown…"
      bind:value={lote.body}
    />
  {:else}
    <div
      class="markdown-preview"
      data-testid="markdown-preview"
      role="region"
      aria-label="Markdown preview"
    >
      {#if previewError}
        <p class="text-sm text-red-700">Preview error: {previewError}</p>
      {:else}
        <!-- HTML is produced by `renderMarkdownToHtml` (rehype-sanitize). -->
        <!-- eslint-disable-next-line svelte/no-at-html-tags -- sanitized Markdown preview -->
        {@html previewHtml}
      {/if}
    </div>
  {/if}
</div>
