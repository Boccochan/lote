<script lang="ts">
  let {
    value = $bindable(''),
    placeholder = '',
    plain = false,
    class: className = '',
    dataTestId = undefined,
  }: {
    value?: string
    placeholder?: string
    plain?: boolean
    class?: string
    /** Stable hook for desktop WebDriver / E2E. */
    dataTestId?: string
  } = $props()

  const base = $derived(
    plain
      ? 'resize-none bg-white text-zinc-900 outline-none placeholder:text-zinc-400'
      : 'resize-none rounded-md border border-zinc-300 bg-white text-zinc-900 outline-none placeholder:text-zinc-400 focus:border-zinc-500',
  )
</script>

<textarea class="{base} {className}" data-testid={dataTestId} bind:value {placeholder}></textarea>
