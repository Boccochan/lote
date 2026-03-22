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
    'rounded-md border border-zinc-300 bg-white px-2 py-1 text-sm text-zinc-900 outline-none placeholder:text-zinc-400 focus:border-zinc-500'
</script>

<input class="{base} {className}" bind:value {placeholder} {onkeydown} />
