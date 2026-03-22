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
      ? 'rounded-md bg-emerald-800 px-3 py-1 text-xs font-medium text-white hover:bg-emerald-700 disabled:opacity-40'
      : variant === 'danger'
        ? 'rounded-md bg-zinc-800 px-2 py-1 text-xs text-red-300 hover:bg-red-950/50 disabled:opacity-40'
        : 'rounded-md bg-zinc-800 px-2 py-1 text-xs hover:bg-zinc-700 disabled:opacity-40',
  )
</script>

<button {type} class="{base} {className}" {disabled} {onclick}>
  {@render children()}
</button>
