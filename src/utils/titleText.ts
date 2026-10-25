import type { Tab } from "@/types";

/** 无激活便签时的顶栏默认标题 */
export const DEFAULT_TITLE = "圣手编辑器";

/**
 * 解析顶栏标题文本：
 * - 有激活 tab：返回该 tab 的 name
 * - tabs 为空 / activeTabId 为 null / 找不到对应 tab：返回默认标题「圣手编辑器」
 */
export function resolveTitleText(tabs: Tab[], activeTabId: string | null): string {
  if (!tabs || tabs.length === 0 || !activeTabId) return DEFAULT_TITLE;
  const active = tabs.find((t) => t.id === activeTabId);
  // 空名（如异常数据）也回落默认标题，避免顶栏出现空白
  return active && active.name ? active.name : DEFAULT_TITLE;
}
