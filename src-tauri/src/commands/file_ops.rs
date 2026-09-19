use crate::state::{AppState, RecentFile};
use base64::{engine::general_purpose::STANDARD as BASE64, Engine};
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
pub fn get_file_size(path: String) -> Result<u64, String> {
    let metadata = fs::metadata(&path).map_err(|e| format!("Failed to get file size: {}", e))?;
    Ok(metadata.len())
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

/// 读取文件原始字节，返回 base64 编码字符串（用于解析 Xshell 等二进制/特殊编码文件）
#[tauri::command]
pub fn read_file_bytes(path: String) -> Result<String, String> {
    let bytes = fs::read(&path).map_err(|e| format!("Failed to read file: {}", e))?;
    Ok(BASE64.encode(&bytes))
}

/// 校验图片文件名：只允许纯文件名，防止目录穿越
fn validate_image_file_name(name: &str) -> Result<(), String> {
    if name.is_empty()
        || name.contains('/')
        || name.contains('\\')
        || name.contains("..")
    {
        return Err(format!("Invalid image file name: {}", name));
    }
    Ok(())
}

/// 把前端传来的图片字节（base64）写入目标目录并返回完整路径。
/// 目录不存在时自动创建（文档同目录 assets/ 或草稿暂存目录）。
#[tauri::command]
pub fn save_image_bytes(dir: String, name: String, data_base64: String) -> Result<String, String> {
    validate_image_file_name(&name)?;
    fs::create_dir_all(&dir).map_err(|e| format!("Failed to create directory: {}", e))?;
    let bytes = BASE64
        .decode(data_base64.as_bytes())
        .map_err(|e| format!("Failed to decode image data: {}", e))?;
    let dest = Path::new(&dir).join(&name);
    fs::write(&dest, &bytes).map_err(|e| format!("Failed to write image: {}", e))?;
    Ok(dest.to_string_lossy().to_string())
}

/// 把已存在的图片文件复制到目标目录（拖拽图片进编辑器时使用），返回目标完整路径。
#[tauri::command]
pub fn copy_image_file(src: String, dest_dir: String, name: String) -> Result<String, String> {
    validate_image_file_name(&name)?;
    fs::create_dir_all(&dest_dir).map_err(|e| format!("Failed to create directory: {}", e))?;
    let dest = Path::new(&dest_dir).join(&name);
    fs::copy(&src, &dest).map_err(|e| format!("Failed to copy image: {}", e))?;
    Ok(dest.to_string_lossy().to_string())
}

/// 递归创建目录（保存草稿迁移暂存图片前确保 assets/ 存在）
#[tauri::command]
pub fn ensure_dir(path: String) -> Result<(), String> {
    fs::create_dir_all(&path).map_err(|e| format!("Failed to create directory: {}", e))?;
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_save_image_bytes_writes_and_returns_path() {
        let dir = std::env::temp_dir().join(format!("novaedit-test-{}", std::process::id()));
        let data_base64 = BASE64.encode(b"\x89PNG fake image bytes");
        let path = save_image_bytes(
            dir.to_string_lossy().to_string(),
            "img-test.png".to_string(),
            data_base64,
        )
        .expect("save_image_bytes should succeed");
        assert_eq!(path, dir.join("img-test.png").to_string_lossy().to_string());
        let written = fs::read(&path).expect("file should exist");
        assert_eq!(written, b"\x89PNG fake image bytes");
        fs::remove_dir_all(&dir).ok();
    }

    #[test]
    fn test_save_image_bytes_rejects_path_traversal() {
        assert!(save_image_bytes("/tmp".into(), "../evil.png".into(), "".into()).is_err());
        assert!(save_image_bytes("/tmp".into(), "a/b.png".into(), "".into()).is_err());
    }

    /// 显示链路守护：read_file_bytes 的 base64 输出必须能无损还原原始字节。
    /// 图片「颜色不对」排查时确认存储/读取管线不丢字节（渲染端色彩问题与字节无关）。
    #[test]
    fn test_read_file_bytes_roundtrip() {
        let dir = std::env::temp_dir().join(format!("novaedit-read-{}", std::process::id()));
        fs::create_dir_all(&dir).expect("create temp dir");
        let file = dir.join("img.png");
        let data: &[u8] = b"\x89PNG\r\n\x1a\n fake \xff\x00\x7f bytes";
        fs::write(&file, data).expect("write temp file");
        let encoded = read_file_bytes(file.to_string_lossy().to_string()).expect("read_file_bytes");
        assert_eq!(
            BASE64.decode(encoded.as_bytes()).expect("valid base64"),
            data.to_vec()
        );
        fs::remove_dir_all(&dir).ok();
    }

    #[test]
    fn test_get_file_size_returns_metadata_length() {
        let dir = std::env::temp_dir().join(format!("novaedit-size-{}", std::process::id()));
        fs::create_dir_all(&dir).expect("create temp dir");
        let file = dir.join("size-test.txt");
        let data = b"0123456789";
        fs::write(&file, data).expect("write temp file");
        let size = get_file_size(file.to_string_lossy().to_string()).expect("get_file_size");
        assert_eq!(size, data.len() as u64);
        fs::remove_dir_all(&dir).ok();
    }

    #[test]
    fn test_get_file_size_rejects_nonexistent_path() {
        let dir = std::env::temp_dir().join(format!("novaedit-size-missing-{}", std::process::id()));
        let missing = dir.join("missing.txt");
        assert!(get_file_size(missing.to_string_lossy().to_string()).is_err());
    }
}

/// 递归列出目录下所有文件（用于导入 Xshell 会话等场景）
#[tauri::command]
pub fn list_directory_recursive(path: String) -> Result<Vec<DirEntry>, String> {
    let mut result: Vec<DirEntry> = Vec::new();
    fn walk(dir: &Path, result: &mut Vec<DirEntry>) -> Result<(), String> {
        let entries =
            fs::read_dir(dir).map_err(|e| format!("Failed to read directory: {}", e))?;
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

            if metadata.is_dir() {
                walk(&entry.path(), result)?;
            }
        }
        Ok(())
    }
    walk(Path::new(&path), &mut result)?;
    Ok(result)
}

/// 移除文件或文件夹的 macOS 隔离属性（com.apple.quarantine），
/// 避免从网络下载的文件在打开时弹出「无法验证是否包含恶意软件」的警告。
/// 非 macOS 平台下直接返回 Ok(())，无操作。
#[tauri::command]
pub fn remove_quarantine(path: String, recursive: bool) -> Result<(), String> {
    #[cfg(target_os = "macos")]
    {
        use std::process::Command;
        let mut cmd = Command::new("xattr");
        cmd.arg("-d").arg("com.apple.quarantine");
        if recursive {
            cmd.arg("-r");
        }
        cmd.arg(&path);
        let output = cmd
            .output()
            .map_err(|e| format!("Failed to run xattr: {}", e))?;
        // xattr 在属性不存在时会返回非零退出码，但这不是错误
        // 只在启动失败等严重错误时报错
        if !output.status.success() {
            let stderr = String::from_utf8_lossy(&output.stderr);
            // "No such xattr" 是正常情况，忽略
            if !stderr.contains("No such xattr") {
                return Err(format!("xattr failed: {}", stderr.trim()));
            }
        }
    }
    #[cfg(not(target_os = "macos"))]
    {
        let _ = path;
        let _ = recursive;
    }
    Ok(())
}
