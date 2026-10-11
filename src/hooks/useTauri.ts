import { useCallback } from "react";

/** 是否运行在 Tauri WebView 内（区别于纯浏览器 dev server） */
function isTauriEnvironment(): boolean {
  return typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
}

// Tauri invoke wrapper：仅非 Tauri 环境（浏览器调试）返回 mock；
// Tauri 环境下真实错误必须抛出，不再被 mock 兜底吞掉。
async function invoke<T>(cmd: string, args?: Record<string, unknown>): Promise<T> {
  if (!isTauriEnvironment()) {
    return getMockData<T>(cmd, args);
  }
  const { invoke: tauriInvoke } = await import("@tauri-apps/api/core");
  return tauriInvoke<T>(cmd, args);
}

/**
 * 浏览器端尽力转码：把 content 按 from 编码的字节还原，再用 to 编码解读。
 * TextEncoder 只支持 UTF-8，所以 from 只能是 UTF-8。
 * TextDecoder 支持大部分常见编码，用作 to 通常是够的。
 * 对于 from 非 UTF-8 的场景，开发模式下原样返回（需要 Tauri 后端）。
 */
function browserTranscode(content: string, from: string, to: string): string {
  if (from.toLowerCase() === to.toLowerCase()) return content;
  try {
    // Step 1: 把当前字符串按 from 编码序列化为字节
    // TextEncoder 只支持 UTF-8，所以 from 必须是 UTF-8 才能正确回编
    let bytes: Uint8Array;
    if (from.toUpperCase() === "UTF-8" || from.toUpperCase() === "UTF8") {
      bytes = new TextEncoder().encode(content);
    } else {
      // 非 UTF-8 的 from 在纯浏览器端无法可靠回编，直接返回原文
      console.warn(`[transcode] 浏览器端不支持从 ${from} 编码，需 Tauri 后端`);
      return content;
    }
    // Step 2: 用 to 编码解读这些字节
    const decoder = new TextDecoder(to, { fatal: false });
    return decoder.decode(bytes);
  } catch (e) {
    console.warn("[transcode] 转码失败:", e);
    return content;
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
    case "transcode_text":
      return browserTranscode(
        (args?.content as string) ?? "",
        (args?.from as string) ?? "UTF-8",
        (args?.to as string) ?? "UTF-8"
      ) as T;
    case "detect_encoding":
      return "UTF-8" as T;
    case "list_directory":
      return [] as T;
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

  const detectEncoding = useCallback(async (path: string) => {
    return invoke<string>("detect_encoding", { path });
  }, []);

  const listEncodings = useCallback(async () => {
    return invoke<Array<{ name: string; label: string; description: string }>>("list_encodings");
  }, []);

  const transcodeText = useCallback(async (content: string, from: string, to: string) => {
    return invoke<string>("transcode_text", { content, from, to });
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
    detectEncoding,
    listEncodings,
    transcodeText,
    revealInFinder,
  };
}
