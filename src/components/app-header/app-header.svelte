<script lang="ts">
  let { title, subtitle }: { title: string; subtitle: string } = $props()
</script>

<header
  class="flex shrink-0 items-center justify-between border-b border-zinc-200 bg-white px-4 py-2"
>
  <h1 class="text-sm font-semibold tracking-tight text-zinc-900">{title}</h1>
  <p class="text-xs text-zinc-500">{subtitle}</p>
</header>
