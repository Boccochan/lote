<script lang="ts">
  import type { Snippet } from 'svelte'

  let {
    tone = 'default',
    class: className = '',
    children,
  }: {
    tone?: 'default' | 'muted'
    class?: string
    children: Snippet
  } = $props()

  const toneClass = $derived(tone === 'muted' ? 'text-zinc-500' : 'text-zinc-400')
</script>

<h2 class="mb-2 text-xs font-semibold uppercase tracking-wide {toneClass} {className}">
  {@render children()}
</h2>
