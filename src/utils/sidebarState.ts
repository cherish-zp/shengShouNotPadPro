export type SidebarView = "tabs" | "files" | "search" | "git" | "tools" | "plugins";

/** 侧边栏图标栏视图 id（不含底部设置按钮），自上而下 */
export type RailViewId = "tabs" | "files" | "search" | "tools" | "plugins";

/** 图标栏展示顺序：便签 → 文件 → 搜索 → 工具 → 插件 */
export const RAIL_VIEWS: Array<{ id: RailViewId; label: string }> = [
  { id: "tabs", label: "便签" },
  { id: "files", label: "文件" },
  { id: "search", label: "搜索" },
  { id: "tools", label: "工具" },
  { id: "plugins", label: "插件" },
];

/** 内容面板 id：便签与文件是两个独立面板，不再叠加展示 */
export type PanelView = "notes" | "tree" | "search" | "tools" | "plugins";

/**
 * 视图 → 内容面板映射。
 * 便签（tabs）只渲染便签列表；文件（files）只渲染文件树；
 * git 暂无独立面板，回落到便签。
 */
export function resolvePanelView(view: SidebarView): PanelView {
  switch (view) {
    case "tabs":
    case "git":
      return "notes";
    case "files":
      return "tree";
    case "search":
      return "search";
    case "tools":
      return "tools";
    case "plugins":
      return "plugins";
  }
}

export interface SidebarSelection {
  sidebarVisible: boolean;
  activeSidebarView: SidebarView;
}

/**
 * 选择某个侧边栏视图时，始终展开侧边栏内容面板并切换到该视图。
 *
 * 供固定显示的图标栏使用：即使内容面板此前被折叠（sidebarVisible=false），
 * 点击图标也会重新展开面板并切到对应视图，避免侧边栏「丢失」后无法找回。
 */
export function selectSidebarView(view: SidebarView): SidebarSelection {
  return { sidebarVisible: true, activeSidebarView: view };
}
