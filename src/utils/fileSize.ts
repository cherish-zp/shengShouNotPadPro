export const MAX_OPEN_FILE_SIZE_BYTES = 10 * 1024 * 1024;

export function isFileSizeOverLimit(size: number): boolean {
  return Number.isFinite(size) && size > MAX_OPEN_FILE_SIZE_BYTES;
}

export function formatFileSize(size: number | null | undefined): string | null {
  if (size === null || size === undefined || !Number.isFinite(size) || size < 0) {
    return null;
  }

  if (size < 1024) return `${size} B`;
  if (size < 1024 ** 2) return `${(size / 1024).toFixed(1)} KB`;
  if (size < 1024 ** 3) return `${(size / 1024 ** 2).toFixed(1)} MB`;
  if (size < 1024 ** 4) return `${(size / 1024 ** 3).toFixed(1)} GB`;
  return `${(size / 1024 ** 4).toFixed(1)} TB`;
}

export function formatFileSizeTooltip(size: number | null | undefined): string | null {
  if (size === null || size === undefined || !Number.isFinite(size) || size < 0) {
    return null;
  }

  return `${size.toLocaleString("en-US")} 字节`;
}

export function fileSizeLimitMessage(size: number): string {
  return `无法打开：文件为 ${formatFileSize(size)}（${size.toLocaleString("en-US")} 字节），超过 ${formatFileSize(MAX_OPEN_FILE_SIZE_BYTES)} 限制`;
}

// 约定：获取文件大小失败或环境不可用时返回 null；
// 打开文件流程在此情况下不中断，而是继续走原有的打开逻辑（不再做大小限制拦截）。
export async function getFileSizeBytes(path: string): Promise<number | null> {
  try {
    const { invoke } = await import("@tauri-apps/api/core");
    return await invoke<number>("get_file_size", { path });
  } catch {
    return null;
  }
}
