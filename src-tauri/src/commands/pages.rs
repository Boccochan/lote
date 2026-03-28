use serde::{Deserialize, Serialize};
use std::fs;
use std::path::{Path, PathBuf};
use tauri::AppHandle;
use tauri::Manager;
use uuid::Uuid;

use crate::domain::{EntityKind, EntityRef, SearchHit};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PageMeta {
    /// Always [`EntityKind::PAGE`] for markdown pages; other entity kinds use their own commands.
    #[serde(default)]
    pub kind: EntityKind,
    pub id: String,
    pub title: String,
    pub parent_id: Option<String>,
    pub updated_at: String,
}

impl PageMeta {
    /// Stable pointer for navigation, search hits, and agent tools (not only pages).
    #[allow(dead_code)] // Used from `#[cfg(test)]`; callers may use `EntityRef::page(id)` directly.
    pub fn entity_ref(&self) -> EntityRef {
        EntityRef {
            kind: self.kind.clone(),
            id: self.id.clone(),
        }
    }
}

#[derive(Debug, Serialize)]
pub struct PageDetail {
    pub meta: PageMeta,
    pub body: String,
}

#[derive(Debug, Deserialize, Serialize)]
struct Frontmatter {
    id: String,
    title: String,
    #[serde(default)]
    parent_id: Option<String>,
    updated_at: String,
}

fn pages_dir(app: &AppHandle) -> Result<PathBuf, String> {
    let mut dir = app
        .path()
        .app_data_dir()
        .map_err(|e| format!("app_data_dir: {e}"))?;
    dir.push("lote");
    dir.push("pages");
    Ok(dir)
}

fn ensure_pages_dir(app: &AppHandle) -> Result<PathBuf, String> {
    let dir = pages_dir(app)?;
    fs::create_dir_all(&dir).map_err(|e| format!("create pages dir: {e}"))?;
    Ok(dir)
}

fn page_path(dir: &Path, id: &str) -> PathBuf {
    let mut p = dir.to_path_buf();
    p.push(format!("{id}.md"));
    p
}

fn parse_markdown_file(path: &Path) -> Result<(Frontmatter, String), String> {
    let raw = fs::read_to_string(path).map_err(|e| format!("read {path:?}: {e}"))?;
    parse_markdown_str(&raw)
}

fn parse_markdown_str(raw: &str) -> Result<(Frontmatter, String), String> {
    let s = raw.trim_start();
    if !s.starts_with("---") {
        return Err("missing frontmatter".into());
    }
    let after_open = &s[3..];
    let close = after_open
        .find("\n---")
        .ok_or_else(|| "missing closing frontmatter".to_string())?;
    let yaml_str = after_open[..close].trim();
    let mut rest = &after_open[close + 1..];
    rest = rest.strip_prefix("---").unwrap_or(rest);
    let body = rest.trim_start().to_string();
    let fm: Frontmatter = serde_yaml::from_str(yaml_str).map_err(|e| format!("yaml: {e}"))?;
    Ok((fm, body))
}

fn write_page_file(path: &Path, fm: &Frontmatter, body: &str) -> Result<(), String> {
    let yaml = serde_yaml::to_string(fm).map_err(|e| format!("serialize yaml: {e}"))?;
    let yaml = yaml.trim_end();
    let content = format!("---\n{yaml}\n---\n{body}");
    fs::write(path, content).map_err(|e| format!("write {path:?}: {e}"))
}

fn parse_search_terms(query: &str) -> Vec<String> {
    query
        .split_whitespace()
        .map(|s| s.to_lowercase())
        .filter(|s| !s.is_empty())
        .collect()
}

fn text_matches_all_terms(haystack_lower: &str, terms: &[String]) -> bool {
    terms.iter().all(|t| haystack_lower.contains(t.as_str()))
}

fn truncate_snippet(s: &str, max_chars: usize) -> String {
    let count = s.chars().count();
    if count <= max_chars {
        return s.to_string();
    }
    s.chars().take(max_chars).collect::<String>() + "…"
}

/// Build a short preview; prefers a body line that contains every term (case-insensitive).
fn build_snippet(title: &str, body: &str, terms: &[String]) -> Option<String> {
    const MAX: usize = 220;
    for line in body.lines() {
        let ll = line.to_lowercase();
        if text_matches_all_terms(&ll, terms) {
            return Some(truncate_snippet(line, MAX));
        }
    }
    if !body.is_empty() {
        return Some(truncate_snippet(body, MAX));
    }
    if !title.is_empty() {
        return Some(truncate_snippet(title, MAX));
    }
    None
}

/// Full-text scan of markdown pages. Whitespace-separated terms; **all** must appear in title or body (case-insensitive).
pub fn search_pages(app: &AppHandle, query: &str, limit: usize) -> Result<Vec<SearchHit>, String> {
    let terms = parse_search_terms(query);
    if terms.is_empty() || limit == 0 {
        return Ok(vec![]);
    }
    let dir = ensure_pages_dir(app)?;
    let mut hits = Vec::new();
    let rd = fs::read_dir(&dir).map_err(|e| format!("read_dir: {e}"))?;
    for ent in rd.flatten() {
        let path = ent.path();
        if path.extension().and_then(|s| s.to_str()) != Some("md") {
            continue;
        }
        let Ok((fm, body)) = parse_markdown_file(&path) else {
            continue;
        };
        let combined = format!("{}\n{}", fm.title.to_lowercase(), body.to_lowercase());
        if !text_matches_all_terms(&combined, &terms) {
            continue;
        }
        hits.push(SearchHit {
            entity: EntityRef::page(fm.id.clone()),
            title: fm.title.clone(),
            snippet: build_snippet(&fm.title, &body, &terms),
        });
    }
    hits.sort_by(|a, b| a.title.cmp(&b.title));
    hits.truncate(limit);
    Ok(hits)
}

#[tauri::command]
pub async fn pages_search(
    app: AppHandle,
    query: String,
    limit: Option<u32>,
) -> Result<Vec<SearchHit>, String> {
    let lim = limit.unwrap_or(20).min(100) as usize;
    search_pages(&app, &query, lim)
}

#[tauri::command]
pub async fn pages_list(app: AppHandle) -> Result<Vec<PageMeta>, String> {
    let dir = ensure_pages_dir(&app)?;
    let mut out = Vec::new();
    let rd = fs::read_dir(&dir).map_err(|e| format!("read_dir: {e}"))?;
    for ent in rd.flatten() {
        let path = ent.path();
        if path.extension().and_then(|s| s.to_str()) != Some("md") {
            continue;
        }
        if let Ok((fm, _)) = parse_markdown_file(&path) {
            out.push(PageMeta {
                kind: EntityKind::page(),
                id: fm.id,
                title: fm.title,
                parent_id: fm.parent_id,
                updated_at: fm.updated_at,
            });
        }
    }
    out.sort_by(|a, b| a.title.cmp(&b.title));
    Ok(out)
}

#[tauri::command]
pub async fn pages_get(app: AppHandle, id: String) -> Result<PageDetail, String> {
    let dir = ensure_pages_dir(&app)?;
    let path = page_path(&dir, &id);
    let (fm, body) = parse_markdown_file(&path)?;
    Ok(PageDetail {
        meta: PageMeta {
            kind: EntityKind::page(),
            id: fm.id,
            title: fm.title,
            parent_id: fm.parent_id,
            updated_at: fm.updated_at,
        },
        body,
    })
}

#[tauri::command]
pub async fn pages_create(
    app: AppHandle,
    title: String,
    parent_id: Option<String>,
) -> Result<PageMeta, String> {
    let dir = ensure_pages_dir(&app)?;
    let id = Uuid::new_v4().to_string();
    let updated_at = chrono::Utc::now().to_rfc3339();
    let fm = Frontmatter {
        id: id.clone(),
        title: title.clone(),
        parent_id,
        updated_at: updated_at.clone(),
    };
    let path = page_path(&dir, &id);
    write_page_file(&path, &fm, "")?;
    Ok(PageMeta {
        kind: EntityKind::page(),
        id,
        title,
        parent_id: fm.parent_id,
        updated_at,
    })
}

#[tauri::command]
pub async fn pages_save(
    app: AppHandle,
    id: String,
    title: String,
    parent_id: Option<String>,
    body: String,
) -> Result<PageMeta, String> {
    let dir = ensure_pages_dir(&app)?;
    let path = page_path(&dir, &id);
    let updated_at = chrono::Utc::now().to_rfc3339();
    let fm = Frontmatter {
        id: id.clone(),
        title: title.clone(),
        parent_id,
        updated_at: updated_at.clone(),
    };
    write_page_file(&path, &fm, &body)?;
    Ok(PageMeta {
        kind: EntityKind::page(),
        id,
        title,
        parent_id: fm.parent_id,
        updated_at,
    })
}

#[tauri::command]
pub async fn pages_delete(app: AppHandle, id: String) -> Result<(), String> {
    let dir = ensure_pages_dir(&app)?;
    let path = page_path(&dir, &id);
    fs::remove_file(&path).map_err(|e| format!("remove {path:?}: {e}"))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn search_terms_and_match() {
        let terms = parse_search_terms("  Hello  world ");
        assert_eq!(terms, vec!["hello", "world"]);
        let hay = "prefix hello there world suffix".to_lowercase();
        assert!(text_matches_all_terms(&hay, &terms));
        assert!(!text_matches_all_terms("hello", &terms));
    }

    #[test]
    fn page_meta_entity_ref_is_page_kind() {
        let m = PageMeta {
            kind: EntityKind::page(),
            id: "u1".into(),
            title: "T".into(),
            parent_id: None,
            updated_at: "".into(),
        };
        let r = m.entity_ref();
        assert_eq!(r.kind.as_str(), EntityKind::PAGE);
        assert_eq!(r.id, "u1");
    }
}
