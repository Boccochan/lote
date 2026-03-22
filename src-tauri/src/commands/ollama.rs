use crate::agent::{chat_simple_user_message, ReqwestOllamaClient};

/// Non-streaming chat against local Ollama (single user message, no tools).
#[tauri::command]
pub async fn ollama_chat(model: String, user_message: String) -> Result<String, String> {
    let client = ReqwestOllamaClient::default();
    chat_simple_user_message(&client, &model, &user_message).await
}
