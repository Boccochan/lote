//! Built-in tool handlers registered for the agent loop.

use std::collections::HashMap;
use std::sync::Arc;

use async_trait::async_trait;
use serde_json::{json, Value};
use tauri::AppHandle;

use crate::agent::types::ToolDefinition;
use crate::commands::pages::search_pages;

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

    /// All built-in tools, including page search (requires app data paths).
    pub fn with_builtin_tools(app: AppHandle) -> Self {
        let mut r = Self::new();
        r.register(Arc::new(EchoTool));
        r.register(Arc::new(SearchPagesTool(app)));
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

#[cfg(test)]
impl ToolRegistry {
    /// Echo only (unit tests that do not have a Tauri [`AppHandle`]).
    pub(crate) fn with_echo_only() -> Self {
        let mut r = Self::new();
        r.register(Arc::new(EchoTool));
        r
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

/// Search local markdown pages (same behavior as the `pages_search` command).
struct SearchPagesTool(AppHandle);

#[async_trait]
impl ToolHandler for SearchPagesTool {
    fn definition(&self) -> ToolDefinition {
        ToolDefinition {
            typ: "function".into(),
            function: crate::agent::types::ToolFunctionDef {
                name: "search_pages".into(),
                description: "Search the user's LOCAL markdown pages only (no web search in this app). Use for any request to find, search, or look up text in the user's notes. Whitespace separates terms; every term must appear in the title or body (case-insensitive). Returns a JSON array of hits: { entity: { kind, id }, title, snippet? }. Do not use any other tool name for search."
                    .into(),
                parameters: json!({
                    "type": "object",
                    "properties": {
                        "query": {
                            "type": "string",
                            "description": "Search terms (space-separated, AND semantics)."
                        },
                        "limit": {
                            "type": "integer",
                            "description": "Maximum number of results (default 15, max 50)."
                        }
                    },
                    "required": ["query"]
                }),
            },
        }
    }

    async fn invoke(&self, arguments: &Value) -> Result<String, String> {
        let query = arguments
            .get("query")
            .and_then(|v| v.as_str())
            .ok_or_else(|| "missing query".to_string())?;
        let limit = arguments
            .get("limit")
            .and_then(|v| v.as_u64())
            .unwrap_or(15)
            .min(50)
            .max(1) as usize;
        let hits = search_pages(&self.0, query, limit)?;
        serde_json::to_string(&hits).map_err(|e| e.to_string())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn echo_invokes() {
        let r = ToolRegistry::with_echo_only();
        let out = r
            .invoke("echo", &json!({ "message": "hello" }))
            .await
            .unwrap();
        assert_eq!(out, "hello");
    }

    #[test]
    fn definitions_include_echo() {
        let r = ToolRegistry::with_echo_only();
        let defs = r.definitions();
        assert!(defs.iter().any(|d| d.function.name == "echo"));
    }
}
