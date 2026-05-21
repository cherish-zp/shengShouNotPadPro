import { useCallback } from "react";

// Tauri invoke wrapper with dev-mode fallback
async function invoke<T>(cmd: string, args?: Record<string, unknown>): Promise<T> {
  try {
    const { invoke: tauriInvoke } = await import("@tauri-apps/api/core");
    return await tauriInvoke<T>(cmd, args);
  } catch {
    // Dev mode fallback - return mock data
    return getMockData<T>(cmd, args);
  }
}

function getMockData<T>(cmd: string, args?: Record<string, unknown>): T {
  switch (cmd) {
    case "list_encodings":
      return [
        { name: "UTF-8", label: "UTF-8", description: "统一码 (UTF-8)" },
        { name: "GBK", label: "GBK", description: "中文简体 (GBK)" },
        { name: "UTF-16LE", label: "UTF-16 LE", description: "统一码 UTF-16 LE" },
        { name: "UTF-16BE", label: "UTF-16 BE", description: "统一码 UTF-16 BE" },
        { name: "Shift_JIS", label: "Shift JIS", description: "日文" },
        { name: "Latin-1", label: "Latin-1", description: "西欧" },
        { name: "ASCII", label: "ASCII", description: "美式 ASCII" },
      ] as T;
    case "detect_encoding":
      return "UTF-8" as T;
    case "list_directory":
      return [] as T;
    case "search_in_file":
    case "search_in_directory":
      return [] as T;
    case "git_status":
    case "git_log":
      return [] as T;
    case "git_branch":
      return { current: "main", branches: ["main"] } as T;
    case "git_diff":
      return "" as T;
    case "list_recent_files":
      return [] as T;
    case "get_clipboard_text":
      return "" as T;
    case "open_file_dialog":
      return null as T;
    case "save_file_dialog":
      // 模拟保存对话框：用 prompt 让用户输入路径
      if (typeof window !== "undefined") {
        const name = (args?.defaultName as string) || "未命名.txt";
        const path = window.prompt("保存文件路径（开发模式模拟）:", `~/Desktop/${name}`);
        return (path || null) as T;
      }
      return null as T;
    case "open_folder_dialog":
      return null as T;
    case "write_file":
      return undefined as T;
    case "reveal_in_finder":
      return undefined as T;
    default:
      return null as T;
  }
}

export function useTauri() {
  const readFile = useCallback(async (path: string, encoding: string = "UTF-8") => {
    return invoke<{ content: string; encoding: string; line_count: number }>(
      "read_file",
      { path, encoding }
    );
  }, []);

  const writeFile = useCallback(async (path: string, content: string, encoding: string = "UTF-8") => {
    return invoke<void>("write_file", { path, content, encoding });
  }, []);

  const openDialog = useCallback(async () => {
    return invoke<string | null>("open_file_dialog");
  }, []);

  const saveDialog = useCallback(async (defaultName?: string) => {
    return invoke<string | null>("save_file_dialog", { defaultName });
  }, []);

  const openFolderDialog = useCallback(async () => {
    return invoke<string | null>("open_folder_dialog");
  }, []);

  const listDirectory = useCallback(async (path: string) => {
    return invoke<Array<{ name: string; path: string; is_dir: boolean; size: number; modified: string; extension: string }>>(
      "list_directory",
      { path }
    );
  }, []);

  const searchInFile = useCallback(async (path: string, query: string, caseSensitive: boolean, useRegex: boolean) => {
    return invoke<Array<{ line: number; col: number; text: string; length: number }>>(
      "search_in_file",
      { path, query, caseSensitive, useRegex }
    );
  }, []);

  const searchInDir = useCallback(async (dir: string, query: string, caseSensitive: boolean, useRegex: boolean, filePattern?: string) => {
    return invoke<Array<{ filePath: string; fileName: string; matches: Array<{ line: number; col: number; text: string; length: number }> }>>(
      "search_in_directory",
      { dir, query, caseSensitive, useRegex, filePattern }
    );
  }, []);

  const detectEncoding = useCallback(async (path: string) => {
    return invoke<string>("detect_encoding", { path });
  }, []);

  const listEncodings = useCallback(async () => {
    return invoke<Array<{ name: string; label: string; description: string }>>("list_encodings");
  }, []);

  const gitStatus = useCallback(async (repoPath: string) => {
    return invoke<Array<{ path: string; status: string; staged: boolean }>>("git_status", { repoPath });
  }, []);

  const gitDiff = useCallback(async (repoPath: string, filePath?: string) => {
    return invoke<string>("git_diff", { repoPath, filePath });
  }, []);

  const revealInFinder = useCallback(async (path: string) => {
    return invoke<void>("reveal_in_finder", { path });
  }, []);

  return {
    readFile,
    writeFile,
    openDialog,
    saveDialog,
    openFolderDialog,
    listDirectory,
    searchInFile,
    searchInDir,
    detectEncoding,
    listEncodings,
    gitStatus,
    gitDiff,
    revealInFinder,
  };
}
