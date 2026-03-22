use std::sync::{Arc, OnceLock};

use crate::agent::{
    run_agent_loop, ChatMessage, OllamaAgentResult, ReqwestOllamaClient, ToolRegistry,
};

static BUILTIN_TOOLS: OnceLock<Arc<ToolRegistry>> = OnceLock::new();

fn builtin_tools() -> Arc<ToolRegistry> {
    BUILTIN_TOOLS
        .get_or_init(|| Arc::new(ToolRegistry::with_builtin_tools()))
        .clone()
}

/// Runs a tool-capable agent loop against local Ollama.
/// Only tools registered in the app (see `ToolRegistry`) can execute.
#[tauri::command]
pub async fn ollama_agent_chat(
    model: String,
    messages: Vec<ChatMessage>,
    max_steps: Option<u32>,
) -> Result<OllamaAgentResult, String> {
    let client = ReqwestOllamaClient::default();
    run_agent_loop(
        &client,
        &model,
        messages,
        builtin_tools().as_ref(),
        max_steps.unwrap_or(8),
    )
    .await
    .map_err(|e| e.to_string())
}
