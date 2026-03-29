//! Internal chat and tool types used by the app agent loop.

use serde::{Deserialize, Serialize};
use serde_json::Value;

/// One chat message in the app's canonical chat+tools model.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct ChatMessage {
    pub role: String,
    #[serde(default)]
    pub content: String,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub tool_calls: Option<Vec<ToolCall>>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub tool_name: Option<String>,
}

impl ChatMessage {
    pub fn system(content: impl Into<String>) -> Self {
        Self {
            role: "system".into(),
            content: content.into(),
            tool_calls: None,
            tool_name: None,
        }
    }

    pub fn user(content: impl Into<String>) -> Self {
        Self {
            role: "user".into(),
            content: content.into(),
            tool_calls: None,
            tool_name: None,
        }
    }

    pub fn assistant(content: impl Into<String>, tool_calls: Option<Vec<ToolCall>>) -> Self {
        Self {
            role: "assistant".into(),
            content: content.into(),
            tool_calls,
            tool_name: None,
        }
    }

    pub fn tool(tool_name: impl Into<String>, content: impl Into<String>) -> Self {
        Self {
            role: "tool".into(),
            content: content.into(),
            tool_calls: None,
            tool_name: Some(tool_name.into()),
        }
    }
}

/// Tool call entry from the assistant message.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct ToolCall {
    pub function: ToolCallFunction,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct ToolCallFunction {
    pub name: String,
    #[serde(deserialize_with = "deserialize_json_or_string")]
    pub arguments: Value,
}

fn deserialize_json_or_string<'de, D>(deserializer: D) -> Result<Value, D::Error>
where
    D: serde::Deserializer<'de>,
{
    let v = Value::deserialize(deserializer)?;
    match v {
        Value::String(s) => Ok(serde_json::from_str(&s).unwrap_or(Value::String(s))),
        other => Ok(other),
    }
}

/// Tool definition in the app's canonical tool schema.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct ToolDefinition {
    #[serde(rename = "type")]
    pub typ: String,
    pub function: ToolFunctionDef,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct ToolFunctionDef {
    pub name: String,
    pub description: String,
    pub parameters: Value,
}

/// Structured page mutation proposed by the model; **not** applied until the user confirms in the UI.
/// Serialized as the tool result string for `propose_page_*` tools and returned on [`AgentChatResult::pending_proposal`].
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PageProposal {
    /// `"create"`, `"save"`, or `"delete"`.
    pub op: String,
    /// Target page id (required for save/delete).
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub page_id: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub title: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub parent_id: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub body: Option<String>,
}

/// Returns true for tools that record a proposal only (host stops the agent loop until the user acts in the UI).
pub fn is_proposal_tool_name(name: &str) -> bool {
    matches!(
        name,
        "propose_page_create" | "propose_page_save" | "propose_page_delete"
    )
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AgentChatResult {
    pub messages: Vec<ChatMessage>,
    pub assistant_reply: String,
    pub steps_used: u32,
    /// Human-readable lines for debugging tool usage (also logged with `log` in the agent loop).
    #[serde(default, skip_serializing_if = "Vec::is_empty")]
    pub debug_trace: Vec<String>,
    /// Set when the model used a `propose_page_*` tool: mutations run only after UI confirmation.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub pending_proposal: Option<PageProposal>,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn deserializes_tool_calls_with_object_arguments() {
        let json = r#"{
            "role": "assistant",
            "content": "",
            "tool_calls": [
                {
                    "function": {
                        "name": "echo",
                        "arguments": { "message": "hi" }
                    }
                }
            ]
        }"#;
        let m: ChatMessage = serde_json::from_str(json).unwrap();
        assert_eq!(m.role, "assistant");
        let calls = m.tool_calls.unwrap();
        assert_eq!(calls[0].function.name, "echo");
        assert_eq!(calls[0].function.arguments["message"], "hi");
    }

    #[test]
    fn deserializes_tool_calls_with_string_arguments() {
        let json = r#"{
            "role": "assistant",
            "content": "",
            "tool_calls": [
                {
                    "function": {
                        "name": "echo",
                        "arguments": "{\"message\":\"x\"}"
                    }
                }
            ]
        }"#;
        let m: ChatMessage = serde_json::from_str(json).unwrap();
        assert_eq!(m.tool_calls.unwrap()[0].function.arguments["message"], "x");
    }

    #[test]
    fn serializes_tool_message_with_tool_name() {
        let m = ChatMessage::tool("echo", "echoed");
        let v = serde_json::to_value(&m).unwrap();
        assert_eq!(v["role"], "tool");
        assert_eq!(v["tool_name"], "echo");
        assert_eq!(v["content"], "echoed");
    }
}
