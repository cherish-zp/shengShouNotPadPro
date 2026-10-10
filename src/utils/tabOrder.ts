/**
 * 便签列表排序的纯逻辑：置顶 / 取消置顶 / 组内拖拽移动。
 *
 * 不变量：pinned 便签永远物理排在数组前段（置顶区），
 * 因此「可见顺序 == 数组顺序」，UI 拖拽索引可直接映射到数组索引，
 * 且 moveTab 只需把目标索引钳制在本区内即可禁止跨区拖拽。
 */
export interface OrderableTab {
  id: string;
  pinned?: boolean;
  pinnedAt?: number;
}

/** 置顶区长度（前段连续 pinned 的数量；normalize 后等价于全部 pinned 数） */
function pinnedCountOf<T extends OrderableTab>(tabs: T[]): number {
  let n = 0;
  while (n < tabs.length && tabs[n].pinned) n++;
  return n;
}

/** 置顶：移到数组第一位（最近置顶在最上），标记 pinned/pinnedAt */
export function pinTab<T extends OrderableTab>(tabs: T[], id: string, now: number): T[] {
  const index = tabs.findIndex((t) => t.id === id);
  if (index === -1) return tabs;
  const target = { ...tabs[index], pinned: true, pinnedAt: now };
  const rest = tabs.filter((_, i) => i !== index);
  return [target, ...rest];
}

/** 取消置顶：清除标记，落到普通区头部（置顶区之后第一位） */
export function unpinTab<T extends OrderableTab>(tabs: T[], id: string): T[] {
  const index = tabs.findIndex((t) => t.id === id);
  if (index === -1 || !tabs[index].pinned) return tabs;
  const target = { ...tabs[index], pinned: false };
  delete target.pinnedAt;
  const rest = tabs.filter((_, i) => i !== index);
  // 移除自身后，剩余置顶区长度即普通区头部的插入位置
  const insertAt = pinnedCountOf(rest);
  return [...rest.slice(0, insertAt), target, ...rest.slice(insertAt)];
}

/**
 * 拖拽移动（splice 语义：toIndex 为移除后数组的落点）。
 * 源在置顶区 → 目标钳制在置顶区内；源在普通区 → 钳制在普通区内。
 */
export function moveTab<T extends OrderableTab>(tabs: T[], fromIndex: number, toIndex: number): T[] {
  const len = tabs.length;
  if (fromIndex < 0 || fromIndex >= len || fromIndex === toIndex) {
    return tabs;
  }
  const pinCount = pinnedCountOf(tabs);
  // 先把越界目标钳回列表范围，再按源所在区做跨区钳制
  const bounded = Math.min(Math.max(toIndex, 0), len - 1);
  const clamped =
    fromIndex < pinCount
      ? Math.min(bounded, pinCount - 1)
      : Math.max(bounded, pinCount);
  if (clamped === fromIndex) return tabs;
  const next = [...tabs];
  const [removed] = next.splice(fromIndex, 1);
  next.splice(clamped, 0, removed);
  return next;
}

/**
 * 上移/下移一格（offset：-1 上移 / +1 下移），按 id 定位。
 * 语义与 moveTab 完全一致：组内移动，越界与区边界均为 no-op。
 */
export function moveTabByOffset<T extends OrderableTab>(tabs: T[], id: string, offset: -1 | 1): T[] {
  const index = tabs.findIndex((t) => t.id === id);
  if (index === -1) return tabs;
  return moveTab(tabs, index, index + offset);
}

/** 上移/下移是否可用（右键菜单禁用态）：不允许移出所在区 */
export function tabMoveBounds<T extends OrderableTab>(
  tabs: T[],
  id: string
): { canMoveUp: boolean; canMoveDown: boolean } {
  const index = tabs.findIndex((t) => t.id === id);
  if (index === -1) return { canMoveUp: false, canMoveDown: false };
  const pinCount = pinnedCountOf(tabs);
  const inPinZone = index < pinCount;
  return {
    canMoveUp: inPinZone ? index > 0 : index > pinCount,
    canMoveDown: inPinZone ? index < pinCount - 1 : index < tabs.length - 1,
  };
}

/** 整理为不变量顺序：置顶区（pinnedAt 降序，稳定）在前，普通区保持原相对顺序 */
export function normalizeTabOrder<T extends OrderableTab>(tabs: T[]): T[] {
  if (!tabs.some((t) => t.pinned)) return tabs;
  const pinned = tabs
    .map((tab, order) => ({ tab, order }))
    .filter(({ tab }) => tab.pinned)
    .sort(
      (a, b) =>
        (b.tab.pinnedAt ?? -Infinity) - (a.tab.pinnedAt ?? -Infinity) || a.order - b.order
    )
    .map(({ tab }) => tab);
  const normal = tabs.filter((t) => !t.pinned);
  return [...pinned, ...normal];
}
