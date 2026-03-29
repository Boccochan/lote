<script lang="ts">
  import { deletePage, lote, savePage } from '$lib/lote-app.svelte'

  import ActionButton from '../../components/action-button'
  import TextArea from '../../components/text-area'
  import TextField from '../../components/text-field'
</script>

<div class="flex items-center gap-2 border-b border-zinc-200 px-3 py-2">
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
  <ActionButton
    variant="primary"
    dataTestId="editor-save"
    disabled={!lote.selectedId}
    onclick={() => void savePage()}
  >
    Save
  </ActionButton>
  <ActionButton variant="danger" disabled={!lote.selectedId} onclick={() => void deletePage()}>Delete</ActionButton>
  {#if lote.status}
    <span class="text-xs text-zinc-500">{lote.status}</span>
  {/if}
</div>
<TextArea
  plain
  class="min-h-0 flex-1 p-4 font-mono text-sm leading-relaxed text-zinc-800"
  dataTestId="editor-body"
  placeholder="Markdown…"
  bind:value={lote.body}
/>
