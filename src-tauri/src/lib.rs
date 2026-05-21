mod commands;
mod state;
mod utils;

use state::AppState;

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
            commands::file_ops::list_directory,
            commands::file_ops::delete_file,
            commands::file_ops::rename_file,
            commands::encoding::detect_encoding,
            commands::encoding::list_encodings,
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
        ])
        .run(tauri::generate_context!())
        .expect("error while running NovaEdit");
}
