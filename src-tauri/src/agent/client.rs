//! HTTP client for Ollama `/api/chat` (non-streaming).

use std::collections::HashSet;
use std::sync::Mutex;

use async_trait::async_trait;
use serde::{Deserialize, Serialize};

use crate::agent::types::{ChatMessage, ToolCall, ToolDefinition};

const DEFAULT_OLLAMA: &str = "http://127.0.0.1:11434";

fn ollama_tools_unsupported(body: &str) -> bool {
    body.to_ascii_lowercase()
        .contains("does not support tools")
}

#[derive(Serialize)]
struct OllamaChatRequest {
    model: String,
    messages: Vec<ChatMessage>,
    stream: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    tools: Option<Vec<ToolDefinition>>,
}

#[derive(Deserialize)]
struct OllamaChatResponse {
    message: OllamaMessageBody,
}

#[derive(Deserialize)]
struct OllamaMessageBody {
    #[serde(default)]
    content: String,
    #[serde(default)]
    tool_calls: Option<Vec<ToolCall>>,
}

/// One assistant turn from Ollama (text and/or tool calls).
#[derive(Debug, Clone, PartialEq)]
pub struct AssistantTurn {
    pub content: String,
    pub tool_calls: Vec<ToolCall>,
}

#[async_trait]
pub trait OllamaHttpClient: Send + Sync {
    async fn complete(
        &self,
        model: &str,
        messages: &[ChatMessage],
        tools: &[ToolDefinition],
    ) -> Result<AssistantTurn, String>;
}

pub struct ReqwestOllamaClient {
    pub base_url: String,
    http: reqwest::Client,
    /// Models that returned HTTP 400 because tool calling is not supported; we omit `tools` next time.
    models_without_tool_support: Mutex<HashSet<String>>,
}

impl Default for ReqwestOllamaClient {
    fn default() -> Self {
        Self {
            base_url: DEFAULT_OLLAMA.to_string(),
            http: reqwest::Client::new(),
            models_without_tool_support: Mutex::new(HashSet::new()),
        }
    }
}

#[async_trait]
impl OllamaHttpClient for ReqwestOllamaClient {
    async fn complete(
        &self,
        model: &str,
        messages: &[ChatMessage],
        tools: &[ToolDefinition],
    ) -> Result<AssistantTurn, String> {
        let cached_skip = self
            .models_without_tool_support
            .lock()
            .map_err(|e| format!("ollama client lock: {e}"))?
            .contains(model);
        let mut send_tools = !cached_skip && !tools.is_empty();

        let url = format!("{}/api/chat", self.base_url.trim_end_matches('/'));

        loop {
            let tools_payload: &[ToolDefinition] = if send_tools { tools } else { &[] };
            let body = OllamaChatRequest {
                model: model.to_string(),
                messages: messages.to_vec(),
                stream: false,
                tools: if tools_payload.is_empty() {
                    None
                } else {
                    Some(tools_payload.to_vec())
                },
            };
            let res = self
                .http
                .post(&url)
                .json(&body)
                .send()
                .await
                .map_err(|e| format!("ollama request: {e}"))?;
            let status = res.status();
            if !status.is_success() {
                let txt = res.text().await.unwrap_or_default();
                if status.as_u16() == 400
                    && send_tools
                    && ollama_tools_unsupported(&txt)
                {
                    if let Ok(mut g) = self.models_without_tool_support.lock() {
                        g.insert(model.to_string());
                    }
                    send_tools = false;
                    continue;
                }
                return Err(format!("ollama HTTP {status}: {txt}"));
            }
            let parsed: OllamaChatResponse = res
                .json()
                .await
                .map_err(|e| format!("ollama json: {e}"))?;
            let tool_calls = parsed.message.tool_calls.unwrap_or_default();
            return Ok(AssistantTurn {
                content: parsed.message.content,
                tool_calls,
            });
        }
    }
}

/// Non-streaming chat against local Ollama (single user message, no tools).
pub async fn chat_simple_user_message(
    client: &ReqwestOllamaClient,
    model: &str,
    user_message: &str,
) -> Result<String, String> {
    let turn = client
        .complete(
            model,
            &[ChatMessage::user(user_message)],
            &[],
        )
        .await?;
    Ok(turn.content)
}

#[cfg(test)]
mod tests {
    use super::ollama_tools_unsupported;

    #[test]
    fn detects_ollama_tools_unsupported_message() {
        let body = r#"{"error":"registry.ollama.ai/library/gemma3:1b does not support tools"}"#;
        assert!(ollama_tools_unsupported(body));
    }

    #[test]
    fn other_400_bodies_not_flagged() {
        assert!(!ollama_tools_unsupported("model not found"));
    }
}
