/**
 * 贴图相关的 Tauri 调用薄封装。
 * 刻意不走 useTauri 的 mock 兜底：贴图落盘失败必须抛错（由上层 toast 提示），
 * 而不是在开发模式下静默假装成功。
 */
import { dirname, joinPath } from "@/utils/imagePaste";

async function rawInvoke<T>(cmd: string, args?: Record<string, unknown>): Promise<T> {
  const { invoke } = await import("@tauri-apps/api/core");
  return invoke<T>(cmd, args);
}

let appDataDirCache: string | null = null;

async function getAppDataDir(): Promise<string> {
  if (!appDataDirCache) {
    const { appDataDir } = await import("@tauri-apps/api/path");
    appDataDirCache = await appDataDir();
  }
  return appDataDirCache;
}

/** 草稿贴图暂存根目录：<appData>/attachments/staging */
export async function getStagingRoot(): Promise<string> {
  return joinPath(await getAppDataDir(), "attachments", "staging");
}

/** 某个便签的暂存目录：<stagingRoot>/<tabId> */
export async function getTabStagingDir(tabId: string): Promise<string> {
  return joinPath(await getStagingRoot(), tabId);
}

/** 文档同目录的图片资源目录：<文档目录>/assets */
export function getAssetsDir(filePath: string): string {
  return joinPath(dirname(filePath), "assets");
}

export function saveImageBytes(dir: string, name: string, dataBase64: string): Promise<string> {
  return rawInvoke<string>("save_image_bytes", { dir, name, dataBase64 });
}

export function copyImageFile(src: string, destDir: string, name: string): Promise<string> {
  return rawInvoke<string>("copy_image_file", { src, destDir, name });
}

export function ensureDir(path: string): Promise<void> {
  return rawInvoke<void>("ensure_dir", { path });
}

export function moveFile(from: string, to: string): Promise<void> {
  return rawInvoke<void>("rename_file", { oldPath: from, newPath: to });
}

/** 清理便签的暂存目录（关闭草稿时调用）；目录不存在或失败均静默 */
export async function cleanupTabStaging(tabId: string): Promise<void> {
  try {
    const dir = await getTabStagingDir(tabId);
    await rawInvoke<void>("delete_file", { path: dir });
  } catch {
    // 非关键路径：清理失败不影响功能
  }
}
