//! Built-in tool handlers registered for the agent loop.

use std::collections::HashMap;
use std::sync::Arc;

use async_trait::async_trait;
use serde_json::{json, Value};

use crate::agent::types::ToolDefinition;

#[async_trait]
pub trait ToolHandler: Send + Sync {
    fn definition(&self) -> ToolDefinition;
    async fn invoke(&self, arguments: &Value) -> Result<String, String>;
}

/// Maps tool names to handlers. Only registered tools can execute.
pub struct ToolRegistry {
    handlers: HashMap<String, Arc<dyn ToolHandler>>,
}

impl ToolRegistry {
    pub fn new() -> Self {
        Self {
            handlers: HashMap::new(),
        }
    }

    pub fn with_builtin_tools() -> Self {
        let mut r = Self::new();
        r.register(Arc::new(EchoTool));
        r
    }

    pub fn register(&mut self, handler: Arc<dyn ToolHandler>) {
        let name = handler.definition().function.name.clone();
        self.handlers.insert(name, handler);
    }

    pub fn definitions(&self) -> Vec<ToolDefinition> {
        let mut v: Vec<ToolDefinition> = self
            .handlers
            .values()
            .map(|h| h.definition())
            .collect();
        v.sort_by(|a, b| a.function.name.cmp(&b.function.name));
        v
    }

    pub async fn invoke(&self, name: &str, arguments: &Value) -> Result<String, String> {
        let h = self
            .handlers
            .get(name)
            .ok_or_else(|| format!("unknown tool: {name}"))?;
        h.invoke(arguments).await
    }

    pub fn has_tool(&self, name: &str) -> bool {
        self.handlers.contains_key(name)
    }
}

impl Default for ToolRegistry {
    fn default() -> Self {
        Self::with_builtin_tools()
    }
}

/// Returns the `message` string argument as plain text (for testing and demos).
struct EchoTool;

#[async_trait]
impl ToolHandler for EchoTool {
    fn definition(&self) -> ToolDefinition {
        ToolDefinition {
            typ: "function".into(),
            function: crate::agent::types::ToolFunctionDef {
                name: "echo".into(),
                description: "Echo back a short text message. Use for testing tool execution."
                    .into(),
                parameters: json!({
                    "type": "object",
                    "properties": {
                        "message": {
                            "type": "string",
                            "description": "Text to echo."
                        }
                    },
                    "required": ["message"]
                }),
            },
        }
    }

    async fn invoke(&self, arguments: &Value) -> Result<String, String> {
        let msg = arguments
            .get("message")
            .and_then(|v| v.as_str())
            .unwrap_or("");
        Ok(msg.to_string())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn echo_invokes() {
        let r = ToolRegistry::with_builtin_tools();
        let out = r
            .invoke("echo", &json!({ "message": "hello" }))
            .await
            .unwrap();
        assert_eq!(out, "hello");
    }

    #[test]
    fn definitions_include_echo() {
        let r = ToolRegistry::with_builtin_tools();
        let defs = r.definitions();
        assert!(defs.iter().any(|d| d.function.name == "echo"));
    }
}
