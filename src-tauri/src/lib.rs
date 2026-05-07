use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::fs;
use std::path::{Path, PathBuf};

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ArbFile {
    pub locale: String,
    pub path: String,
    #[serde(rename = "entryCount")]
    pub entry_count: usize,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ScannedProject {
    pub path: String,
    pub name: String,
    #[serde(rename = "arbFiles")]
    pub arb_files: Vec<ArbFile>,
}

/// Walk `dir` recursively, collecting all `.arb` files.
fn find_arb_files(dir: &Path, results: &mut Vec<PathBuf>) {
    let Ok(entries) = fs::read_dir(dir) else {
        return;
    };
    for entry in entries.flatten() {
        let path = entry.path();
        if path.is_dir() {
            // Skip hidden dirs and common build/cache dirs for speed
            let name = path.file_name().unwrap_or_default().to_string_lossy();
            if name.starts_with('.') || matches!(name.as_ref(), "build" | ".dart_tool" | ".pub-cache") {
                continue;
            }
            find_arb_files(&path, results);
        } else if path.extension().and_then(|e| e.to_str()) == Some("arb") {
            results.push(path);
        }
    }
}

/// Derive a locale name from the ARB filename, e.g. `app_en.arb` → `en`.
fn locale_from_path(path: &Path) -> String {
    let stem = path
        .file_stem()
        .unwrap_or_default()
        .to_string_lossy()
        .to_string();
    // Strip a common prefix like `app_`, `intl_`, etc.
    if let Some(pos) = stem.rfind('_') {
        stem[pos + 1..].to_string()
    } else {
        stem
    }
}

/// Count non-metadata keys in an ARB file (keys not starting with `@`).
fn count_arb_entries(path: &Path) -> usize {
    let Ok(content) = fs::read_to_string(path) else {
        return 0;
    };
    let Ok(map) = serde_json::from_str::<HashMap<String, serde_json::Value>>(&content) else {
        return 0;
    };
    map.keys().filter(|k| !k.starts_with('@')).count()
}

#[tauri::command]
fn scan_flutter_project(path: String) -> Result<ScannedProject, String> {
    let root = PathBuf::from(&path);
    if !root.is_dir() {
        return Err(format!("'{}' is not a directory", path));
    }

    let project_name = root
        .file_name()
        .unwrap_or_default()
        .to_string_lossy()
        .to_string();

    let mut arb_paths: Vec<PathBuf> = Vec::new();
    find_arb_files(&root, &mut arb_paths);
    arb_paths.sort();

    let arb_files: Vec<ArbFile> = arb_paths
        .into_iter()
        .map(|p| {
            let locale = locale_from_path(&p);
            let entry_count = count_arb_entries(&p);
            ArbFile {
                locale,
                path: p.to_string_lossy().to_string(),
                entry_count,
            }
        })
        .collect();

    if arb_files.is_empty() {
        return Err(format!(
            "No .arb files found in '{}'",
            path
        ));
    }

    Ok(ScannedProject {
        path,
        name: project_name,
        arb_files,
    })
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![scan_flutter_project, load_arb_files, save_arb_file])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

// ── ARB loading ────────────────────────────────────────────────────────────────

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ArbEntry {
    pub key: String,
    pub value: String,
    pub description: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct LoadedArbFile {
    pub locale: String,
    pub path: String,
    pub entries: Vec<ArbEntry>,
}

#[tauri::command]
fn load_arb_files(paths: Vec<String>) -> Result<Vec<LoadedArbFile>, String> {
    let mut result = Vec::new();

    for path_str in paths {
        let path = PathBuf::from(&path_str);
        let content = fs::read_to_string(&path)
            .map_err(|e| format!("Cannot read '{}': {}", path_str, e))?;

        let map: serde_json::Map<String, serde_json::Value> =
            serde_json::from_str(&content)
                .map_err(|e| format!("Cannot parse '{}': {}", path_str, e))?;

        let locale = map
            .get("@@locale")
            .and_then(|v| v.as_str())
            .map(|s| s.to_string())
            .unwrap_or_else(|| locale_from_path(&path));

        let mut entries: Vec<ArbEntry> = Vec::new();

        for (key, value) in &map {
            // Skip file-level metadata and per-key metadata
            if key.starts_with('@') {
                continue;
            }
            let val_str = match value {
                serde_json::Value::String(s) => s.clone(),
                other => other.to_string(),
            };
            // Try to get description from the @key metadata
            let description = map
                .get(&format!("@{key}"))
                .and_then(|m| m.get("description"))
                .and_then(|d| d.as_str())
                .map(|s| s.to_string());

            entries.push(ArbEntry {
                key: key.clone(),
                value: val_str,
                description,
            });
        }

        // Sort by key for a consistent order
        entries.sort_by(|a, b| a.key.cmp(&b.key));

        result.push(LoadedArbFile {
            locale,
            path: path_str,
            entries,
        });
    }

    Ok(result)
}

// ── ARB saving ─────────────────────────────────────────────────────────────────

/// Write edited values back into the .arb file at `path`.
/// `edits` maps translation key → new value.
/// Existing key order is preserved (requires `serde_json/preserve_order`).
/// New keys (previously missing) are appended before their `@key` block if
/// one exists, or at the end otherwise.
#[tauri::command]
fn save_arb_file(path: String, edits: HashMap<String, String>) -> Result<(), String> {
    let file_path = PathBuf::from(&path);
    let content = fs::read_to_string(&file_path)
        .map_err(|e| format!("Cannot read '{}': {}", path, e))?;

    let mut map: serde_json::Map<String, serde_json::Value> = serde_json::from_str(&content)
        .map_err(|e| format!("Cannot parse '{}': {}", path, e))?;

    for (key, value) in edits {
        // Update existing key or insert new one (preserves order for existing keys)
        map.insert(key, serde_json::Value::String(value));
    }

    // Serialize with 4-space indent to match Flutter ARB convention
    use serde_json::ser::{PrettyFormatter, Serializer};
    let formatter = PrettyFormatter::with_indent(b"    ");
    let mut buf = Vec::new();
    let mut ser = Serializer::with_formatter(&mut buf, formatter);
    serde::Serialize::serialize(&map, &mut ser)
        .map_err(|e| format!("Cannot serialize '{}': {}", path, e))?;
    let mut output = String::from_utf8(buf).map_err(|e| format!("Encoding error: {}", e))?;
    output.push('\n');

    fs::write(&file_path, output).map_err(|e| format!("Cannot write '{}': {}", path, e))?;

    Ok(())
}
