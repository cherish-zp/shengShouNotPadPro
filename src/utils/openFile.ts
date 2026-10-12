import { detectLanguageFromExtension } from "@/utils/encoding";
import { useTabStore } from "@/store/tabStore";
import type { Tab } from "@/types";

/**
 * 「打开文件」共享管线（合并 App.tsx / useFileDrop / FilePanel 三份漂移实现）：
 * 编码检测（失败回落 UTF-8）→ 按检测编码读取 → 语言推断 → addTab。
 * Tauri 能力通过 deps 注入以便单测；UI 特有部分（对话框、树高亮、拖拽数据、
 * 大小上限拦截、隔离属性清理）留在调用方。
 */

/** 打开文件所需的 Tauri 能力（与 useTauri 的 readFile / detectEncoding 同签名） */
export interface OpenFileDeps {
  detectEncoding: (path: string) => Promise<string>;
  readFile: (
    path: string,
    encoding: string
  ) => Promise<{ content: string; encoding: string; line_count: number }>;
}

/** 编码探测不可用时的兜底编码 */
export const DEFAULT_ENCODING = "UTF-8";

/**
 * 从路径推断语言 id（"typescript"、"python" 等，未知扩展回落 "plaintext"）。
 * 统一处理 / 与 \ 两种分隔符；扩展名 → 语言映射沿用 utils/encoding 的
 * detectLanguageFromExtension（单一来源，不在本文件重复维护）。
 */
export function languageForPath(path: string): string {
  const name = path.split(/[\\/]/).pop() || path;
  const ext = name.includes(".") ? name.split(".").pop() ?? "" : "";
  return detectLanguageFromExtension(ext);
}

/**
 * 加载文件内容：先探测编码（探测失败或返回空值回落 UTF-8），再以该编码读取。
 * readFile 返回的 encoding 与探测值不同时以 readFile 为准（后端读取时完成转码
 * 并判定实际编码）；readFile 的错误向上抛出，由调用方决定兜底。
 */
export async function loadFileContent(
  path: string,
  deps: OpenFileDeps
): Promise<{ content: string; encoding: string }> {
  let encoding = DEFAULT_ENCODING;
  try {
    const detected = await deps.detectEncoding(path);
    if (detected) encoding = detected;
  } catch {
    // 探测失败：回落 UTF-8
  }
  const result = await deps.readFile(path, encoding);
  return { content: result.content, encoding: result.encoding || encoding };
}

/**
 * 打开文件为便签 tab（三条入口的公共尾部）：文件名 + 语言推断 + 编码检测读取 +
 * useTabStore.getState().addTab（新 tab 自动激活，kind 为默认的 "file"）。
 * 读取失败时错误向上抛出，由调用方决定兜底（建空 tab / 仅记日志）。
 */
export async function openPathAsTab(path: string, deps: OpenFileDeps): Promise<Tab> {
  const name = path.split(/[\\/]/).pop() || path;
  const language = languageForPath(path);
  const { content, encoding } = await loadFileContent(path, deps);
  return useTabStore.getState().addTab({ name, filePath: path, content, encoding, language });
}
