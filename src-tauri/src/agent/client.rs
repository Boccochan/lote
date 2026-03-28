use async_trait::async_trait;
use crate::agent::types::{ChatMessage, ToolCall, ToolDefinition};

/// One assistant turn from Ollama (text and/or tool calls).
#[derive(Debug, Clone, PartialEq)]
pub struct AssistantTurn {
    pub content: String,
    pub tool_calls: Vec<ToolCall>,
}

#[async_trait]
pub trait ChatCompletionClient: Send + Sync {
    async fn complete(
        &self,
        model: &str,
        messages: &[ChatMessage],
        tools: &[ToolDefinition],
    ) -> Result<AssistantTurn, String>;
}

#[derive(Debug, Clone, Copy, Default)]
pub enum AiProvider {
    #[default]
    Ollama,
}

pub fn create_chat_completion_client(provider: AiProvider) -> Box<dyn ChatCompletionClient> {
    match provider {
        AiProvider::Ollama => Box::new(crate::agent::ollama::ReqwestOllamaClient::default()),
    }
}

/// Non-streaming chat against local Ollama (single user message, no tools).
pub async fn chat_simple_user_message(
    client: &dyn ChatCompletionClient,
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

