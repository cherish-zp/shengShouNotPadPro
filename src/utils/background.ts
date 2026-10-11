/**
 * 背景图片工具模块。
 * - pickBackgroundImage：弹系统文件对话框选一张本地图（Tauri 专属，按需加载插件）
 * - backgroundToCssUrl：本地绝对路径 → 前端可用的 CSS url（asset 协议）
 * 可被 vitest 直接测试（Tauri API 在测试中通过 vi.mock 拦截）。
 */
import { convertFileSrc } from "@tauri-apps/api/core";

/** 背景图允许的扩展名（与系统对话框过滤器一致） */
const IMAGE_EXTENSIONS = ["png", "jpg", "jpeg", "webp", "gif", "bmp", "avif"];

/**
 * 非 Tauri 环境防护：插件 API 依赖 __TAURI_INTERNALS__，
 * 浏览器 dev 模式没有它，调用前检查避免报错。
 * （与 src/utils/updateLogic.ts 的 isTauriEnvironment 同款判断）
 */
function isTauriEnvironment(): boolean {
  try {
    return typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
  } catch {
    return false;
  }
}

/** 打开系统文件对话框选择一张背景图；取消或非 Tauri 环境返回 null，选中返回绝对路径 */
export async function pickBackgroundImage(): Promise<string | null> {
  if (!isTauriEnvironment()) return null;
  try {
    // 按需加载 dialog 插件（仅 Tauri 环境会走到这里）
    const { open } = await import("@tauri-apps/plugin-dialog");
    const selected: string | string[] | null = await open({
      multiple: false,
      directory: false,
      title: "选择背景图片",
      filters: [{ name: "图片", extensions: IMAGE_EXTENSIONS }],
    });
    // multiple:false 时理论上为 string|null，做防御：数组取第一个；空串/空数组也视为取消
    if (Array.isArray(selected)) return selected[0] || null;
    return selected || null;
  } catch {
    // 对话框不可用 / 插件异常：静默视为取消
    return null;
  }
}

/** 把本地绝对路径转成前端可用的 CSS url；空路径返回 "" */
export function backgroundToCssUrl(path: string): string {
  if (!path) return "";
  return convertFileSrc(path);
}
