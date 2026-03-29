//! Agent loop: call provider, run tool handlers, repeat until text reply or max steps.

use crate::agent::client::{AssistantTurn, ChatCompletionClient};
use crate::agent::error::AgentError;
use crate::agent::registry::ToolRegistry;
use crate::agent::types::{
    is_proposal_tool_name, AgentChatResult, ChatMessage, PageProposal, ToolCall, ToolCallFunction,
};
use serde_json::Value;

/// When the model prints tool JSON in a markdown fence instead of using native `tool_calls`, parse and run it if the name is registered.
fn coerce_tool_calls_from_markdown(
    content: &str,
    registry: &ToolRegistry,
) -> Option<Vec<ToolCall>> {
    let json_body = extract_first_json_fence(content)?;
    let v: Value = serde_json::from_str(json_body).ok()?;
    let name = v.get("name").and_then(|x| x.as_str())?;
    if !registry.has_tool(name) {
        return None;
    }
    let arguments = v
        .get("parameters")
        .or_else(|| v.get("arguments"))
        .cloned()
        .unwrap_or_else(|| serde_json::json!({}));
    Some(vec![ToolCall {
        function: ToolCallFunction {
            name: name.to_string(),
            arguments,
        },
    }])
}

fn extract_first_json_fence(content: &str) -> Option<&str> {
    for marker in ["```json", "```"] {
        let start = match content.find(marker) {
            Some(s) => s,
            None => continue,
        };
        let after = &content[start + marker.len()..];
        let after = after.trim_start();
        if let Some(end) = after.find("```") {
            return Some(after[..end].trim());
        }
    }
    None
}

fn ellipsize_chars(s: &str, max_chars: usize) -> String {
    let mut it = s.chars();
    let head: String = it.by_ref().take(max_chars).collect();
    if it.next().is_none() {
        head
    } else {
        head + "…"
    }
}

fn push_trace(trace: &mut Vec<String>, line: String) {
    log::info!("[agent] {}", line);
    trace.push(line);
}

pub async fn run_agent_loop(
    client: &dyn ChatCompletionClient,
    model: &str,
    mut messages: Vec<ChatMessage>,
    registry: &ToolRegistry,
    max_steps: u32,
) -> Result<AgentChatResult, AgentError> {
    let tools = registry.definitions();
    let mut steps_used: u32 = 0;
    let mut debug_trace: Vec<String> = Vec::new();

    push_trace(
        &mut debug_trace,
        format!(
            "registered_tools={}",
            tools
                .iter()
                .map(|t| t.function.name.as_str())
                .collect::<Vec<_>>()
                .join(",")
        ),
    );

    loop {
        if steps_used >= max_steps {
            return Err(AgentError::MaxSteps { limit: max_steps });
        }
        steps_used += 1;

        push_trace(
            &mut debug_trace,
            format!(
                "step {steps_used}/{max_steps}: calling provider (tools_in_request={})",
                !tools.is_empty()
            ),
        );

        let turn = client
            .complete(model, &messages, &tools)
            .await
            .map_err(AgentError::Provider)?;

        let AssistantTurn {
            content,
            mut tool_calls,
        } = turn;

        let mut coerced_from_markdown = false;
        if tool_calls.is_empty() {
            if let Some(coerced) = coerce_tool_calls_from_markdown(&content, registry) {
                tool_calls = coerced;
                coerced_from_markdown = true;
                push_trace(
                    &mut debug_trace,
                    "coerced tool call(s) from markdown ``` fence (model did not emit tool_calls)"
                        .to_string(),
                );
            }
        }

        if tool_calls.is_empty() {
            push_trace(
                &mut debug_trace,
                format!(
                    "assistant_reply (no tools): {}",
                    ellipsize_chars(content.trim(), 500)
                ),
            );
            messages.push(ChatMessage::assistant(content.clone(), None));
            return Ok(AgentChatResult {
                messages,
                assistant_reply: content,
                steps_used,
                debug_trace,
                pending_proposal: None,
            });
        }

        push_trace(
            &mut debug_trace,
            format!(
                "assistant proposed {} tool call(s); content preview: {}",
                tool_calls.len(),
                ellipsize_chars(content.trim(), 200)
            ),
        );

        let assistant_content = if coerced_from_markdown {
            String::new()
        } else {
            content.clone()
        };

        messages.push(ChatMessage::assistant(
            assistant_content.clone(),
            Some(tool_calls.clone()),
        ));

        let mut pending_proposal: Option<PageProposal> = None;

        for tc in tool_calls {
            let name = tc.function.name.as_str();
            let args_raw = serde_json::to_string(&tc.function.arguments)
                .unwrap_or_else(|_| "<invalid json>".into());
            push_trace(
                &mut debug_trace,
                format!(
                    "tool_call: {} args={}",
                    name,
                    ellipsize_chars(&args_raw, 600)
                ),
            );
            if !registry.has_tool(name) {
                return Err(AgentError::UnknownTool(name.to_string()));
            }
            let result = registry
                .invoke(name, &tc.function.arguments)
                .await
                .map_err(AgentError::Provider)?;
            push_trace(
                &mut debug_trace,
                format!(
                    "tool_result: {} chars={} preview={}",
                    name,
                    result.len(),
                    ellipsize_chars(result.trim(), 400)
                ),
            );
            if is_proposal_tool_name(name) {
                let proposal: PageProposal = serde_json::from_str(&result).map_err(|e| {
                    AgentError::Provider(format!("proposal tool returned invalid JSON: {e}"))
                })?;
                pending_proposal = Some(proposal);
            }
            messages.push(ChatMessage::tool(name, result));
        }

        if let Some(proposal) = pending_proposal {
            push_trace(
                &mut debug_trace,
                "proposal tool used: stopping agent loop until user confirms in UI".into(),
            );
            return Ok(AgentChatResult {
                messages,
                assistant_reply: assistant_content,
                steps_used,
                debug_trace,
                pending_proposal: Some(proposal),
            });
        }
    }
}

#[cfg(test)]
mod tests {
    use async_trait::async_trait;
    use serde_json::json;

    use super::*;
    use crate::agent::client::ChatCompletionClient;
    use crate::agent::ollama::ReqwestOllamaClient;
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
    impl ChatCompletionClient for ScriptedClient {
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
        let reg = ToolRegistry::with_echo_only();
        let out = run_agent_loop(&client, "m", vec![ChatMessage::user("hi")], &reg, 8)
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
        let reg = ToolRegistry::with_echo_only();
        let err = run_agent_loop(&client, "m", vec![ChatMessage::user("hi")], &reg, 1)
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
        let reg = ToolRegistry::with_echo_only();
        let err = run_agent_loop(&client, "m", vec![ChatMessage::user("hi")], &reg, 8)
            .await
            .unwrap_err();
        assert!(matches!(err, AgentError::UnknownTool(_)));
    }

    #[test]
    fn coerces_markdown_json_fence_to_registered_tool() {
        let registry = ToolRegistry::with_echo_only();
        let content = r#"```json
{"name":"echo","parameters":{"message":"hi"}}
```"#;
        let tc = coerce_tool_calls_from_markdown(content, &registry).expect("coerce");
        assert_eq!(tc.len(), 1);
        assert_eq!(tc[0].function.name, "echo");
    }

    #[tokio::test]
    async fn loop_coerces_markdown_when_tool_calls_empty() {
        let client = ScriptedClient::new(vec![
            AssistantTurn {
                content: r#"```json
{"name":"echo","parameters":{"message":"ping"}}
```"#
                    .into(),
                tool_calls: vec![],
            },
            AssistantTurn {
                content: "done".into(),
                tool_calls: vec![],
            },
        ]);
        let reg = ToolRegistry::with_echo_only();
        let out = run_agent_loop(&client, "m", vec![ChatMessage::user("hi")], &reg, 8)
            .await
            .unwrap();

        assert_eq!(out.assistant_reply, "done");
        assert!(out.messages.iter().any(|m| m.role == "tool"));
    }

    /// Ensures `ReqwestOllamaClient` is constructible for integration (real Ollama optional).
    #[test]
    fn reqwest_client_default() {
        let _ = ReqwestOllamaClient::default();
    }

    #[tokio::test]
    async fn loop_stops_after_propose_tool_without_second_model_turn() {
        let client = ScriptedClient::new(vec![AssistantTurn {
            content: "I will delete that page.".into(),
            tool_calls: vec![ToolCall {
                function: ToolCallFunction {
                    name: "propose_page_delete".into(),
                    arguments: json!({ "page_id": "pid-1", "title": "Note A" }),
                },
            }],
        }]);
        let reg = ToolRegistry::with_propose_delete_only();
        let out = run_agent_loop(
            &client,
            "m",
            vec![ChatMessage::user("delete my page")],
            &reg,
            8,
        )
        .await
        .unwrap();

        assert_eq!(out.steps_used, 1);
        let prop = out.pending_proposal.expect("pending proposal");
        assert_eq!(prop.op, "delete");
        assert_eq!(prop.page_id.as_deref(), Some("pid-1"));
        assert_eq!(out.assistant_reply, "I will delete that page.");
        assert_eq!(out.messages.last().unwrap().role, "tool");
    }
}
