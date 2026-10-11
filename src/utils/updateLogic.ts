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

/** 把 updater 插件的原始错误转译成用户能看懂的中文提示；未知错误原样返回（去掉可能的前缀噪音） */
export function classifyUpdateError(e: unknown): string {
  const raw = String(e);
  const lowered = raw.toLowerCase();

  // 1) 两个更新端点都没有 latest.json（ReleaseNotFound）——典型场景：新版本尚未发布。
  //    必须先于网络类判断：报错原文里同样含 "fetch"/"connection" 等词。
  if (
    lowered.includes("could not fetch a valid release json") ||
    lowered.includes("releasenotfound")
  ) {
    return "更新服务器暂未提供新版本（可能仍在发布流程中），请稍后再试";
  }
  // 2) 网络类：连接、DNS、超时、URL 非法等
  if (
    lowered.includes("network") ||
    lowered.includes("fetch") ||
    lowered.includes("timed out") ||
    lowered.includes("timeout") ||
    lowered.includes("dns") ||
    lowered.includes("connection") ||
    lowered.includes("url error")
  ) {
    return "网络连接失败，请检查网络后重试";
  }
  // 3) 签名校验失败
  if (
    lowered.includes("signature") ||
    lowered.includes("public key") ||
    lowered.includes("invalid key")
  ) {
    return "更新包签名校验失败，为保证安全已中止更新";
  }
  // 4) 权限不足
  if (
    lowered.includes("permission") ||
    lowered.includes("not allowed") ||
    lowered.includes("forbidden")
  ) {
    return "没有权限执行更新操作";
  }
  // 5) 未知错误：原样返回（空串视为未知）
  if (raw.trim() === "") return "未知错误";
  return raw;
}
