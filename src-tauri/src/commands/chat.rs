use tauri::AppHandle;

use crate::agent::client::{chat_simple_user_message, create_chat_completion_client, AiProvider};
use crate::agent::{run_agent_loop, AgentChatResult, ChatMessage, ToolRegistry};

/// Reduces models imitating VS Code / Copilot / web search tool names that do not exist in this app.
const AGENT_SYSTEM_PROMPT: &str = r#"You run inside the Lote app. The ONLY tools you may use are exactly those provided by the host: `echo` and `search_pages`.

- To search the user's local markdown notes or pages, you MUST call `search_pages` with a `query` string. Do not invent tool names (no vscode, copilot, websearch, google, or browser tools—they are not available).
- Do not paste fake tool JSON in markdown. Use the API's native tool-calling mechanism so the host can run `search_pages`.
- You cannot search the public web; only local pages via `search_pages`."#;

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
