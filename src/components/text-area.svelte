<script lang="ts">
  let {
    value = $bindable(''),
    placeholder = '',
    plain = false,
    class: className = '',
  }: {
    value?: string
    placeholder?: string
    plain?: boolean
    class?: string
  } = $props()

  const base = $derived(
    plain
      ? 'resize-none bg-zinc-950 outline-none'
      : 'resize-none rounded-md border border-zinc-700 bg-zinc-900 outline-none focus:border-zinc-500',
  )
</script>

<textarea class="{base} {className}" bind:value {placeholder}></textarea>
