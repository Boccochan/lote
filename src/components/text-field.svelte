<script lang="ts">
  let {
    value = $bindable(''),
    placeholder = '',
    class: className = '',
    onkeydown,
  }: {
    value?: string
    placeholder?: string
    class?: string
    onkeydown?: (e: KeyboardEvent) => void
  } = $props()

  const base =
    'rounded-md border border-zinc-700 bg-zinc-900 px-2 py-1 text-sm outline-none focus:border-zinc-500'
</script>

<input class="{base} {className}" bind:value {placeholder} {onkeydown} />
