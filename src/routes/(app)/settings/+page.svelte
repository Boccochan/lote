<script lang="ts">
  import { lote, refreshMcpTools, runMcpTool } from '$lib/lote-app.svelte'

  import ActionButton from '../../../components/action-button'
  import JsonPre from '../../../components/json-pre'
  import PanelTitle from '../../../components/panel-title'
  import TextArea from '../../../components/text-area'
  import TextField from '../../../components/text-field'
</script>

<div
  class="flex min-h-0 flex-1 flex-col overflow-hidden px-6 py-6"
  data-testid="settings-view"
>
  <h1 class="shrink-0 text-lg font-semibold text-zinc-900">Settings</h1>
  <p class="mt-1 max-w-xl shrink-0 text-sm leading-relaxed text-zinc-600">
    Connection options for the in-app MCP client. The same values are used if the agent integrates with MCP later.
  </p>

  <div class="mt-4 min-h-0 flex-1 space-y-8 overflow-y-auto pr-1">
    <section class="flex flex-col" data-testid="settings-mcp-client">
      <PanelTitle>MCP client</PanelTitle>
      <TextField
        class="mb-2 w-full max-w-xl text-xs"
        placeholder="MCP HTTP endpoint (JSON-RPC POST)"
        bind:value={lote.mcpEndpoint}
      />
      <div class="mb-2 flex gap-1">
        <ActionButton onclick={() => void refreshMcpTools()}>List tools</ActionButton>
      </div>
      <JsonPre
        class="mb-2 max-h-48 min-h-0 w-full max-w-xl p-2 text-[10px] text-zinc-600"
        text={lote.mcpToolsRaw}
      />
      <TextField
        class="mb-1 w-full max-w-xl text-xs"
        placeholder="tool name"
        bind:value={lote.mcpToolName}
      />
      <TextArea
        class="mb-2 min-h-[52px] w-full max-w-xl px-2 py-1 font-mono text-[10px]"
        placeholder="JSON object for arguments"
        bind:value={lote.mcpToolArgs}
      />
      <ActionButton class="mb-2" onclick={() => void runMcpTool()}>Call tool</ActionButton>
      <JsonPre
        class="min-h-[10rem] w-full max-w-xl p-2 text-[10px] text-zinc-700"
        text={lote.mcpResult}
      />
    </section>

    <section class="max-w-xl border-t border-zinc-200 pt-6">
      <PanelTitle tone="muted" class="!mb-1">MCP server (stub)</PanelTitle>
      <p class="text-[10px] leading-snug text-zinc-500">
        Exposing this app as an MCP server for cloud AIs is not implemented in this MVP.
      </p>
    </section>
  </div>
</div>
