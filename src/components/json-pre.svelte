<script lang="ts">
  let {
    text,
    class: className = '',
  }: {
    text: string
    class?: string
  } = $props()

  const base =
    'overflow-auto rounded-md border border-zinc-800 bg-zinc-950 font-mono'
</script>

<pre class="{base} {className}">{text || '—'}</pre>
