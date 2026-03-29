<script lang="ts">
  import type { ProposalPreview } from '$lib/proposal-preview'
  import { diffBodyToProposalRows } from '$lib/proposal-preview'

  import ActionButton from '../action-button'

  let {
    preview,
    busy,
    onApprove,
    onCancel,
  }: {
    preview: ProposalPreview
    busy: boolean
    onApprove: () => void
    onCancel: () => void
  } = $props()

  const titleDiff = $derived(
    preview.kind === 'save' ? preview.before.title !== preview.after.title : false,
  )
  const parentDiff = $derived(
    preview.kind === 'save' ? preview.before.parentLabel !== preview.after.parentLabel : false,
  )
  const bodyDiff = $derived(
    preview.kind === 'save' ? preview.before.body !== preview.after.body : false,
  )

  const bodyRows = $derived(
    preview.kind === 'save' && bodyDiff
      ? diffBodyToProposalRows(preview.before.body, preview.after.body)
      : [],
  )

  const saveHasAnyChange = $derived(
    preview.kind === 'save' ? titleDiff || parentDiff || bodyDiff : false,
  )
</script>

<div
  class="mb-2 rounded-md border border-zinc-200 bg-zinc-50/95 p-2.5 shadow-sm"
  role="region"
  aria-label="Review proposed change"
  data-testid="chat-proposal-panel"
>
  {#if preview.kind === 'delete'}
    <p class="text-[11px] font-semibold text-zinc-900">Delete page</p>
    <p class="mt-2 text-[11px] leading-snug text-zinc-800">
      Permanently delete <span class="font-semibold">“{preview.pageTitle}”</span>? This cannot be undone.
    </p>
    <p class="mt-1 text-[10px] text-zinc-500">Cancel to keep the page, or Approve to delete it.</p>
  {:else if preview.kind === 'create'}
    <p class="text-[11px] font-semibold text-zinc-900">New page</p>
    <p class="mt-1 text-[10px] text-zinc-600">The following page will be created:</p>
    <div
      class="mt-2 rounded border border-zinc-300 bg-white px-2.5 py-2 text-[10px] leading-relaxed text-zinc-800"
    >
      <p><span class="text-zinc-500">Title:</span> {preview.afterTitle}</p>
      <p class="mt-1.5"><span class="text-zinc-500">Parent:</span> {preview.afterParentLabel}</p>
    </div>
  {:else}
    <p class="text-[11px] font-semibold text-zinc-900">Save changes to page</p>
    <p class="mt-1 text-[10px] text-zinc-500">
      Red = removed, green = added. Title and parent appear only if they change.
    </p>

    {#if saveHasAnyChange}
      {#if titleDiff}
        <p class="mt-2 text-[10px] font-medium text-zinc-600">Title</p>
        <div class="mt-0.5 overflow-hidden rounded border border-zinc-200 font-mono text-[10px] leading-snug">
          <div class="flex bg-red-50 text-red-900">
            <span class="w-4 shrink-0 select-none px-1 text-center text-red-600">-</span>
            <span class="min-w-0 flex-1 whitespace-pre-wrap break-words py-0.5 pr-1">{preview.before
                .title}</span>
          </div>
          <div class="flex border-t border-zinc-100 bg-green-50 text-green-900">
            <span class="w-4 shrink-0 select-none px-1 text-center text-green-700">+</span>
            <span class="min-w-0 flex-1 whitespace-pre-wrap break-words py-0.5 pr-1">{preview.after.title}</span>
          </div>
        </div>
      {/if}

      {#if parentDiff}
        <p class="mt-2 text-[10px] font-medium text-zinc-600">Parent</p>
        <div class="mt-0.5 overflow-hidden rounded border border-zinc-200 font-mono text-[10px] leading-snug">
          <div class="flex bg-red-50 text-red-900">
            <span class="w-4 shrink-0 select-none px-1 text-center text-red-600">-</span>
            <span class="min-w-0 flex-1 whitespace-pre-wrap break-words py-0.5 pr-1">{preview.before
                .parentLabel}</span>
          </div>
          <div class="flex border-t border-zinc-100 bg-green-50 text-green-900">
            <span class="w-4 shrink-0 select-none px-1 text-center text-green-700">+</span>
            <span class="min-w-0 flex-1 whitespace-pre-wrap break-words py-0.5 pr-1">{preview.after
                .parentLabel}</span>
          </div>
        </div>
      {/if}

      {#if bodyDiff}
        <p class="mt-2 text-[10px] font-medium text-zinc-600">Content</p>
        <div
          class="mt-0.5 max-h-[280px] overflow-y-auto rounded border border-zinc-200 font-mono text-[10px] leading-snug"
        >
          {#each bodyRows as row, ri (ri)}
            {#if row.type === 'collapsed'}
              <div
                class="flex min-h-[1.25rem] border-b border-sky-200/80 bg-sky-100/90 last:border-b-0"
                data-testid="chat-proposal-body-collapsed"
                role="presentation"
                title="{row.omittedCount ?? 0} unchanged lines omitted"
              >
                <span class="w-4 shrink-0 select-none px-1 text-center text-sky-500"></span>
                <span
                  class="min-w-0 flex-1 py-0.5 pr-1 text-center text-[10px] font-medium text-sky-800"
                >
                  省略
                </span>
              </div>
            {:else}
              <div
                class="flex min-h-[1.25rem] border-b border-zinc-100 last:border-b-0 {row.type === 'remove'
                  ? 'bg-red-50 text-red-950'
                  : row.type === 'add'
                    ? 'bg-green-50 text-green-950'
                    : 'bg-white text-zinc-700'}"
              >
                <span
                  class="w-4 shrink-0 select-none px-1 text-center {row.type === 'remove'
                    ? 'text-red-600'
                    : row.type === 'add'
                      ? 'text-green-700'
                      : 'text-zinc-400'}"
                >
                  {row.type === 'remove' ? '-' : row.type === 'add' ? '+' : ' '}
                </span>
                <span class="min-w-0 flex-1 whitespace-pre-wrap break-words py-0.5 pr-1">{row.text || ' '}</span>
              </div>
            {/if}
          {/each}
        </div>
      {/if}
    {:else}
      <p class="mt-2 text-[10px] text-zinc-500">No field changes detected in this proposal.</p>
    {/if}
  {/if}

  <div class="mt-3 flex justify-end gap-2">
    <ActionButton variant="outline" disabled={busy} dataTestId="chat-proposal-cancel" onclick={onCancel}>
      Cancel
    </ActionButton>
    <ActionButton variant="approve" disabled={busy} dataTestId="chat-proposal-approve" onclick={onApprove}>
      Approve
    </ActionButton>
  </div>
</div>
