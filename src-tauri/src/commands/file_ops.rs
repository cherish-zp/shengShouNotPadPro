use base64::{engine::general_purpose::STANDARD as BASE64, Engine};
use chrono::Utc;
use serde::{Deserialize, Serialize};
use std::fs;
use std::io::Read;
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

/// read_file_bytes 的大小上限：图片经 base64 后体积放大约 1/3，再经 IPC 传给
/// 前端还要整体驻留内存；超过上限直接返回友好错误，避免大文件拖垮渲染进程。
const READ_FILE_BYTES_MAX: u64 = 20 * 1024 * 1024;

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

/// 流式统计文件行数：用 BufReader 按块读取、按字节统计 `\n`，不依赖 UTF-8 有效性，
/// 非 UTF-8 文件不再静默返回 0。与 `str::lines()` 语义对齐：末行无换行符也计一行。
fn count_lines(path: &Path) -> u64 {
    let file = match fs::File::open(path) {
        Ok(f) => f,
        Err(_) => return 0,
    };
    if file.metadata().map(|m| m.len()).unwrap_or(0) == 0 {
        return 0;
    }
    let mut reader = std::io::BufReader::with_capacity(64 * 1024, file);
    let mut count: u64 = 0;
    let mut last_byte = 0u8;
    let mut buf = [0u8; 8192];
    loop {
        match reader.read(&mut buf) {
            Ok(0) => break,
            Ok(n) => {
                last_byte = buf[n - 1];
                count += buf[..n].iter().filter(|&&b| b == b'\n').count() as u64;
            }
            Err(_) => return 0,
        }
    }
    if last_byte != b'\n' {
        count += 1;
    }
    count.max(1)
}

#[tauri::command]
pub async fn read_file(path: String, encoding: String) -> Result<FileContent, String> {
    tauri::async_runtime::spawn_blocking(move || -> Result<FileContent, String> {
        let bytes = fs::read(&path).map_err(|e| format!("Failed to read file: {}", e))?;
        let content = decode_content(&bytes, &encoding)?;
        let line_count = content.lines().count().max(1);
        Ok(FileContent {
            content,
            encoding,
            line_count,
        })
    })
    .await
    .map_err(|e| format!("read_file task failed: {}", e))?
}

#[tauri::command]
pub async fn write_file(path: String, content: String, encoding: String) -> Result<(), String> {
    tauri::async_runtime::spawn_blocking(move || -> Result<(), String> {
        let bytes = encode_content(&content, &encoding)?;
        fs::write(&path, &bytes).map_err(|e| format!("Failed to write file: {}", e))?;
        Ok(())
    })
    .await
    .map_err(|e| format!("write_file task failed: {}", e))?
}

#[tauri::command]
pub async fn get_file_info(path: String) -> Result<FileInfo, String> {
    tauri::async_runtime::spawn_blocking(move || -> Result<FileInfo, String> {
        let metadata =
            fs::metadata(&path).map_err(|e| format!("Failed to get file info: {}", e))?;
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
            count_lines(path_obj) as usize
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
    })
    .await
    .map_err(|e| format!("get_file_info task failed: {}", e))?
}

#[tauri::command]
pub async fn get_file_size(path: String) -> Result<u64, String> {
    tauri::async_runtime::spawn_blocking(move || -> Result<u64, String> {
        let metadata =
            fs::metadata(&path).map_err(|e| format!("Failed to get file size: {}", e))?;
        Ok(metadata.len())
    })
    .await
    .map_err(|e| format!("get_file_size task failed: {}", e))?
}

#[tauri::command]
pub async fn list_directory(path: String) -> Result<Vec<DirEntry>, String> {
    tauri::async_runtime::spawn_blocking(move || -> Result<Vec<DirEntry>, String> {
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
    })
    .await
    .map_err(|e| format!("list_directory task failed: {}", e))?
}

#[tauri::command]
pub async fn delete_file(path: String) -> Result<(), String> {
    tauri::async_runtime::spawn_blocking(move || -> Result<(), String> {
        let path_obj = Path::new(&path);
        if path_obj.is_dir() {
            fs::remove_dir_all(&path).map_err(|e| format!("Failed to delete directory: {}", e))?;
        } else {
            fs::remove_file(&path).map_err(|e| format!("Failed to delete file: {}", e))?;
        }
        Ok(())
    })
    .await
    .map_err(|e| format!("delete_file task failed: {}", e))?
}

#[tauri::command]
pub async fn rename_file(old_path: String, new_path: String) -> Result<(), String> {
    tauri::async_runtime::spawn_blocking(move || -> Result<(), String> {
        fs::rename(&old_path, &new_path).map_err(|e| format!("Failed to rename: {}", e))?;
        Ok(())
    })
    .await
    .map_err(|e| format!("rename_file task failed: {}", e))?
}

/// 读取文件原始字节，返回 base64 编码字符串（前端把本地图片读成 data URL 预览用）。
/// 超过 20MB 上限的文件直接报错，避免 base64 内存放大与 IPC 大包。
#[tauri::command]
pub async fn read_file_bytes(path: String) -> Result<String, String> {
    tauri::async_runtime::spawn_blocking(move || -> Result<String, String> {
        let size = fs::metadata(&path)
            .map_err(|e| format!("Failed to read file: {}", e))?
            .len();
        if size > READ_FILE_BYTES_MAX {
            return Err(format!(
                "文件过大（约 {:.1} MB），超过 20 MB 上限，无法作为图片预览加载",
                size as f64 / (1024.0 * 1024.0)
            ));
        }
        let bytes = fs::read(&path).map_err(|e| format!("Failed to read file: {}", e))?;
        Ok(BASE64.encode(&bytes))
    })
    .await
    .map_err(|e| format!("read_file_bytes task failed: {}", e))?
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
pub async fn save_image_bytes(dir: String, name: String, data_base64: String) -> Result<String, String> {
    tauri::async_runtime::spawn_blocking(move || -> Result<String, String> {
        validate_image_file_name(&name)?;
        fs::create_dir_all(&dir).map_err(|e| format!("Failed to create directory: {}", e))?;
        let bytes = BASE64
            .decode(data_base64.as_bytes())
            .map_err(|e| format!("Failed to decode image data: {}", e))?;
        let dest = Path::new(&dir).join(&name);
        fs::write(&dest, &bytes).map_err(|e| format!("Failed to write image: {}", e))?;
        Ok(dest.to_string_lossy().to_string())
    })
    .await
    .map_err(|e| format!("save_image_bytes task failed: {}", e))?
}

/// 把已存在的图片文件复制到目标目录（拖拽图片进编辑器时使用），返回目标完整路径。
#[tauri::command]
pub async fn copy_image_file(src: String, dest_dir: String, name: String) -> Result<String, String> {
    tauri::async_runtime::spawn_blocking(move || -> Result<String, String> {
        validate_image_file_name(&name)?;
        fs::create_dir_all(&dest_dir).map_err(|e| format!("Failed to create directory: {}", e))?;
        let dest = Path::new(&dest_dir).join(&name);
        fs::copy(&src, &dest).map_err(|e| format!("Failed to copy image: {}", e))?;
        Ok(dest.to_string_lossy().to_string())
    })
    .await
    .map_err(|e| format!("copy_image_file task failed: {}", e))?
}

/// 递归创建目录（保存草稿迁移暂存图片前确保 assets/ 存在）
#[tauri::command]
pub async fn ensure_dir(path: String) -> Result<(), String> {
    tauri::async_runtime::spawn_blocking(move || -> Result<(), String> {
        fs::create_dir_all(&path).map_err(|e| format!("Failed to create directory: {}", e))?;
        Ok(())
    })
    .await
    .map_err(|e| format!("ensure_dir task failed: {}", e))?
}

/// 移除文件或文件夹的 macOS 隔离属性（com.apple.quarantine），
/// 避免从网络下载的文件在打开时弹出「无法验证是否包含恶意软件」的警告。
/// 非 macOS 平台下直接返回 Ok(())，无操作。
#[tauri::command]
pub async fn remove_quarantine(path: String, recursive: bool) -> Result<(), String> {
    tauri::async_runtime::spawn_blocking(move || -> Result<(), String> {
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
            let _ = (&path, &recursive);
        }
        Ok(())
    })
    .await
    .map_err(|e| format!("remove_quarantine task failed: {}", e))?
}

#[cfg(test)]
mod tests {
    use super::*;

    fn temp_dir(tag: &str) -> std::path::PathBuf {
        std::env::temp_dir().join(format!("novaedit-{}-{}", tag, std::process::id()))
    }

    #[test]
    fn test_save_image_bytes_writes_and_returns_path() {
        let dir = temp_dir("save-img");
        let data_base64 = BASE64.encode(b"\x89PNG fake image bytes");
        let path = tauri::async_runtime::block_on(save_image_bytes(
            dir.to_string_lossy().to_string(),
            "img-test.png".to_string(),
            data_base64,
        ))
        .expect("save_image_bytes should succeed");
        assert_eq!(path, dir.join("img-test.png").to_string_lossy().to_string());
        let written = fs::read(&path).expect("file should exist");
        assert_eq!(written, b"\x89PNG fake image bytes");
        fs::remove_dir_all(&dir).ok();
    }

    #[test]
    fn test_save_image_bytes_rejects_path_traversal() {
        let r1 = tauri::async_runtime::block_on(save_image_bytes(
            "/tmp".into(),
            "../evil.png".into(),
            "".into(),
        ));
        let r2 = tauri::async_runtime::block_on(save_image_bytes(
            "/tmp".into(),
            "a/b.png".into(),
            "".into(),
        ));
        assert!(r1.is_err());
        assert!(r2.is_err());
    }

    /// 显示链路守护：read_file_bytes 的 base64 输出必须能无损还原原始字节。
    /// 图片「颜色不对」排查时确认存储/读取管线不丢字节（渲染端色彩问题与字节无关）。
    #[test]
    fn test_read_file_bytes_roundtrip() {
        let dir = temp_dir("read");
        fs::create_dir_all(&dir).expect("create temp dir");
        let file = dir.join("img.png");
        let data: &[u8] = b"\x89PNG\r\n\x1a\n fake \xff\x00\x7f bytes";
        fs::write(&file, data).expect("write temp file");
        let encoded = tauri::async_runtime::block_on(read_file_bytes(
            file.to_string_lossy().to_string(),
        ))
        .expect("read_file_bytes");
        assert_eq!(
            BASE64.decode(encoded.as_bytes()).expect("valid base64"),
            data.to_vec()
        );
        fs::remove_dir_all(&dir).ok();
    }

    /// read_file_bytes 大小上限：超过 20MB 的文件必须返回友好错误而不是读入内存。
    #[test]
    fn test_read_file_bytes_rejects_oversize_file() {
        let dir = temp_dir("oversize");
        fs::create_dir_all(&dir).expect("create temp dir");
        let file = dir.join("big.bin");
        fs::write(&file, vec![0u8; READ_FILE_BYTES_MAX as usize + 1])
            .expect("write oversize temp file");
        let result =
            tauri::async_runtime::block_on(read_file_bytes(file.to_string_lossy().to_string()));
        let err = result.expect_err("oversize file must be rejected");
        assert!(err.contains("文件过大"), "error should mention oversize: {err}");
        fs::remove_dir_all(&dir).ok();
    }

    #[test]
    fn test_get_file_size_returns_metadata_length() {
        let dir = temp_dir("size");
        fs::create_dir_all(&dir).expect("create temp dir");
        let file = dir.join("size-test.txt");
        let data = b"0123456789";
        fs::write(&file, data).expect("write temp file");
        let size = tauri::async_runtime::block_on(get_file_size(
            file.to_string_lossy().to_string(),
        ))
        .expect("get_file_size");
        assert_eq!(size, data.len() as u64);
        fs::remove_dir_all(&dir).ok();
    }

    #[test]
    fn test_get_file_size_rejects_nonexistent_path() {
        let dir = temp_dir("size-missing");
        let missing = dir.join("missing.txt");
        let result =
            tauri::async_runtime::block_on(get_file_size(missing.to_string_lossy().to_string()));
        assert!(result.is_err());
    }

    /// 流式数行：以换行结尾的文件按行数计。
    #[test]
    fn test_count_lines_with_trailing_newline() {
        let dir = temp_dir("lines");
        fs::create_dir_all(&dir).expect("create temp dir");
        let file = dir.join("a.txt");
        fs::write(&file, b"a\nb\nc\n").expect("write temp file");
        assert_eq!(count_lines(&file), 3);
        fs::remove_dir_all(&dir).ok();
    }

    /// 流式数行：末行无换行符也计一行（与 str::lines 语义一致）。
    #[test]
    fn test_count_lines_without_trailing_newline() {
        let dir = temp_dir("lines2");
        fs::create_dir_all(&dir).expect("create temp dir");
        let file = dir.join("b.txt");
        fs::write(&file, b"a\nb").expect("write temp file");
        assert_eq!(count_lines(&file), 2);
        fs::remove_dir_all(&dir).ok();
    }

    /// 流式数行核心修复：非 UTF-8（二进制）文件不再静默返回 0。
    #[test]
    fn test_count_lines_counts_non_utf8_bytes() {
        let dir = temp_dir("lines3");
        fs::create_dir_all(&dir).expect("create temp dir");
        let file = dir.join("c.bin");
        fs::write(&file, [0xFFu8, b'\n', 0xFE, b'\n', 0x80]).expect("write temp file");
        assert_eq!(count_lines(&file), 3);
        fs::remove_dir_all(&dir).ok();
    }

    /// 流式数行：空文件为 0 行。
    #[test]
    fn test_count_lines_empty_file() {
        let dir = temp_dir("lines4");
        fs::create_dir_all(&dir).expect("create temp dir");
        let file = dir.join("empty.txt");
        fs::write(&file, b"").expect("write temp file");
        assert_eq!(count_lines(&file), 0);
        fs::remove_dir_all(&dir).ok();
    }
}
