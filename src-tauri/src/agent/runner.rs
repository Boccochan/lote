//! Agent loop: call Ollama, run tool handlers, repeat until text reply or max steps.

use crate::agent::client::{AssistantTurn, OllamaHttpClient};
use crate::agent::error::AgentError;
use crate::agent::registry::ToolRegistry;
use crate::agent::types::{ChatMessage, OllamaAgentResult};

pub async fn run_agent_loop<C: OllamaHttpClient>(
    client: &C,
    model: &str,
    mut messages: Vec<ChatMessage>,
    registry: &ToolRegistry,
    max_steps: u32,
) -> Result<OllamaAgentResult, AgentError> {
    let tools = registry.definitions();
    let mut steps_used: u32 = 0;

    loop {
        if steps_used >= max_steps {
            return Err(AgentError::MaxSteps { limit: max_steps });
        }
        steps_used += 1;

        let turn = client
            .complete(model, &messages, &tools)
            .await
            .map_err(AgentError::Ollama)?;

        let AssistantTurn {
            content,
            tool_calls,
        } = turn;

        if tool_calls.is_empty() {
            messages.push(ChatMessage::assistant(content.clone(), None));
            return Ok(OllamaAgentResult {
                messages,
                assistant_reply: content,
                steps_used,
            });
        }

        messages.push(ChatMessage::assistant(
            content,
            Some(tool_calls.clone()),
        ));

        for tc in tool_calls {
            let name = tc.function.name.as_str();
            if !registry.has_tool(name) {
                return Err(AgentError::UnknownTool(name.to_string()));
            }
            let result = registry
                .invoke(name, &tc.function.arguments)
                .await
                .map_err(AgentError::Ollama)?;
            messages.push(ChatMessage::tool(name, result));
        }
    }
}

#[cfg(test)]
mod tests {
    use async_trait::async_trait;
    use serde_json::json;

    use super::*;
    use crate::agent::client::OllamaHttpClient;
    use crate::agent::client::ReqwestOllamaClient;
    use crate::agent::types::{ToolCall, ToolCallFunction, ToolDefinition};

    struct ScriptedClient {
        turns: std::sync::Mutex<Vec<AssistantTurn>>,
    }

    impl ScriptedClient {
        fn new(turns: Vec<AssistantTurn>) -> Self {
            Self {
                turns: std::sync::Mutex::new(turns),
            }
        }
    }

    #[async_trait]
    impl OllamaHttpClient for ScriptedClient {
        async fn complete(
            &self,
            _model: &str,
            _messages: &[ChatMessage],
            _tools: &[ToolDefinition],
        ) -> Result<AssistantTurn, String> {
            let mut g = self.turns.lock().unwrap();
            if g.is_empty() {
                return Err("script exhausted".into());
            }
            Ok(g.remove(0))
        }
    }

    #[tokio::test]
    async fn loop_runs_tool_then_finishes_text() {
        let client = ScriptedClient::new(vec![
            AssistantTurn {
                content: String::new(),
                tool_calls: vec![ToolCall {
                    function: ToolCallFunction {
                        name: "echo".into(),
                        arguments: json!({ "message": "ping" }),
                    },
                }],
            },
            AssistantTurn {
                content: "done".into(),
                tool_calls: vec![],
            },
        ]);
        let reg = ToolRegistry::with_builtin_tools();
        let out = run_agent_loop(
            &client,
            "m",
            vec![ChatMessage::user("hi")],
            &reg,
            8,
        )
        .await
        .unwrap();

        assert_eq!(out.assistant_reply, "done");
        assert_eq!(out.steps_used, 2);
        assert!(out.messages.iter().any(|m| m.role == "tool"));
        assert_eq!(out.messages.last().unwrap().role, "assistant");
    }

    #[tokio::test]
    async fn max_steps_errors() {
        let client = ScriptedClient::new(vec![AssistantTurn {
            content: String::new(),
            tool_calls: vec![ToolCall {
                function: ToolCallFunction {
                    name: "echo".into(),
                    arguments: json!({ "message": "x" }),
                },
            }],
        }]);
        let reg = ToolRegistry::with_builtin_tools();
        let err = run_agent_loop(
            &client,
            "m",
            vec![ChatMessage::user("hi")],
            &reg,
            1,
        )
        .await
        .unwrap_err();
        assert!(matches!(err, AgentError::MaxSteps { limit: 1 }));
    }

    #[tokio::test]
    async fn unknown_tool_errors() {
        let client = ScriptedClient::new(vec![AssistantTurn {
            content: String::new(),
            tool_calls: vec![ToolCall {
                function: ToolCallFunction {
                    name: "nope".into(),
                    arguments: json!({}),
                },
            }],
        }]);
        let reg = ToolRegistry::with_builtin_tools();
        let err = run_agent_loop(
            &client,
            "m",
            vec![ChatMessage::user("hi")],
            &reg,
            8,
        )
        .await
        .unwrap_err();
        assert!(matches!(err, AgentError::UnknownTool(_)));
    }

    /// Ensures `ReqwestOllamaClient` is constructible for integration (real Ollama optional).
    #[test]
    fn reqwest_client_default() {
        let _ = ReqwestOllamaClient::default();
    }
}
