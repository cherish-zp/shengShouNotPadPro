import type { CSSProperties } from "react";

/**
 * 便签 / 文件树 区域的滚动容器样式。
 *
 * 关键点：flex 子项默认 min-height: auto，内容增多时会撑开父容器而非滚动，
 * 从而把同级的文件树区域挤出可视范围（被遮挡）。设置 minHeight: 0 后，
 * 滚动容器可在分配的高度内自行滚动，不再撑开父容器，文件树始终保持可见。
 */
export const scrollContainerStyle: CSSProperties = {
  flex: 1,
  overflowY: "auto",
  overflowX: "hidden",
  minHeight: 0,
};

/**
 * 计算便签区域实际占据的高度。
 * - 可滚动时：高度恒为分配的基础高度（内部滚动，不随条目增多而撑开）。
 * - 不可滚动时：随条目增多而撑开（>= 基础高度）。
 */
export function notesSectionHeight(opts: {
  tabCount: number;
  itemHeight: number;
  headerHeight: number;
  basisHeight: number;
  scrollable: boolean;
}): number {
  const content = opts.headerHeight + opts.tabCount * opts.itemHeight;
  return opts.scrollable ? opts.basisHeight : Math.max(opts.basisHeight, content);
}

/**
 * 判断文件树区域是否仍然可见（未被便签区域遮挡）。
 *
 * 当便签区域不可滚动且条目过多时，其高度会超过分配的基础高度，
 * 挤占文件树区域，导致文件树被挤出可视范围。
 */
export function isFileTreeVisible(opts: {
  tabCount: number;
  itemHeight: number;
  headerHeight: number;
  totalAvailableHeight: number;
  notesBasisHeight: number;
  dividerHeight?: number;
  treeMinHeight: number;
  notesScrollable: boolean;
}): boolean {
  const divider = opts.dividerHeight ?? 1;
  const notesHeight = notesSectionHeight({
    tabCount: opts.tabCount,
    itemHeight: opts.itemHeight,
    headerHeight: opts.headerHeight,
    basisHeight: opts.notesBasisHeight,
    scrollable: opts.notesScrollable,
  });
  const remaining = opts.totalAvailableHeight - notesHeight - divider;
  return remaining >= opts.treeMinHeight;
}
