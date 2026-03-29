import { invoke } from '@tauri-apps/api/core'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { lote, refreshMcpTools, runMcpTool } from './lote-app.svelte'

vi.mock('@tauri-apps/api/core', () => ({
  invoke: vi.fn(),
}))

describe('lote-app MCP helpers', () => {
  afterEach(() => {
    vi.mocked(invoke).mockReset()
    lote.mcpEndpoint = ''
    lote.mcpToolArgs = '{}'
    lote.err = ''
  })

  it('refreshMcpTools requires an endpoint', async () => {
    lote.mcpEndpoint = ''
    await refreshMcpTools()
    expect(lote.err).toBe('Set MCP endpoint URL first')
    expect(invoke).not.toHaveBeenCalled()
  })

  it('runMcpTool rejects invalid JSON arguments', async () => {
    lote.mcpEndpoint = 'http://127.0.0.1:9'
    lote.mcpToolArgs = 'not-json'
    await runMcpTool()
    expect(lote.err).toBe('Tool arguments must be valid JSON')
    expect(invoke).not.toHaveBeenCalled()
  })
})
