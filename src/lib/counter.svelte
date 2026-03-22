<script lang="ts">
  let count: number = $state(0)
  const increment = () => {
    count += 1
  }
</script>

<button
  class="rounded-md border border-zinc-200 bg-zinc-100 px-3 py-1.5 text-sm text-zinc-800 hover:bg-zinc-200"
  onclick={increment}
>
  Count is {count}
</button>
