<script lang="ts">
  let { message }: { message: string } = $props()
</script>

{#if message}
  <div
    class="shrink-0 border-b border-red-900/60 bg-red-950/40 px-4 py-2 text-sm text-red-200"
  >
    {message}
  </div>
{/if}
