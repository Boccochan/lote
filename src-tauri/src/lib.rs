mod agent;
mod commands;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .setup(|app| {
            if cfg!(debug_assertions) {
                app.handle().plugin(
                    tauri_plugin_log::Builder::default()
                        .level(log::LevelFilter::Info)
                        .build(),
                )?;
            }
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::pages::pages_list,
            commands::pages::pages_get,
            commands::pages::pages_create,
            commands::pages::pages_save,
            commands::pages::pages_delete,
            commands::ollama::ollama_chat,
            commands::ollama_agent::ollama_agent_chat,
            commands::mcp::mcp_list_tools,
            commands::mcp::mcp_call_tool,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
