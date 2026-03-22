use serde::{Deserialize, Serialize};

const DEFAULT_OLLAMA: &str = "http://127.0.0.1:11434";

#[derive(Serialize)]
struct ChatMessage {
    role: String,
    content: String,
}

#[derive(Serialize)]
struct OllamaChatRequest {
    model: String,
    messages: Vec<ChatMessage>,
    stream: bool,
}

#[derive(Deserialize)]
struct OllamaChatResponse {
    message: OllamaMessageBody,
}

#[derive(Deserialize)]
struct OllamaMessageBody {
    content: String,
}

/// Non-streaming chat against local Ollama.
#[tauri::command]
pub async fn ollama_chat(model: String, user_message: String) -> Result<String, String> {
    let url = format!("{DEFAULT_OLLAMA}/api/chat");
    let body = OllamaChatRequest {
        model,
        messages: vec![ChatMessage {
            role: "user".into(),
            content: user_message,
        }],
        stream: false,
    };
    let client = reqwest::Client::new();
    let res = client
        .post(&url)
        .json(&body)
        .send()
        .await
        .map_err(|e| format!("ollama request: {e}"))?;
    let status = res.status();
    if !status.is_success() {
        let txt = res.text().await.unwrap_or_default();
        return Err(format!("ollama HTTP {status}: {txt}"));
    }
    let parsed: OllamaChatResponse = res
        .json()
        .await
        .map_err(|e| format!("ollama json: {e}"))?;
    Ok(parsed.message.content)
}
