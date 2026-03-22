mod client;
mod error;
pub mod registry;
mod runner;
pub mod types;

pub use client::{chat_simple_user_message, ReqwestOllamaClient};
pub use registry::ToolRegistry;
pub use runner::run_agent_loop;
pub use types::{ChatMessage, OllamaAgentResult};
