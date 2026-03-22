<script lang="ts">
  import type { Snippet } from 'svelte'

  type Variant = 'default' | 'primary' | 'danger'

  let {
    variant = 'default',
    disabled = false,
    type = 'button',
    class: className = '',
    children,
    onclick,
  }: {
    variant?: Variant
    disabled?: boolean
    type?: 'button' | 'submit' | 'reset'
    class?: string
    children: Snippet
    onclick?: (e: MouseEvent) => void
  } = $props()

  const base = $derived(
    variant === 'primary'
      ? 'rounded-md bg-emerald-600 px-3 py-1 text-xs font-medium text-white hover:bg-emerald-500 disabled:opacity-40'
      : variant === 'danger'
        ? 'rounded-md border border-red-200 bg-red-50 px-2 py-1 text-xs text-red-700 hover:bg-red-100 disabled:opacity-40'
        : 'rounded-md border border-zinc-200 bg-zinc-100 px-2 py-1 text-xs text-zinc-800 hover:bg-zinc-200 disabled:opacity-40',
  )
</script>

<button {type} class="{base} {className}" {disabled} {onclick}>
  {@render children()}
</button>
