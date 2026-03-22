use std::fmt;

#[derive(Debug)]
pub enum AgentError {
    Ollama(String),
    UnknownTool(String),
    MaxSteps { limit: u32 },
}

impl fmt::Display for AgentError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            AgentError::Ollama(s) => write!(f, "{s}"),
            AgentError::UnknownTool(name) => write!(f, "unknown tool: {name}"),
            AgentError::MaxSteps { limit } => {
                write!(f, "agent stopped after {limit} model steps (max steps reached)")
            }
        }
    }
}

impl std::error::Error for AgentError {}
