use serde::{Deserialize, Serialize};
use serde_json::Value;

/// JSON-RPC 2.0 request for MCP-over-HTTP style endpoints (POST body).
#[derive(Serialize)]
struct JsonRpcRequest {
    jsonrpc: String,
    id: u64,
    method: String,
    params: Value,
}

#[derive(Deserialize)]
struct JsonRpcResponse {
    #[serde(default)]
    result: Option<Value>,
    #[serde(default)]
    error: Option<JsonRpcError>,
}

#[derive(Deserialize)]
struct JsonRpcError {
    message: String,
}

/// List tools from a remote MCP-compatible HTTP endpoint (JSON-RPC POST).
#[tauri::command]
pub async fn mcp_list_tools(endpoint: String) -> Result<Value, String> {
    let body = JsonRpcRequest {
        jsonrpc: "2.0".into(),
        id: 1,
        method: "tools/list".into(),
        params: serde_json::json!({}),
    };
    rpc_post(&endpoint, body).await
}

/// Call a tool by name with JSON arguments.
#[tauri::command]
pub async fn mcp_call_tool(
    endpoint: String,
    name: String,
    arguments: Value,
) -> Result<Value, String> {
    let body = JsonRpcRequest {
        jsonrpc: "2.0".into(),
        id: 2,
        method: "tools/call".into(),
        params: serde_json::json!({
            "name": name,
            "arguments": arguments,
        }),
    };
    rpc_post(&endpoint, body).await
}

async fn rpc_post(endpoint: &str, body: JsonRpcRequest) -> Result<Value, String> {
    let client = reqwest::Client::new();
    let res = client
        .post(endpoint)
        .json(&body)
        .header("Content-Type", "application/json")
        .send()
        .await
        .map_err(|e| format!("mcp request: {e}"))?;
    let status = res.status();
    let txt = res.text().await.map_err(|e| format!("mcp body: {e}"))?;
    if !status.is_success() {
        return Err(format!("mcp HTTP {status}: {txt}"));
    }
    let parsed: JsonRpcResponse =
        serde_json::from_str(&txt).map_err(|e| format!("mcp parse ({txt}): {e}"))?;
    if let Some(err) = parsed.error {
        return Err(err.message);
    }
    parsed.result.ok_or_else(|| "empty MCP result".into())
}
