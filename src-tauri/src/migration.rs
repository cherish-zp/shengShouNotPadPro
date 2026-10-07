//! 一次性数据迁移：应用从 NotePadPro 改名为「圣手编辑器」后 identifier 由
//! com.notepadpro.editor 变为 com.cherish.shengshoubianjiqi。macOS 上 WKWebView
//! 的本地存储（便签/设置的 localStorage）、缓存与应用数据目录（图片暂存）都按
//! identifier 寻址，不迁移则新版本启动后用户数据全部"丢失"。
//!
//! 参照圣手码头的做法：在 WebView 初始化之前把旧 identifier 的数据目录整体复制到
//! 新 identifier 下；仅当「源存在且目标不存在」时执行，天然幂等，复制而非移动，
//! 旧目录保留作兜底。

use std::fs;
use std::io;
use std::path::{Path, PathBuf};

pub const LEGACY_IDENTIFIER: &str = "com.notepadpro.editor";
pub const APP_IDENTIFIER: &str = "com.cherish.shengshoubianjiqi";

/// 需要迁移的 (源目录, 目标目录) 计划。
pub fn migration_plan(home: &Path, new_identifier: &str) -> Vec<(PathBuf, PathBuf)> {
    ["Library/WebKit", "Library/Caches", "Library/Application Support"]
        .iter()
        .map(|sub| {
            (
                home.join(sub).join(LEGACY_IDENTIFIER),
                home.join(sub).join(new_identifier),
            )
        })
        .collect()
}

/// 从 $HOME 执行迁移的便捷入口；任何失败都返回 Err，由调用方决定忽略（不阻断启动）。
pub fn migrate_legacy_data_dirs() -> io::Result<usize> {
    let home = std::env::var("HOME").map_err(|e| io::Error::new(io::ErrorKind::NotFound, e))?;
    migrate_legacy_data_dirs_at(&PathBuf::from(home), APP_IDENTIFIER)
}

pub fn migrate_legacy_data_dirs_at(home: &Path, new_identifier: &str) -> io::Result<usize> {
    let mut migrated = 0;
    for (src, dst) in migration_plan(home, new_identifier) {
        if copy_dir_if_absent(&src, &dst)? {
            migrated += 1;
        }
    }
    Ok(migrated)
}

/// 目标不存在且源存在时，把 `src` 整体复制为 `dst`，返回是否发生了复制。
pub fn copy_dir_if_absent(src: &Path, dst: &Path) -> io::Result<bool> {
    if !src.is_dir() || dst.exists() {
        return Ok(false);
    }
    if let Some(parent) = dst.parent() {
        fs::create_dir_all(parent)?;
    }
    copy_recursive(src, dst)?;
    Ok(true)
}

fn copy_recursive(src: &Path, dst: &Path) -> io::Result<()> {
    fs::create_dir_all(dst)?;
    for entry in fs::read_dir(src)? {
        let entry = entry?;
        let ty = entry.file_type()?;
        let to = dst.join(entry.file_name());
        if ty.is_dir() {
            copy_recursive(&entry.path(), &to)?;
        } else if ty.is_file() {
            fs::copy(entry.path(), to)?;
        }
        // 符号链接等特殊文件跳过（WebKit 数据目录中不存在）
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    fn temp_home(tag: &str) -> PathBuf {
        let nanos = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap_or_default()
            .as_nanos();
        let dir = std::env::temp_dir().join(format!("ssbj-mig-{tag}-{nanos}"));
        fs::create_dir_all(&dir).unwrap();
        dir
    }

    #[test]
    fn 有旧数据时复制到新目录且旧目录保留() {
        let home = temp_home("copy");
        let old_webkit = home.join("Library/WebKit").join(LEGACY_IDENTIFIER);
        fs::create_dir_all(old_webkit.join("WebsiteData/LocalStorage")).unwrap();
        fs::write(old_webkit.join("WebsiteData/LocalStorage/notes.db"), b"notes").unwrap();

        let moved = migrate_legacy_data_dirs_at(&home, APP_IDENTIFIER).unwrap();
        assert_eq!(moved, 1);

        let new_db = home
            .join("Library/WebKit")
            .join(APP_IDENTIFIER)
            .join("WebsiteData/LocalStorage/notes.db");
        assert_eq!(fs::read(&new_db).unwrap(), b"notes");
        // 复制而非移动：旧目录保留
        assert!(old_webkit.join("WebsiteData/LocalStorage/notes.db").is_file());
        fs::remove_dir_all(&home).unwrap();
    }

    #[test]
    fn 目标已存在时跳过保证幂等() {
        let home = temp_home("idempotent");
        let old_appsupport = home.join("Library/Application Support").join(LEGACY_IDENTIFIER);
        fs::create_dir_all(old_appsupport.join("attachments/staging")).unwrap();
        fs::write(old_appsupport.join("attachments/staging/a.png"), b"img").unwrap();
        let new_appsupport = home.join("Library/Application Support").join(APP_IDENTIFIER);
        fs::create_dir_all(&new_appsupport).unwrap();
        fs::write(new_appsupport.join("sentinel"), b"keep").unwrap();

        let moved = migrate_legacy_data_dirs_at(&home, APP_IDENTIFIER).unwrap();
        assert_eq!(moved, 0);
        assert_eq!(fs::read(new_appsupport.join("sentinel")).unwrap(), b"keep");
        assert!(!new_appsupport.join("attachments").exists());
        fs::remove_dir_all(&home).unwrap();
    }

    #[test]
    fn 无旧数据时为空操作() {
        let home = temp_home("empty");
        let moved = migrate_legacy_data_dirs_at(&home, APP_IDENTIFIER).unwrap();
        assert_eq!(moved, 0);
        assert!(!home.join("Library/WebKit").join(APP_IDENTIFIER).exists());
        fs::remove_dir_all(&home).unwrap();
    }
}
