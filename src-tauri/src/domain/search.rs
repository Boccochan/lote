//! Shared result shape for search across all [`crate::domain::entity::EntityKind`] values.
//! Indexing and extractors live in adapters; this type is the stable contract for UI and tools.

use serde::{Deserialize, Serialize};

use super::entity::EntityRef;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SearchHit {
    pub entity: EntityRef,
    pub title: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub snippet: Option<String>,
}
