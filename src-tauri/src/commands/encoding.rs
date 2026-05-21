use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize)]
pub struct EncodingInfo {
    pub name: String,
    pub label: String,
    pub description: String,
}

#[tauri::command]
pub fn detect_encoding(path: String) -> Result<String, String> {
    let bytes = std::fs::read(&path).map_err(|e| format!("Failed to read file: {}", e))?;

    // Check BOM (Byte Order Mark)
    if bytes.len() >= 3 && bytes[0] == 0xEF && bytes[1] == 0xBB && bytes[2] == 0xBF {
        return Ok("UTF-8".to_string());
    }
    if bytes.len() >= 2 && bytes[0] == 0xFF && bytes[1] == 0xFE {
        return Ok("UTF-16LE".to_string());
    }
    if bytes.len() >= 2 && bytes[0] == 0xFE && bytes[1] == 0xFF {
        return Ok("UTF-16BE".to_string());
    }

    // Try UTF-8 validation
    if std::str::from_utf8(&bytes).is_ok() {
        return Ok("UTF-8".to_string());
    }

    // Heuristic: check for common byte patterns
    let has_high_bytes = bytes.iter().any(|&b| b >= 0x80);

    if has_high_bytes {
        // Try GBK (most common non-UTF-8 encoding for Chinese)
        let (decoded, _, had_errors) = encoding_rs::GBK.decode(&bytes);
        if !had_errors && !decoded.is_empty() {
            return Ok("GBK".to_string());
        }

        // Try Shift_JIS for Japanese
        let (decoded, _, had_errors) = encoding_rs::SHIFT_JIS.decode(&bytes);
        if !had_errors && !decoded.is_empty() {
            return Ok("Shift_JIS".to_string());
        }

        // Try EUC-KR for Korean
        let (decoded, _, had_errors) = encoding_rs::EUC_KR.decode(&bytes);
        if !had_errors && !decoded.is_empty() {
            return Ok("EUC-KR".to_string());
        }

        // Try Big5 for Traditional Chinese
        let (decoded, _, had_errors) = encoding_rs::BIG5.decode(&bytes);
        if !had_errors && !decoded.is_empty() {
            return Ok("Big5".to_string());
        }

        // Fall back to Latin-1 (accepts all bytes)
        return Ok("Latin-1".to_string());
    }

    Ok("ASCII".to_string())
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
