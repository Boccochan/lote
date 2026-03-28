pub mod client;
mod error;
pub mod ollama;
pub mod registry;
mod runner;
pub mod types;

pub use registry::ToolRegistry;
pub use runner::run_agent_loop;
pub use types::{AgentChatResult, ChatMessage};
