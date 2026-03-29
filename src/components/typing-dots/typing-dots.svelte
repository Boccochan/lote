<script lang="ts">
  let { label = 'Assistant is replying' }: { label?: string } = $props()
</script>

<div class="mb-2 text-emerald-800" role="status" aria-live="polite">
  <span class="font-semibold">Model:</span>
  <span class="sr-only">{label}</span>
  <span
    class="typing-dots ml-1 inline-flex items-center gap-0.5 align-middle"
    aria-hidden="true"
  >
    <span class="typing-dot inline-block h-1.5 w-1.5 rounded-full bg-emerald-700/80"></span>
    <span class="typing-dot inline-block h-1.5 w-1.5 rounded-full bg-emerald-700/80"></span>
    <span class="typing-dot inline-block h-1.5 w-1.5 rounded-full bg-emerald-700/80"></span>
  </span>
</div>
