use serde::{Deserialize, Serialize};
use std::io::Read;

#[derive(Serialize, Deserialize)]
pub struct EncodingInfo {
    pub name: String,
    pub label: String,
    pub description: String,
}

/// 编码探测只采样文件头部：大文件整读 + 多轮全量解码试探代价太高，
/// 前 64KB 足以判定 BOM 与常见编码特征。
const DETECT_SAMPLE_SIZE: u64 = 64 * 1024;

/// 对字节样本做编码探测：BOM → UTF-8 校验 → GBK/Shift_JIS/EUC-KR/Big5 试探 → Latin-1/ASCII。
/// 纯函数，只处理传入样本，不做任何 IO。
fn detect_encoding_from_bytes(bytes: &[u8]) -> String {
    // Check BOM (Byte Order Mark)
    if bytes.len() >= 3 && bytes[0] == 0xEF && bytes[1] == 0xBB && bytes[2] == 0xBF {
        return "UTF-8".to_string();
    }
    if bytes.len() >= 2 && bytes[0] == 0xFF && bytes[1] == 0xFE {
        return "UTF-16LE".to_string();
    }
    if bytes.len() >= 2 && bytes[0] == 0xFE && bytes[1] == 0xFF {
        return "UTF-16BE".to_string();
    }

    // Try UTF-8 validation
    if std::str::from_utf8(bytes).is_ok() {
        return "UTF-8".to_string();
    }

    // Heuristic: check for common byte patterns
    let has_high_bytes = bytes.iter().any(|&b| b >= 0x80);

    if has_high_bytes {
        // Try GBK (most common non-UTF-8 encoding for Chinese)
        let (decoded, _, had_errors) = encoding_rs::GBK.decode(bytes);
        if !had_errors && !decoded.is_empty() {
            return "GBK".to_string();
        }

        // Try Shift_JIS for Japanese
        let (decoded, _, had_errors) = encoding_rs::SHIFT_JIS.decode(bytes);
        if !had_errors && !decoded.is_empty() {
            return "Shift_JIS".to_string();
        }

        // Try EUC-KR for Korean
        let (decoded, _, had_errors) = encoding_rs::EUC_KR.decode(bytes);
        if !had_errors && !decoded.is_empty() {
            return "EUC-KR".to_string();
        }

        // Try Big5 for Traditional Chinese
        let (decoded, _, had_errors) = encoding_rs::BIG5.decode(bytes);
        if !had_errors && !decoded.is_empty() {
            return "Big5".to_string();
        }

        // Fall back to Latin-1 (accepts all bytes)
        return "Latin-1".to_string();
    }

    "ASCII".to_string()
}

fn encoding_for(name: &str) -> &'static encoding_rs::Encoding {
    match name.to_uppercase().as_str() {
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
    }
}

/// 把字符串按 from 编码序列化为字节，再用 to 编码解码回字符串。
/// 用于在编辑器中切换编码：例如把被错误解码成 GBK 的文本按字节还原后用 UTF-8 重新解读。
#[tauri::command]
pub fn transcode_text(content: String, from: String, to: String) -> Result<String, String> {
    if from.eq_ignore_ascii_case(&to) {
        return Ok(content);
    }
    let from_enc = encoding_for(&from);
    let to_enc = encoding_for(&to);
    let (bytes, _, _) = from_enc.encode(&content);
    let (decoded, _, _) = to_enc.decode(&bytes);
    Ok(decoded.into_owned())
}

/// 采样文件头部做编码探测（对外签名不变，前端 invoke 无感知）。
#[tauri::command]
pub async fn detect_encoding(path: String) -> Result<String, String> {
    tauri::async_runtime::spawn_blocking(move || -> Result<String, String> {
        let file =
            std::fs::File::open(&path).map_err(|e| format!("Failed to read file: {}", e))?;
        let mut sample = Vec::new();
        (&file)
            .take(DETECT_SAMPLE_SIZE)
            .read_to_end(&mut sample)
            .map_err(|e| format!("Failed to read file: {}", e))?;
        Ok(detect_encoding_from_bytes(&sample))
    })
    .await
    .map_err(|e| format!("detect_encoding task failed: {}", e))?
}

#[tauri::command]
pub fn list_encodings() -> Vec<EncodingInfo> {
    vec![
        EncodingInfo {
            name: "UTF-8".to_string(),
            label: "UTF-8".to_string(),
            description: "Unicode (UTF-8)".to_string(),
        },
        EncodingInfo {
            name: "UTF-16LE".to_string(),
            label: "UTF-16 LE".to_string(),
            description: "Unicode (UTF-16 Little Endian)".to_string(),
        },
        EncodingInfo {
            name: "UTF-16BE".to_string(),
            label: "UTF-16 BE".to_string(),
            description: "Unicode (UTF-16 Big Endian)".to_string(),
        },
        EncodingInfo {
            name: "GBK".to_string(),
            label: "GBK".to_string(),
            description: "Chinese (GBK/GB2312)".to_string(),
        },
        EncodingInfo {
            name: "GB18030".to_string(),
            label: "GB18030".to_string(),
            description: "Chinese (GB18030)".to_string(),
        },
        EncodingInfo {
            name: "Shift_JIS".to_string(),
            label: "Shift JIS".to_string(),
            description: "Japanese (Shift JIS)".to_string(),
        },
        EncodingInfo {
            name: "EUC-KR".to_string(),
            label: "EUC-KR".to_string(),
            description: "Korean (EUC-KR)".to_string(),
        },
        EncodingInfo {
            name: "Big5".to_string(),
            label: "Big5".to_string(),
            description: "Traditional Chinese (Big5)".to_string(),
        },
        EncodingInfo {
            name: "Latin-1".to_string(),
            label: "Latin-1".to_string(),
            description: "Western European (ISO-8859-1)".to_string(),
        },
        EncodingInfo {
            name: "Windows-1252".to_string(),
            label: "Windows-1252".to_string(),
            description: "Western European (Windows)".to_string(),
        },
        EncodingInfo {
            name: "ASCII".to_string(),
            label: "ASCII".to_string(),
            description: "US-ASCII".to_string(),
        },
    ]
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn 检测bom_utf8() {
        assert_eq!(detect_encoding_from_bytes(&[0xEF, 0xBB, 0xBF, b'a']), "UTF-8");
    }

    #[test]
    fn 检测bom_utf16() {
        assert_eq!(detect_encoding_from_bytes(&[0xFF, 0xFE, b'a']), "UTF-16LE");
        assert_eq!(detect_encoding_from_bytes(&[0xFE, 0xFF, b'a']), "UTF-16BE");
    }

    #[test]
    fn 检测纯ascii() {
        // 原始语义：UTF-8 校验先行，纯 ASCII 是合法 UTF-8，命中 UTF-8 分支
        assert_eq!(detect_encoding_from_bytes(b"hello world"), "UTF-8");
    }

    #[test]
    fn 检测utf8中文() {
        let text = "中文内容 hello";
        assert_eq!(detect_encoding_from_bytes(text.as_bytes()), "UTF-8");
    }

    #[test]
    fn 检测gbk中文() {
        // 「中文」的 GBK 编码字节（D6 D0 CE C4），不是合法 UTF-8，应命中 GBK
        assert_eq!(detect_encoding_from_bytes(&[0xD6, 0xD0, 0xCE, 0xC4]), "GBK");
    }

    #[test]
    fn 检测_latin1_兜底() {
        // 0xFF 不在任何 CJK 编码的合法首字节范围内（GBK/Big5/EUC-KR/Shift_JIS
        // 首字节上限均为 0xFE），四轮试探全部失败后应兜底为 Latin-1
        assert_eq!(detect_encoding_from_bytes(&[0xFF]), "Latin-1");
    }
}
