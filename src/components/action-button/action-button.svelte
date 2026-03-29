<script lang="ts">
  import type { Snippet } from 'svelte'

  type Variant = 'default' | 'primary' | 'danger' | 'approve' | 'outline'

  let {
    variant = 'default',
    disabled = false,
    type = 'button',
    class: className = '',
    dataTestId = undefined,
    children,
    onclick,
  }: {
    variant?: Variant
    disabled?: boolean
    type?: 'button' | 'submit' | 'reset'
    class?: string
    /** Stable hook for desktop WebDriver / E2E. */
    dataTestId?: string
    children: Snippet
    onclick?: (e: MouseEvent) => void
  } = $props()

  const base = $derived(
    variant === 'primary' || variant === 'approve'
      ? 'rounded-md bg-emerald-600 px-3 py-1 text-xs font-medium text-white hover:bg-emerald-500 disabled:opacity-40'
      : variant === 'danger'
        ? 'rounded-md border border-red-200 bg-red-50 px-2 py-1 text-xs text-red-700 hover:bg-red-100 disabled:opacity-40'
        : variant === 'outline'
          ? 'rounded-md border border-zinc-300 bg-white px-2 py-1 text-xs font-medium text-zinc-800 hover:bg-zinc-50 disabled:opacity-40'
          : 'rounded-md border border-zinc-200 bg-zinc-100 px-2 py-1 text-xs text-zinc-800 hover:bg-zinc-200 disabled:opacity-40',
  )
</script>

<button
  {type}
  class="{base} {className}"
  data-testid={dataTestId}
  {disabled}
  {onclick}
>
  {@render children()}
</button>
