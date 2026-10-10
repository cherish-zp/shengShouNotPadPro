/**
 * 应用内更新——纯逻辑模块（不依赖 React / Tauri，可被 vitest 直接测试）。
 * 状态机编排见 src/store/updateStore.ts。
 */

/** 忽略版本在 localStorage 中的 key */
export const IGNORE_KEY = "update.ignoredVersion";

export type UpdatePhase =
  | "idle"
  | "checking"
  | "up-to-date"
  | "available"
  | "downloading"
  | "ready"
  | "error";

/** 检查结果决策：应进入「已是最新」还是「发现新版本」 */
export function decideCheckPhase(
  hasUpdate: boolean,
  newVersion: string | null,
  ignoredVersion: string | null
): "up-to-date" | "available" {
  if (!hasUpdate) return "up-to-date";
  // 用户已忽略该版本 → 视为最新，不打扰
  if (newVersion && ignoredVersion && newVersion === ignoredVersion) {
    return "up-to-date";
  }
  return "available";
}

/** 下载进度百分比（0-100，钳制）；total 未知（<=0）时返回 null */
export function computeProgress(downloaded: number, total: number): number | null {
  if (total <= 0) return null;
  const pct = Math.round((downloaded / total) * 100);
  return Math.min(100, Math.max(0, pct));
}

/** 兼容兜底：非浏览器/被禁用时返回 null，避免直接引用 localStorage 抛错 */
function safeStorage(): Storage | null {
  try {
    if (typeof localStorage !== "undefined") return localStorage;
  } catch {
    // 忽略（如隐私模式下访问被禁）
  }
  return null;
}

/** 读取用户忽略的版本号（未设置时返回 null） */
export function getIgnoredVersion(): string | null {
  return safeStorage()?.getItem(IGNORE_KEY) ?? null;
}

/** 记录用户忽略的版本号 */
export function ignoreVersion(version: string): void {
  safeStorage()?.setItem(IGNORE_KEY, version);
}

/** 清除忽略记录（下次检查重新提示） */
export function clearIgnoredVersion(): void {
  safeStorage()?.removeItem(IGNORE_KEY);
}

/**
 * 非 Tauri 环境防护：插件 API 依赖 __TAURI_INTERNALS__，
 * 浏览器 dev 模式没有它，调用前检查避免报错。
 */
export function isTauriEnvironment(): boolean {
  try {
    return typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
  } catch {
    return false;
  }
}
