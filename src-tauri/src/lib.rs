mod commands;
mod state;
mod utils;

use state::AppState;
use tauri::Emitter;

pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_clipboard_manager::init())
        .manage(AppState::new())
        .invoke_handler(tauri::generate_handler![
            commands::file_ops::read_file,
            commands::file_ops::write_file,
            commands::file_ops::get_file_info,
            commands::file_ops::get_file_size,
            commands::file_ops::list_directory,
            commands::file_ops::read_file_bytes,
            commands::file_ops::list_directory_recursive,
            commands::file_ops::delete_file,
            commands::file_ops::rename_file,
            commands::encoding::detect_encoding,
            commands::encoding::list_encodings,
            commands::encoding::transcode_text,
            commands::search::search_in_file,
            commands::search::search_in_directory,
            commands::search::replace_in_file,
            commands::git_ops::git_status,
            commands::git_ops::git_diff,
            commands::git_ops::git_log,
            commands::git_ops::git_branch,
            commands::system::open_file_dialog,
            commands::system::save_file_dialog,
            commands::system::open_folder_dialog,
            commands::system::reveal_in_finder,
            commands::clipboard::get_clipboard_text,
            commands::clipboard::set_clipboard_text,
            commands::file_ops::add_recent_file,
            commands::file_ops::list_recent_files,
            commands::file_ops::remove_quarantine,
            commands::file_ops::save_image_bytes,
            commands::file_ops::copy_image_file,
            commands::file_ops::ensure_dir,
        ])
        .build(tauri::generate_context!())
        .expect("error while building NotePadPro")
        .run(|app, event| {
            // 从 Finder / 右键「打开方式」打开文件时：
            // 1. 自动移除 macOS 隔离属性（下一次打开就不会弹警告了）
            // 2. 通知前端把文件真正打开到编辑器中
            #[cfg(target_os = "macos")]
            if let tauri::RunEvent::Opened { urls } = &event {
                use std::process::Command;
                let mut file_paths: Vec<String> = Vec::new();
                let mut folder_paths: Vec<String> = Vec::new();
                for url in urls {
                    if url.scheme() != "file" {
                        continue;
                    }
                    if let Ok(path) = url.to_file_path() {
                        let path_str = path.to_string_lossy().to_string();
                        let ext = path
                            .extension()
                            .and_then(|e| e.to_str())
                            .unwrap_or("")
                            .to_lowercase();
                        let is_bundle = matches!(ext.as_str(), "app" | "pkg" | "dmg" | "exe" | "msi");
                        if !is_bundle {
                            let _ = Command::new("xattr")
                                .args(["-d", "com.apple.quarantine", &path_str])
                                .status();
                        }
                        let is_dir = path.is_dir();
                        if is_dir {
                            folder_paths.push(path_str);
                        } else if !is_bundle {
                            file_paths.push(path_str);
                        }
                    }
                }
                if !file_paths.is_empty() {
                    let _ = app.emit("opened-files", &file_paths);
                }
                if !folder_paths.is_empty() {
                    let _ = app.emit("opened-folders", &folder_paths);
                }
            }
        });
}
