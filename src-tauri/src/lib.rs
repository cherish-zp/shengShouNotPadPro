mod commands;
mod migration;

use tauri::Emitter;

pub fn run() {
    // 改名（NotePadPro → 圣手编辑器）后 identifier 变更，先把旧 identifier 的
    // WebView 本地存储 / 缓存 / 应用数据目录搬到新 identifier 下，再初始化 WebView。
    if let Err(e) = migration::migrate_legacy_data_dirs() {
        eprintln!("legacy data migration skipped: {e}");
    }

    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_clipboard_manager::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_process::init())
        .setup(|app| {
            // Windows：去掉系统标题栏，由前端自绘顶栏（含最小化/最大化/关闭）；
            // macOS 走 tauri.conf.json 的 titleBarStyle=Overlay（保留红绿灯）
            #[cfg(target_os = "windows")]
            {
                use tauri::Manager;
                if let Some(win) = app.get_webview_window("main") {
                    let _ = win.set_decorations(false);
                }
            }
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::file_ops::read_file,
            commands::file_ops::write_file,
            commands::file_ops::get_file_info,
            commands::file_ops::get_file_size,
            commands::file_ops::list_directory,
            commands::file_ops::read_file_bytes,
            commands::file_ops::delete_file,
            commands::file_ops::rename_file,
            commands::encoding::detect_encoding,
            commands::encoding::list_encodings,
            commands::encoding::transcode_text,
            commands::system::open_file_dialog,
            commands::system::save_file_dialog,
            commands::system::open_folder_dialog,
            commands::system::reveal_in_finder,
            commands::clipboard::set_clipboard_text,
            commands::file_ops::remove_quarantine,
            commands::file_ops::save_image_bytes,
            commands::file_ops::copy_image_file,
            commands::file_ops::ensure_dir,
        ])
        .build(tauri::generate_context!())
        .expect("error while building 圣手编辑器")
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
