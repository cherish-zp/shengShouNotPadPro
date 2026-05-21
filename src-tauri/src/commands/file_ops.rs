use crate::state::{AppState, RecentFile};
use chrono::Utc;
use serde::{Deserialize, Serialize};
use std::fs;
use std::path::Path;

#[derive(Serialize, Deserialize)]
pub struct FileContent {
    pub content: String,
    pub encoding: String,
    pub line_count: usize,
}

#[derive(Serialize, Deserialize)]
pub struct FileInfo {
    pub name: String,
    pub path: String,
    pub size: u64,
    pub is_dir: bool,
    pub modified: String,
    pub created: String,
    pub line_count: usize,
    pub extension: String,
}

#[derive(Serialize, Deserialize)]
pub struct DirEntry {
    pub name: String,
    pub path: String,
    pub is_dir: bool,
    pub size: u64,
    pub modified: String,
    pub extension: String,
}

fn encode_content(content: &str, encoding: &str) -> Result<Vec<u8>, String> {
    match encoding.to_uppercase().as_str() {
        "UTF-8" | "UTF8" => Ok(content.as_bytes().to_vec()),
        "UTF-16LE" | "UTF16LE" => {
            let encoded = encoding_rs::UTF_16LE.encode(content).0.to_vec();
            Ok(encoded)
        }
        "UTF-16BE" | "UTF16BE" => {
            let encoded = encoding_rs::UTF_16BE.encode(content).0.to_vec();
            Ok(encoded)
        }
        "GBK" | "GB2312" | "GB18030" => {
            let enc = if encoding.to_uppercase() == "GB18030" {
                encoding_rs::GB18030
            } else {
                encoding_rs::GBK
            };
            let (encoded, _, _) = enc.encode(content);
            Ok(encoded.to_vec())
        }
        "SHIFT_JIS" | "SHIFT-JIS" => {
            let (encoded, _, _) = encoding_rs::SHIFT_JIS.encode(content);
            Ok(encoded.to_vec())
        }
        "EUC-KR" => {
            let (encoded, _, _) = encoding_rs::EUC_KR.encode(content);
            Ok(encoded.to_vec())
        }
        "BIG5" => {
            let (encoded, _, _) = encoding_rs::BIG5.encode(content);
            Ok(encoded.to_vec())
        }
        "LATIN-1" | "ISO-8859-1" | "WINDOWS-1252" => {
            let (encoded, _, _) = encoding_rs::WINDOWS_1252.encode(content);
            Ok(encoded.to_vec())
        }
        "ASCII" => {
            // ASCII is a subset of UTF-8, just use UTF-8 encoding
            Ok(content.as_bytes().to_vec())
        }
        _ => Ok(content.as_bytes().to_vec()),
    }
}

fn decode_content(bytes: &[u8], encoding: &str) -> Result<String, String> {
    let enc = match encoding.to_uppercase().as_str() {
        "UTF-8" | "UTF8" => encoding_rs::UTF_8,
        "UTF-16LE" | "UTF16LE" => encoding_rs::UTF_16LE,
        "UTF-16BE" | "UTF16BE" => encoding_rs::UTF_16BE,
        "GBK" | "GB2312" => encoding_rs::GBK,
        "GB18030" => encoding_rs::GB18030,
        "SHIFT_JIS" | "SHIFT-JIS" => encoding_rs::SHIFT_JIS,
        "EUC-KR" => encoding_rs::EUC_KR,
        "BIG5" => encoding_rs::BIG5,
        "LATIN-1" | "ISO-8859-1" | "WINDOWS-1252" => encoding_rs::WINDOWS_1252,
        "ASCII" => encoding_rs::UTF_8,
        _ => encoding_rs::UTF_8,
    };
    let (decoded, _, had_errors) = enc.decode(bytes);
    if had_errors {
        // Fall back to UTF-8 lossy
        Ok(String::from_utf8_lossy(bytes).to_string())
    } else {
        Ok(decoded.to_string())
    }
}

#[tauri::command]
pub fn read_file(path: String, encoding: String) -> Result<FileContent, String> {
    let bytes = fs::read(&path).map_err(|e| format!("Failed to read file: {}", e))?;
    let content = decode_content(&bytes, &encoding)?;
    let line_count = content.lines().count().max(1);
    Ok(FileContent {
        content,
        encoding,
        line_count,
    })
}

#[tauri::command]
pub fn write_file(path: String, content: String, encoding: String) -> Result<(), String> {
    let bytes = encode_content(&content, &encoding)?;
    fs::write(&path, &bytes).map_err(|e| format!("Failed to write file: {}", e))?;
    Ok(())
}

#[tauri::command]
pub fn get_file_info(path: String) -> Result<FileInfo, String> {
    let metadata = fs::metadata(&path).map_err(|e| format!("Failed to get file info: {}", e))?;
    let path_obj = Path::new(&path);
    let name = path_obj
        .file_name()
        .unwrap_or_default()
        .to_string_lossy()
        .to_string();
    let extension = path_obj
        .extension()
        .unwrap_or_default()
        .to_string_lossy()
        .to_string();

    let modified = metadata
        .modified()
        .map(|t| {
            let datetime: chrono::DateTime<Utc> = t.into();
            datetime.to_rfc3339()
        })
        .unwrap_or_default();

    let created = metadata
        .created()
        .map(|t| {
            let datetime: chrono::DateTime<Utc> = t.into();
            datetime.to_rfc3339()
        })
        .unwrap_or_default();

    let line_count = if !metadata.is_dir() {
        fs::read_to_string(&path)
            .map(|c| c.lines().count().max(1))
            .unwrap_or(0)
    } else {
        0
    };

    Ok(FileInfo {
        name,
        path,
        size: metadata.len(),
        is_dir: metadata.is_dir(),
        modified,
        created,
        line_count,
        extension,
    })
}

#[tauri::command]
pub fn list_directory(path: String) -> Result<Vec<DirEntry>, String> {
    let entries =
        fs::read_dir(&path).map_err(|e| format!("Failed to read directory: {}", e))?;
    let mut result: Vec<DirEntry> = Vec::new();

    for entry in entries {
        let entry = entry.map_err(|e| format!("Failed to read entry: {}", e))?;
        let metadata = entry
            .metadata()
            .map_err(|e| format!("Failed to read metadata: {}", e))?;
        let file_name = entry.file_name().to_string_lossy().to_string();
        let file_path = entry.path().to_string_lossy().to_string();
        let extension = entry
            .path()
            .extension()
            .unwrap_or_default()
            .to_string_lossy()
            .to_string();

        let modified = metadata
            .modified()
            .map(|t| {
                let datetime: chrono::DateTime<Utc> = t.into();
                datetime.to_rfc3339()
            })
            .unwrap_or_default();

        result.push(DirEntry {
            name: file_name,
            path: file_path,
            is_dir: metadata.is_dir(),
            size: metadata.len(),
            modified,
            extension,
        });
    }

    result.sort_by(|a, b| {
        if a.is_dir == b.is_dir {
            a.name.to_lowercase().cmp(&b.name.to_lowercase())
        } else if a.is_dir {
            std::cmp::Ordering::Less
        } else {
            std::cmp::Ordering::Greater
        }
    });

    Ok(result)
}

#[tauri::command]
pub fn delete_file(path: String) -> Result<(), String> {
    let path_obj = Path::new(&path);
    if path_obj.is_dir() {
        fs::remove_dir_all(&path).map_err(|e| format!("Failed to delete directory: {}", e))?;
    } else {
        fs::remove_file(&path).map_err(|e| format!("Failed to delete file: {}", e))?;
    }
    Ok(())
}

#[tauri::command]
pub fn rename_file(old_path: String, new_path: String) -> Result<(), String> {
    fs::rename(&old_path, &new_path).map_err(|e| format!("Failed to rename: {}", e))?;
    Ok(())
}

#[tauri::command]
pub fn list_recent_files(state: tauri::State<'_, AppState>) -> Result<Vec<RecentFile>, String> {
    let files = state.recent_files.lock().map_err(|e| e.to_string())?;
    Ok(files.clone())
}

#[tauri::command]
pub fn add_recent_file(
    path: String,
    name: String,
    state: tauri::State<'_, AppState>,
) -> Result<(), String> {
    state.add_recent_file(&path, &name)
}
