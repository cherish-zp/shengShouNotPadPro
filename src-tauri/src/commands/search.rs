use serde::{Deserialize, Serialize};
use std::fs;
use walkdir::WalkDir;

#[derive(Serialize, Deserialize)]
pub struct SearchMatch {
    pub line: usize,
    pub col: usize,
    pub text: String,
    pub length: usize,
}

#[derive(Serialize, Deserialize)]
pub struct FileSearchResult {
    pub file_path: String,
    pub file_name: String,
    pub matches: Vec<SearchMatch>,
}

#[tauri::command]
pub fn search_in_file(
    path: String,
    query: String,
    case_sensitive: bool,
    use_regex: bool,
) -> Result<Vec<SearchMatch>, String> {
    let content = fs::read_to_string(&path)
        .map_err(|e| format!("Failed to read file: {}", e))?;

    let matches = if use_regex {
        let re = if case_sensitive {
            regex::Regex::new(&query)
        } else {
            regex::Regex::new(&format!("(?i){}", query))
        }
        .map_err(|e| format!("Invalid regex: {}", e))?;

        let mut result = Vec::new();
        for (line_num, line) in content.lines().enumerate() {
            for mat in re.find_iter(line) {
                result.push(SearchMatch {
                    line: line_num + 1,
                    col: mat.start() + 1,
                    text: line.to_string(),
                    length: mat.len(),
                });
            }
        }
        result
    } else {
        let query_lower = if !case_sensitive {
            query.to_lowercase()
        } else {
            query.clone()
        };

        let mut result = Vec::new();
        for (line_num, line) in content.lines().enumerate() {
            let search_line = if !case_sensitive {
                line.to_lowercase()
            } else {
                line.to_string()
            };
            let mut start = 0;
            while let Some(pos) = search_line[start..].find(&query_lower) {
                result.push(SearchMatch {
                    line: line_num + 1,
                    col: start + pos + 1,
                    text: line.to_string(),
                    length: query.len(),
                });
                start += pos + 1;
            }
        }
        result
    };

    Ok(matches)
}

#[tauri::command]
pub fn search_in_directory(
    dir: String,
    query: String,
    case_sensitive: bool,
    use_regex: bool,
    file_pattern: Option<String>,
) -> Result<Vec<FileSearchResult>, String> {
    let mut results = Vec::new();

    let walker = WalkDir::new(&dir)
        .into_iter()
        .filter_entry(|e| {
            let name = e.file_name().to_string_lossy();
            !name.starts_with('.') && name != "node_modules" && name != "target"
        });

    for entry in walker {
        let entry = match entry {
            Ok(e) => e,
            Err(_) => continue,
        };

        if !entry.file_type().is_file() {
            continue;
        }

        let path = entry.path();
        let file_name = path
            .file_name()
            .unwrap_or_default()
            .to_string_lossy()
            .to_string();

        // Filter by file pattern
        if let Some(ref pattern) = file_pattern {
            if !pattern.is_empty() && !file_name.contains(pattern.as_str()) {
                continue;
            }
        }

        // Skip binary files by checking extension
        if let Some(ext) = path.extension() {
            let ext_str = ext.to_string_lossy().to_lowercase();
            if matches!(
                ext_str.as_str(),
                "png" | "jpg" | "jpeg" | "gif" | "bmp" | "ico" | "svg"
                    | "mp3" | "mp4" | "avi" | "mov" | "wav"
                    | "zip" | "tar" | "gz" | "rar" | "7z"
                    | "exe" | "dll" | "so" | "dylib"
                    | "pdf" | "doc" | "docx" | "xls" | "xlsx"
                    | "pyc" | "class" | "o" | "obj"
            ) {
                continue;
            }
        }

        // Try to read as text
        let content = match fs::read_to_string(path) {
            Ok(c) => c,
            Err(_) => continue,
        };

        let file_matches = if use_regex {
            let re = match if case_sensitive {
                regex::Regex::new(&query)
            } else {
                regex::Regex::new(&format!("(?i){}", query))
            } {
                Ok(r) => r,
                Err(_) => continue,
            };

            let mut m = Vec::new();
            for (line_num, line) in content.lines().enumerate() {
                for mat in re.find_iter(line) {
                    m.push(SearchMatch {
                        line: line_num + 1,
                        col: mat.start() + 1,
                        text: line.to_string(),
                        length: mat.len(),
                    });
                }
            }
            m
        } else {
            let query_lower = if !case_sensitive {
                query.to_lowercase()
            } else {
                query.clone()
            };

            let mut m = Vec::new();
            for (line_num, line) in content.lines().enumerate() {
                let search_line = if !case_sensitive {
                    line.to_lowercase()
                } else {
                    line.to_string()
                };
                if search_line.contains(&query_lower) {
                    m.push(SearchMatch {
                        line: line_num + 1,
                        col: search_line.find(&query_lower).unwrap_or(0) + 1,
                        text: line.to_string(),
                        length: query.len(),
                    });
                }
            }
            m
        };

        if !file_matches.is_empty() {
            results.push(FileSearchResult {
                file_path: path.to_string_lossy().to_string(),
                file_name,
                matches: file_matches,
            });
        }
    }

    Ok(results)
}

#[tauri::command]
pub fn replace_in_file(
    path: String,
    find: String,
    replace: String,
    use_regex: bool,
) -> Result<u32, String> {
    let content = fs::read_to_string(&path)
        .map_err(|e| format!("Failed to read file: {}", e))?;

    let (new_content, count) = if use_regex {
        let re = regex::Regex::new(&find)
            .map_err(|e| format!("Invalid regex: {}", e))?;

        // Count matches first
        let count = re.find_iter(&content).count() as u32;
        let result = re.replace_all(&content, replace.as_str());
        (result.to_string(), count)
    } else {
        let count = content.matches(&find).count() as u32;
        (content.replace(&find, &replace), count)
    };

    fs::write(&path, new_content.as_bytes())
        .map_err(|e| format!("Failed to write file: {}", e))?;

    Ok(count)
}
