export type SidebarView = "tabs" | "files" | "search" | "git" | "tools" | "plugins";

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
