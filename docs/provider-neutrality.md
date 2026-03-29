# LLM provider neutrality — plan and policy

This document describes how to evolve Lote’s generative-AI integration so the **orchestration and tools stay stable** while **HTTP/API details remain swappable** (Ollama today; other local or cloud providers later).

## Goals

- **Single internal model** for chat + optional function/tool calling that the agent loop and `ToolRegistry` depend on—not on any one vendor’s JSON verbatim.
- **Thin adapters** per provider: serialize requests, parse responses, map errors; no business logic duplication.
- **Stable app boundary** toward the frontend: command names and DTO names should not encode “Ollama” unless we intentionally expose a legacy alias.
- **Incremental migration**: keep the app working on Ollama while introducing abstractions; avoid a big-bang rewrite.

## Current state (summary)

Strengths:

- `run_agent_loop` is generic over a completion trait and is unit-tested with a scripted client.
- Tool execution is centralized in `ToolRegistry` / `ToolHandler` and is not tied to Ollama.

Gaps:

- Trait and several types are named after Ollama; Tauri commands and some helpers bind to `ReqwestOllamaClient`.
- Domain types in `agent/types.rs` are documented and shaped for Ollama’s `/api/chat`; they overlap OpenAI-style chat but are not framed as a neutral “internal protocol.”
- Simple chat (`chat_simple_user_message`) takes a concrete Ollama client type instead of the trait.

## Policy: layers and responsibilities

| Layer | Responsibility | Provider-specific? |
|-------|----------------|----------------------|
| **Internal DTOs** | `ChatMessage`, tool definitions, tool calls, assistant turn (text + calls) | **No** (stable app vocabulary) |
| **Completion port** | One async operation: complete chat with optional tools → assistant turn | **No** (trait name should be neutral, e.g. `ChatCompletionClient`) |
| **Adapters** | HTTP URL, headers, auth, request/response JSON, streaming (future), retries | **Yes** |
| **Agent loop** | Step limit, markdown coercion fallback, tool whitelist, message history | **No** |
| **Tool registry** | Definitions, invoke, JSON Schema for parameters | **No** (schema is portable) |
| **Tauri commands** | Map `AppHandle`, config, and errors to the frontend | **Neutral** API surface; may delegate to a selected adapter |

### Naming

- Prefer **neutral** names at the boundary: `agent_chat`, `AgentChatResult`, `ChatCompletionClient`, `ProviderError` (examples—not mandatory spellings).
- Keep **provider-prefixed** types/modules only inside adapter crates or modules (e.g. `ollama::Client`, `openai::Client`).
- Frontend: invoke **neutral** command names; optional `provider` or `backend` field in the payload if multiple backends are exposed simultaneously.

### Internal message / tool shape

- Treat the current structures as **the app’s canonical chat+tools model** until a deliberate redesign.
- When a provider differs (e.g. separate system blocks, tool result IDs, multimodal parts), **map in the adapter**:
  - **In**: provider response → `AssistantTurn` + append `ChatMessage` rows the loop already understands.
  - **Out**: `&[ChatMessage]` + `&[ToolDefinition]` → provider request.
- Document any field that exists only for one family of APIs (e.g. `tool_name` on tool messages) and how adapters must populate it.

### Configuration

- Centralize **base URL, API keys, model id, timeouts** in one place (file or env—decision can follow existing app config patterns).
- Default can remain “local Ollama” for developer ergonomics; production setups may point elsewhere without renaming commands.

### Errors

- Split **orchestration errors** (`MaxSteps`, `UnknownTool`) from **transport/model errors** (HTTP, parse, provider message).
- Avoid a single variant named after one vendor unless it is truly vendor-specific diagnostics surfaced to users.

## Migration plan (phased)

### Phase 1 — Rename and generalize the port (no behavior change)

- Rename `OllamaHttpClient` to a neutral trait (e.g. `ChatCompletionClient`) with the same `complete(...)` contract (or rename method to `complete_chat` if clearer).
- Rename `OllamaAgentResult` → neutral agent result type; keep serde shape stable or add aliased fields for one release if the frontend depends on exact names.
- Update `AgentError::Ollama` → neutral variant (e.g. `Completion(String)` or `Provider(String)`).
- Change `chat_simple_user_message` to accept `&impl ChatCompletionClient` (or `&dyn ...`) instead of `&ReqwestOllamaClient`.

### Phase 2 — Neutral command surface

- Add Tauri commands with **neutral names** (e.g. `agent_chat`, `chat_simple`) that call the same logic as today.
- Keep `ollama_*` commands as thin wrappers that delegate to the neutral commands **only if** backward compatibility is needed; otherwise deprecate and remove after updating the frontend.
- Update the Svelte app to call neutral commands and types.

### Phase 3 — Adapter module layout

- Move Ollama HTTP details into a dedicated module (e.g. `agent::providers::ollama`) implementing the completion trait.
- Optional: introduce a small factory or match on a `ProviderKind` enum that constructs the right adapter from config (Ollama first; second provider proves the shape).

### Phase 4 — Second provider (proof)

- Implement one additional adapter (e.g. OpenAI-compatible HTTP or another local runtime) to validate:
  - Tool definition JSON still round-trips.
  - Tool result messages satisfy the second API.
  - Tests: fake client + one integration test per adapter if feasible.

### Phase 5 — Optional enhancements

- Streaming tokens to the UI (trait extension or separate `Stream` port).
- Per-provider caps (max tools, context length hints) documented on the adapter, not in the loop.

## Testing policy

- **Agent loop**: continue using an in-memory scripted client; no network.
- **Adapters**: unit tests for JSON mapping fixtures (golden request/response snippets) where helpful.
- **Regression**: after refactors, run existing `runner` and `client` tests unchanged in behavior.

## Out of scope (for this document)

- Choosing a specific cloud provider, billing, or compliance strategy.
- MCP vs built-in tools: MCP remains a separate integration; only document overlaps if a provider shares transport with MCP.

## References (code)

Key touchpoints today:

- `src-tauri/src/agent/runner.rs` — agent loop.
- `src-tauri/src/agent/client.rs` — completion trait + Ollama HTTP client.
- `src-tauri/src/agent/types.rs` — chat/tool DTOs.
- `src-tauri/src/agent/registry.rs` — tools.
- `src-tauri/src/commands/ollama*.rs` — Tauri entrypoints.
- `src/lib/lote-app.svelte.ts` and `src/routes/(app)/` — `invoke` targets and chat types.

Update this document when phases complete or policy changes.
