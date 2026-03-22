<script lang="ts">
  let {
    text,
    class: className = '',
  }: {
    text: string
    class?: string
  } = $props()

  const base =
    'overflow-auto rounded-md border border-zinc-200 bg-zinc-50 font-mono text-zinc-800'
</script>

<pre class="{base} {className}">{text || '—'}</pre>
