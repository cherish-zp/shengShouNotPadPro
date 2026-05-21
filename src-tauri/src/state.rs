use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use std::path::PathBuf;
use std::sync::Mutex;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RecentFile {
    pub path: String,
    pub name: String,
    pub last_opened: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AppSettings {
    pub theme: String,
    pub font_size: u32,
    pub font_family: String,
    pub auto_save: bool,
    pub auto_save_interval: u32,
    pub tab_size: u32,
    pub word_wrap: bool,
}

impl Default for AppSettings {
    fn default() -> Self {
        Self {
            theme: "dark".to_string(),
            font_size: 14,
            font_family: "Menlo".to_string(),
            auto_save: true,
            auto_save_interval: 30,
            tab_size: 4,
            word_wrap: false,
        }
    }
}

pub struct AppState {
    pub recent_files: Mutex<Vec<RecentFile>>,
    #[allow(dead_code)]
    pub open_folder: Mutex<Option<String>>,
    pub recent_files_path: PathBuf,
    #[allow(dead_code)]
    pub settings: Mutex<AppSettings>,
}

impl AppState {
    pub fn new() -> Self {
        let recent_files_path = dirs::config_dir()
            .unwrap_or_else(|| PathBuf::from("."))
            .join("NovaEdit")
            .join("recent_files.json");

        let recent_files = if recent_files_path.exists() {
            let content = std::fs::read_to_string(&recent_files_path).unwrap_or_default();
            serde_json::from_str(&content).unwrap_or_default()
        } else {
            Vec::new()
        };

        Self {
            recent_files: Mutex::new(recent_files),
            open_folder: Mutex::new(None),
            recent_files_path,
            settings: Mutex::new(AppSettings::default()),
        }
    }

    pub fn save_recent_files(&self) -> Result<(), String> {
        let files = self.recent_files.lock().map_err(|e| e.to_string())?;
        if let Some(parent) = self.recent_files_path.parent() {
            std::fs::create_dir_all(parent).map_err(|e| e.to_string())?;
        }
        let json = serde_json::to_string_pretty(&*files).map_err(|e| e.to_string())?;
        std::fs::write(&self.recent_files_path, json).map_err(|e| e.to_string())?;
        Ok(())
    }

    pub fn add_recent_file(&self, path: &str, name: &str) -> Result<(), String> {
        let mut files = self.recent_files.lock().map_err(|e| e.to_string())?;
        files.retain(|f| f.path != path);
        files.insert(
            0,
            RecentFile {
                path: path.to_string(),
                name: name.to_string(),
                last_opened: Utc::now(),
            },
        );
        files.truncate(20);
        drop(files);
        self.save_recent_files()
    }
}
