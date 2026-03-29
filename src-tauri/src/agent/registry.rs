//! Built-in tool handlers registered for the agent loop.

use std::collections::HashMap;
use std::sync::Arc;

use async_trait::async_trait;
use serde_json::{json, Value};
use tauri::AppHandle;

use crate::agent::types::{PageProposal, ToolDefinition};
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
        r.register(Arc::new(ProposePageCreateTool));
        r.register(Arc::new(ProposePageSaveTool));
        r.register(Arc::new(ProposePageDeleteTool));
        r
    }

    pub fn register(&mut self, handler: Arc<dyn ToolHandler>) {
        let name = handler.definition().function.name.clone();
        self.handlers.insert(name, handler);
    }

    pub fn definitions(&self) -> Vec<ToolDefinition> {
        let mut v: Vec<ToolDefinition> = self.handlers.values().map(|h| h.definition()).collect();
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

    /// Proposal delete tool only (agent loop short-circuit tests).
    pub(crate) fn with_propose_delete_only() -> Self {
        let mut r = Self::new();
        r.register(Arc::new(ProposePageDeleteTool));
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

/// Records a create-page proposal as JSON; does **not** call `pages_create` (user confirms in the UI).
struct ProposePageCreateTool;

#[async_trait]
impl ToolHandler for ProposePageCreateTool {
    fn definition(&self) -> ToolDefinition {
        ToolDefinition {
            typ: "function".into(),
            function: crate::agent::types::ToolFunctionDef {
                name: "propose_page_create".into(),
                description: "Propose creating a new markdown page. Does not create anything until the user confirms in the app."
                    .into(),
                parameters: json!({
                    "type": "object",
                    "properties": {
                        "title": { "type": "string", "description": "Title for the new page." },
                        "parent_id": { "type": "string", "description": "Optional parent page id; omit or empty for a root-level page." }
                    },
                    "required": ["title"]
                }),
            },
        }
    }

    async fn invoke(&self, arguments: &Value) -> Result<String, String> {
        let title = arguments
            .get("title")
            .and_then(|v| v.as_str())
            .ok_or_else(|| "missing title".to_string())?
            .to_string();
        let parent_id = arguments
            .get("parent_id")
            .and_then(|v| v.as_str())
            .filter(|s| !s.is_empty())
            .map(|s| s.to_string());
        let proposal = PageProposal {
            op: "create".into(),
            page_id: None,
            title: Some(title),
            parent_id,
            body: None,
        };
        serde_json::to_string(&proposal).map_err(|e| e.to_string())
    }
}

/// Records an update proposal; does **not** call `pages_save` until the user confirms.
struct ProposePageSaveTool;

#[async_trait]
impl ToolHandler for ProposePageSaveTool {
    fn definition(&self) -> ToolDefinition {
        ToolDefinition {
            typ: "function".into(),
            function: crate::agent::types::ToolFunctionDef {
                name: "propose_page_save".into(),
                description: "Propose saving (replacing) an existing page's title, parent, and body. Does not write until the user confirms."
                    .into(),
                parameters: json!({
                    "type": "object",
                    "properties": {
                        "page_id": { "type": "string", "description": "Id of the page to update." },
                        "title": { "type": "string", "description": "New title." },
                        "parent_id": { "type": "string", "description": "Parent page id, or empty/null for root." },
                        "body": { "type": "string", "description": "New markdown body text." }
                    },
                    "required": ["page_id", "title", "body"]
                }),
            },
        }
    }

    async fn invoke(&self, arguments: &Value) -> Result<String, String> {
        let page_id = arguments
            .get("page_id")
            .and_then(|v| v.as_str())
            .ok_or_else(|| "missing page_id".to_string())?
            .to_string();
        let title = arguments
            .get("title")
            .and_then(|v| v.as_str())
            .ok_or_else(|| "missing title".to_string())?
            .to_string();
        let body = arguments
            .get("body")
            .and_then(|v| v.as_str())
            .ok_or_else(|| "missing body".to_string())?
            .to_string();
        let parent_id = arguments
            .get("parent_id")
            .and_then(|v| if v.is_null() { None } else { v.as_str() })
            .filter(|s| !s.is_empty())
            .map(|s| s.to_string());
        let proposal = PageProposal {
            op: "save".into(),
            page_id: Some(page_id),
            title: Some(title),
            parent_id,
            body: Some(body),
        };
        serde_json::to_string(&proposal).map_err(|e| e.to_string())
    }
}

/// Records a delete proposal; does **not** call `pages_delete` until the user confirms.
struct ProposePageDeleteTool;

#[async_trait]
impl ToolHandler for ProposePageDeleteTool {
    fn definition(&self) -> ToolDefinition {
        ToolDefinition {
            typ: "function".into(),
            function: crate::agent::types::ToolFunctionDef {
                name: "propose_page_delete".into(),
                description: "Propose deleting a page by id. Does not delete until the user confirms in the app."
                    .into(),
                parameters: json!({
                    "type": "object",
                    "properties": {
                        "page_id": { "type": "string", "description": "Id of the page to delete." },
                        "title": { "type": "string", "description": "Optional title for display in the confirmation UI." }
                    },
                    "required": ["page_id"]
                }),
            },
        }
    }

    async fn invoke(&self, arguments: &Value) -> Result<String, String> {
        let page_id = arguments
            .get("page_id")
            .and_then(|v| v.as_str())
            .ok_or_else(|| "missing page_id".to_string())?
            .to_string();
        let title = arguments
            .get("title")
            .and_then(|v| v.as_str())
            .map(|s| s.to_string());
        let proposal = PageProposal {
            op: "delete".into(),
            page_id: Some(page_id),
            title,
            parent_id: None,
            body: None,
        };
        serde_json::to_string(&proposal).map_err(|e| e.to_string())
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

    #[tokio::test]
    async fn propose_page_delete_returns_json_proposal() {
        let r = ToolRegistry::with_propose_delete_only();
        let out = r
            .invoke(
                "propose_page_delete",
                &json!({ "page_id": "abc", "title": "Hi" }),
            )
            .await
            .unwrap();
        let p: PageProposal = serde_json::from_str(&out).unwrap();
        assert_eq!(p.op, "delete");
        assert_eq!(p.page_id.as_deref(), Some("abc"));
        assert_eq!(p.title.as_deref(), Some("Hi"));
    }
}
