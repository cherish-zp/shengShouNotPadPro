#[allow(dead_code)]
pub fn get_file_extension(path: &str) -> String {
    std::path::Path::new(path)
        .extension()
        .unwrap_or_default()
        .to_string_lossy()
        .to_lowercase()
}

#[allow(dead_code)]
pub fn format_file_size(bytes: u64) -> String {
    if bytes < 1024 {
        format!("{} B", bytes)
    } else if bytes < 1024 * 1024 {
        format!("{:.1} KB", bytes as f64 / 1024.0)
    } else if bytes < 1024 * 1024 * 1024 {
        format!("{:.1} MB", bytes as f64 / (1024.0 * 1024.0))
    } else {
        format!("{:.1} GB", bytes as f64 / (1024.0 * 1024.0 * 1024.0))
    }
}

#[allow(dead_code)]
pub fn is_text_file(path: &str) -> bool {
    let binary_extensions = [
        "png", "jpg", "jpeg", "gif", "bmp", "ico", "svg", "webp",
        "mp3", "mp4", "avi", "mov", "wav", "flac", "ogg",
        "zip", "tar", "gz", "rar", "7z", "bz2",
        "exe", "dll", "so", "dylib", "bin",
        "pdf", "doc", "docx", "xls", "xlsx", "ppt", "pptx",
        "pyc", "class", "o", "obj", "wasm",
    ];
    let ext = get_file_extension(path);
    !binary_extensions.contains(&ext.as_str())
}
