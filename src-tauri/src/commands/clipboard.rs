#[tauri::command]
pub fn get_clipboard_text() -> Result<String, String> {
    // Simple clipboard implementation using arboard or system command
    #[cfg(target_os = "macos")]
    {
        let output = std::process::Command::new("pbpaste")
            .output()
            .map_err(|e| format!("Failed to read clipboard: {}", e))?;
        String::from_utf8(output.stdout).map_err(|e| format!("Invalid clipboard content: {}", e))
    }
    #[cfg(target_os = "linux")]
    {
        let output = std::process::Command::new("xclip")
            .args(["-selection", "clipboard", "-o"])
            .output()
            .map_err(|e| format!("Failed to read clipboard: {}", e))?;
        String::from_utf8(output.stdout).map_err(|e| format!("Invalid clipboard content: {}", e))
    }
    #[cfg(not(any(target_os = "macos", target_os = "linux")))]
    {
        Ok(String::new())
    }
}

#[tauri::command]
pub fn set_clipboard_text(text: String) -> Result<(), String> {
    #[cfg(target_os = "macos")]
    {
        use std::io::Write;
        let mut child = std::process::Command::new("pbcopy")
            .stdin(std::process::Stdio::piped())
            .spawn()
            .map_err(|e| format!("Failed to set clipboard: {}", e))?;
        child
            .stdin
            .as_mut()
            .ok_or("Failed to open stdin")?
            .write_all(text.as_bytes())
            .map_err(|e| format!("Failed to write to clipboard: {}", e))?;
    }
    #[cfg(target_os = "linux")]
    {
        use std::io::Write;
        let mut child = std::process::Command::new("xclip")
            .args(["-selection", "clipboard"])
            .stdin(std::process::Stdio::piped())
            .spawn()
            .map_err(|e| format!("Failed to set clipboard: {}", e))?;
        child
            .stdin
            .as_mut()
            .ok_or("Failed to open stdin")?
            .write_all(text.as_bytes())
            .map_err(|e| format!("Failed to write to clipboard: {}", e))?;
    }
    Ok(())
}
