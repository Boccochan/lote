<script lang="ts">
  import type { ProposalPreview } from '$lib/proposal-preview'
  import { compareBodyLines } from '$lib/proposal-preview'

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

  const bodyRows = $derived(
    preview.kind === 'save' ? compareBodyLines(preview.before.body, preview.after.body) : [],
  )

  const titleDiff = $derived(
    preview.kind === 'save' ? preview.before.title !== preview.after.title : false,
  )
  const parentDiff = $derived(
    preview.kind === 'save' ? preview.before.parentLabel !== preview.after.parentLabel : false,
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
    <div class="mt-2 grid grid-cols-2 gap-2 text-[10px]">
      <div>
        <p class="mb-0.5 font-medium uppercase tracking-wide text-zinc-500">Before</p>
        <div class="rounded border border-zinc-200 bg-white p-2 text-zinc-600">
          {preview.beforeSummary}
        </div>
      </div>
      <div>
        <p class="mb-0.5 font-medium uppercase tracking-wide text-zinc-500">After</p>
        <div class="rounded border border-emerald-200 bg-green-50/80 p-2 text-zinc-800">
          <p><span class="text-zinc-500">Title:</span> {preview.afterTitle}</p>
          <p class="mt-1"><span class="text-zinc-500">Parent:</span> {preview.afterParentLabel}</p>
        </div>
      </div>
    </div>
  {:else}
    <p class="text-[11px] font-semibold text-zinc-900">Save changes to page</p>
    <p class="mt-1 text-[10px] text-zinc-500">Compare before and after. Changed lines are highlighted.</p>
    <div class="mt-2 space-y-2 text-[10px]">
      <div class="grid grid-cols-2 gap-2">
        <div>
          <p class="mb-0.5 font-medium uppercase tracking-wide text-zinc-500">Before</p>
          <div
            class="rounded border border-zinc-200 p-1.5 {titleDiff
              ? 'bg-red-50/90'
              : 'bg-white'}"
          >
            {preview.before.title}
          </div>
        </div>
        <div>
          <p class="mb-0.5 font-medium uppercase tracking-wide text-zinc-500">After</p>
          <div
            class="rounded border border-zinc-200 p-1.5 {titleDiff
              ? 'bg-green-50/90'
              : 'bg-white'}"
          >
            {preview.after.title}
          </div>
        </div>
      </div>
      <div class="grid grid-cols-2 gap-2">
        <div>
          <p class="mb-0.5 font-medium uppercase tracking-wide text-zinc-500">Parent</p>
          <div
            class="rounded border border-zinc-200 p-1.5 {parentDiff
              ? 'bg-red-50/90'
              : 'bg-white'}"
          >
            {preview.before.parentLabel}
          </div>
        </div>
        <div>
          <p class="mb-0.5 font-medium uppercase tracking-wide text-zinc-500">Parent</p>
          <div
            class="rounded border border-zinc-200 p-1.5 {parentDiff
              ? 'bg-green-50/90'
              : 'bg-white'}"
          >
            {preview.after.parentLabel}
          </div>
        </div>
      </div>
      <div>
        <p class="mb-0.5 font-medium uppercase tracking-wide text-zinc-500">Body</p>
        <div class="grid max-h-48 grid-cols-2 gap-1 overflow-y-auto rounded border border-zinc-200">
          <div class="border-r border-zinc-200 bg-white">
            {#each bodyRows as row, ri (ri)}
              <div
                class="whitespace-pre-wrap break-words border-b border-zinc-100 px-1.5 py-0.5 font-mono leading-snug {row.unchanged
                  ? 'bg-white text-zinc-700'
                  : 'bg-red-50/90 text-zinc-900'}"
              >
                {row.beforeLine || ' '}
              </div>
            {/each}
          </div>
          <div class="bg-white">
            {#each bodyRows as row, ri (ri)}
              <div
                class="whitespace-pre-wrap break-words border-b border-zinc-100 px-1.5 py-0.5 font-mono leading-snug {row.unchanged
                  ? 'bg-white text-zinc-700'
                  : 'bg-green-50/90 text-zinc-900'}"
              >
                {row.afterLine || ' '}
              </div>
            {/each}
          </div>
        </div>
      </div>
    </div>
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
