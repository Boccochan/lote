<script lang="ts">
  let { message }: { message: string } = $props()
</script>

{#if message}
  <div
    class="shrink-0 border-b border-red-200 bg-red-50 px-4 py-2 text-sm text-red-800"
  >
    {message}
  </div>
{/if}
