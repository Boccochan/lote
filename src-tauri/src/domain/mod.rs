//! Domain types shared by commands, future indexing, and agent tools.
//! Page-specific storage stays in `commands::pages`; identity and search results are kind-agnostic.

pub mod entity;
pub mod search;

pub use entity::{EntityKind, EntityRef};

/// Alias so callers can `use crate::domain::SearchHit` without reaching into `search`.
pub type SearchHit = search::SearchHit;

#[cfg(test)]
mod tests {
    use super::entity::{EntityKind, EntityRef};
    use super::search::SearchHit;

    #[test]
    fn entity_ref_page_constructor_matches_kind() {
        let r = EntityRef::page("abc");
        assert_eq!(r.kind.as_str(), EntityKind::PAGE);
        assert_eq!(r.id, "abc");
    }

    #[test]
    fn search_hit_serializes_entity_ref() {
        let hit = SearchHit {
            entity: EntityRef::page("x"),
            title: "t".into(),
            snippet: Some("s".into()),
        };
        let v = serde_json::to_value(&hit).expect("json");
        assert_eq!(v["entity"]["kind"], "page");
        assert_eq!(v["entity"]["id"], "x");
    }
}
