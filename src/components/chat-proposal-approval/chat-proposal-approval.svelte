<script lang="ts">
  import type { ProposalPreview } from '$lib/proposal-preview'

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
    <p class="text-[11px] font-semibold text-zinc-900">Create new page</p>

    <p class="mt-3 text-[10px] font-semibold uppercase tracking-wide text-zinc-500">Before</p>
    <div
      class="mt-1 rounded border border-zinc-300 bg-white px-2.5 py-2 text-[10px] leading-relaxed text-zinc-600"
    >
      {preview.beforeSummary}
    </div>

    <p class="mt-3 text-[10px] font-semibold uppercase tracking-wide text-zinc-500">After</p>
    <div
      class="mt-1 rounded border border-emerald-200 bg-green-50/80 px-2.5 py-2 text-[10px] leading-relaxed text-zinc-800"
    >
      <p><span class="text-zinc-500">Title:</span> {preview.afterTitle}</p>
      <p class="mt-1.5"><span class="text-zinc-500">Parent:</span> {preview.afterParentLabel}</p>
    </div>
  {:else}
    <p class="text-[11px] font-semibold text-zinc-900">Save changes to page</p>
    <p class="mt-1 text-[10px] text-zinc-500">Review what will change. Unchanged title or parent are hidden.</p>

    {#if saveHasAnyChange}
      <p class="mt-3 text-[10px] font-semibold uppercase tracking-wide text-zinc-500">Before</p>
      <div
        class="mt-1 rounded border border-zinc-300 bg-white px-2.5 py-2 text-[10px] leading-relaxed text-zinc-800"
      >
        {#if titleDiff}
          <p><span class="text-zinc-500">Title:</span> {preview.before.title}</p>
        {/if}
        {#if parentDiff}
          <p class={titleDiff ? 'mt-1.5' : ''}>
            <span class="text-zinc-500">Parent:</span>
            {preview.before.parentLabel}
          </p>
        {/if}
        {#if bodyDiff}
          <div class="{titleDiff || parentDiff ? 'mt-2 border-t border-zinc-200 pt-2' : ''}">
            <pre class="whitespace-pre-wrap break-words font-mono text-[10px] leading-snug text-zinc-800">{preview
              .before.body}</pre>
          </div>
        {/if}
      </div>

      <p class="mt-3 text-[10px] font-semibold uppercase tracking-wide text-zinc-500">After</p>
      <div
        class="mt-1 rounded border border-emerald-200 bg-green-50/80 px-2.5 py-2 text-[10px] leading-relaxed text-zinc-800"
      >
        {#if titleDiff}
          <p><span class="text-zinc-500">Title:</span> {preview.after.title}</p>
        {/if}
        {#if parentDiff}
          <p class={titleDiff ? 'mt-1.5' : ''}>
            <span class="text-zinc-500">Parent:</span>
            {preview.after.parentLabel}
          </p>
        {/if}
        {#if bodyDiff}
          <div class="{titleDiff || parentDiff ? 'mt-2 border-t border-zinc-200 pt-2' : ''}">
            <pre class="whitespace-pre-wrap break-words font-mono text-[10px] leading-snug text-zinc-800">{preview
              .after.body}</pre>
          </div>
        {/if}
      </div>
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
