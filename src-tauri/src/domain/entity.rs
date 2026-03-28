//! Cross-cutting identity for user-owned content. New kinds (e.g. todos) extend the
//! vocabulary without replacing page storage; search and navigation should key on [`EntityRef`].

use serde::{Deserialize, Serialize};

/// Stable string label for a class of content in the app (`page`, future `todo_list`, …).
/// Stored as a plain string so new kinds can appear without a Rust enum change for every feature.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, Hash)]
#[serde(transparent)]
pub struct EntityKind(pub String);

impl EntityKind {
    pub const PAGE: &'static str = "page";

    pub fn page() -> Self {
        Self(Self::PAGE.to_string())
    }

    #[allow(dead_code)] // Used from tests and when matching kinds in future modules.
    pub fn as_str(&self) -> &str {
        self.0.as_str()
    }
}

impl Default for EntityKind {
    fn default() -> Self {
        Self::page()
    }
}

impl From<&str> for EntityKind {
    fn from(s: &str) -> Self {
        Self(s.to_string())
    }
}

/// Universal pointer for open-in-app, search results, and agent tools across entity kinds.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, Hash)]
pub struct EntityRef {
    pub kind: EntityKind,
    pub id: String,
}

impl EntityRef {
    pub fn page(id: impl Into<String>) -> Self {
        Self {
            kind: EntityKind::page(),
            id: id.into(),
        }
    }
}
