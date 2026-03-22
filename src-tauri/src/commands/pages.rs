use serde::{Deserialize, Serialize};
use std::fs;
use std::path::{Path, PathBuf};
use tauri::AppHandle;
use tauri::Manager;
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PageMeta {
    pub id: String,
    pub title: String,
    pub parent_id: Option<String>,
    pub updated_at: String,
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
