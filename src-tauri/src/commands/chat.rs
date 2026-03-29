use tauri::AppHandle;

use crate::agent::client::{chat_simple_user_message, create_chat_completion_client, AiProvider};
use crate::agent::{run_agent_loop, AgentChatResult, ChatMessage, ToolRegistry};

/// Reduces models imitating VS Code / Copilot / web search tool names that do not exist in this app.
const AGENT_SYSTEM_PROMPT: &str = r#"You run inside the Lote app. The ONLY tools you may use are exactly those provided by the host: `echo`, `search_pages`, `propose_page_create`, `propose_page_save`, and `propose_page_delete`.

- To search the user's local markdown notes or pages, call `search_pages` with a `query` string. You cannot search the public web.
- To create, update, or delete pages, you MUST use the `propose_page_*` tools only. Those tools record what you want to do; the host does NOT apply changes until the user explicitly confirms in the UI. Never claim a page was created, saved, or deleted until after the user has confirmed (you will not see confirmation in-chat).
- Do not invent other tool names (no vscode, copilot, websearch, google, or browser tools).
- Prefer native tool-calling for `search_pages` and `propose_page_*`; do not paste fake tool JSON in markdown unless the host supports it."#;

/// Provider-neutral non-streaming chat command.
#[tauri::command]
pub async fn chat_simple(model: String, user_message: String) -> Result<String, String> {
    let client = create_chat_completion_client(AiProvider::default());
    chat_simple_user_message(client.as_ref(), &model, &user_message).await
}

/// Provider-neutral tool-capable agent chat command.
#[tauri::command]
pub async fn agent_chat(
    app: AppHandle,
    model: String,
    mut messages: Vec<ChatMessage>,
    max_steps: Option<u32>,
) -> Result<AgentChatResult, String> {
    if !messages
        .first()
        .map(|m| m.role == "system")
        .unwrap_or(false)
    {
        messages.insert(0, ChatMessage::system(AGENT_SYSTEM_PROMPT));
    }
    let client = create_chat_completion_client(AiProvider::default());
    let registry = ToolRegistry::with_builtin_tools(app);
    run_agent_loop(
        client.as_ref(),
        &model,
        messages,
        &registry,
        max_steps.unwrap_or(8),
    )
    .await
    .map_err(|e| e.to_string())
}
