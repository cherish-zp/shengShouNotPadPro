use git2::{Repository, Status};
use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize)]
pub struct GitStatusEntry {
    pub path: String,
    pub status: String,
    pub staged: bool,
}

#[derive(Serialize, Deserialize)]
pub struct GitCommit {
    pub hash: String,
    pub message: String,
    pub author: String,
    pub date: String,
}

#[derive(Serialize, Deserialize)]
pub struct GitBranchInfo {
    pub current: String,
    pub branches: Vec<String>,
}

#[tauri::command]
pub fn git_status(repo_path: String) -> Result<Vec<GitStatusEntry>, String> {
    let repo = Repository::discover(&repo_path)
        .map_err(|e| format!("Not a git repository: {}", e))?;

    let statuses = repo
        .statuses(None)
        .map_err(|e| format!("Failed to get status: {}", e))?;

    let mut entries = Vec::new();
    for entry in statuses.iter() {
        let path = entry
            .path()
            .unwrap_or_default()
            .to_string();
        let status = entry.status();

        let (status_str, staged) = if status.contains(Status::INDEX_NEW) {
            ("added".to_string(), true)
        } else if status.contains(Status::INDEX_MODIFIED) {
            ("modified".to_string(), true)
        } else if status.contains(Status::INDEX_DELETED) {
            ("deleted".to_string(), true)
        } else if status.contains(Status::WT_NEW) {
            ("untracked".to_string(), false)
        } else if status.contains(Status::WT_MODIFIED) {
            ("modified".to_string(), false)
        } else if status.contains(Status::WT_DELETED) {
            ("deleted".to_string(), false)
        } else if status.contains(Status::WT_RENAMED) {
            ("renamed".to_string(), false)
        } else {
            continue;
        };

        entries.push(GitStatusEntry {
            path,
            status: status_str,
            staged,
        });
    }

    Ok(entries)
}

#[tauri::command]
pub fn git_diff(repo_path: String, file_path: Option<String>) -> Result<String, String> {
    let repo = Repository::discover(&repo_path)
        .map_err(|e| format!("Not a git repository: {}", e))?;

    let head = repo
        .head()
        .map_err(|e| format!("Failed to get HEAD: {}", e))?;
    let tree = head
        .peel_to_tree()
        .map_err(|e| format!("Failed to get tree: {}", e))?;

    let mut diff_opts = git2::DiffOptions::new();
    if let Some(ref fp) = file_path {
        diff_opts.pathspec(fp);
    }

    let diff = repo
        .diff_tree_to_workdir(Some(&tree), Some(&mut diff_opts))
        .map_err(|e| format!("Failed to compute diff: {}", e))?;

    let mut result = String::new();
    diff.print(git2::DiffFormat::Patch, |_delta, _hunk, line| {
        let prefix = match line.origin() {
            '+' => "+",
            '-' => "-",
            ' ' => " ",
            _ => "",
        };
        result.push_str(prefix);
        result.push_str(std::str::from_utf8(line.content()).unwrap_or(""));
        true
    })
    .map_err(|e| format!("Failed to print diff: {}", e))?;

    Ok(result)
}

#[tauri::command]
pub fn git_log(repo_path: String, limit: u32) -> Result<Vec<GitCommit>, String> {
    let repo = Repository::discover(&repo_path)
        .map_err(|e| format!("Not a git repository: {}", e))?;

    let mut revwalk = repo
        .revwalk()
        .map_err(|e| format!("Failed to start revwalk: {}", e))?;

    revwalk
        .push_head()
        .map_err(|e| format!("Failed to push HEAD: {}", e))?;

    let mut commits = Vec::new();
    for (i, oid) in revwalk.enumerate() {
        if i >= limit as usize {
            break;
        }
        let oid = oid.map_err(|e| format!("Failed to get commit: {}", e))?;
        let commit = repo
            .find_commit(oid)
            .map_err(|e| format!("Failed to find commit: {}", e))?;

        let author = commit.author();
        let author_name = author.name().unwrap_or("Unknown").to_string();
        let message = commit
            .message()
            .unwrap_or("")
            .lines()
            .next()
            .unwrap_or("")
            .to_string();
        let time_secs = author.when().seconds();
        let date = chrono::DateTime::from_timestamp(time_secs, 0)
            .map(|d| d.to_rfc3339())
            .unwrap_or_default();

        commits.push(GitCommit {
            hash: oid.to_string(),
            message,
            author: author_name,
            date,
        });
    }

    Ok(commits)
}

#[tauri::command]
pub fn git_branch(repo_path: String) -> Result<GitBranchInfo, String> {
    let repo = Repository::discover(&repo_path)
        .map_err(|e| format!("Not a git repository: {}", e))?;

    let branches = repo
        .branches(None)
        .map_err(|e| format!("Failed to list branches: {}", e))?;

    let mut branch_names = Vec::new();
    let mut current = String::new();

    for branch in branches {
        let (branch, _type) = branch.map_err(|e| format!("Failed to read branch: {}", e))?;
        let name = branch
            .name()
            .map_err(|e| format!("Invalid branch name: {}", e))?
            .unwrap_or("")
            .to_string();

        if branch.is_head() {
            current = name.clone();
        }
        branch_names.push(name);
    }

    if current.is_empty() {
        current = "HEAD".to_string();
    }

    Ok(GitBranchInfo {
        current,
        branches: branch_names,
    })
}
