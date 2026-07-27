import type { Command } from "@/types";

export type { Command };

export function createCommands(actions: {
  newTab: () => void;
  save: () => void;
  saveAs: () => void;
  closeTab: () => void;
  find: () => void;
  replace: () => void;
  globalSearch: () => void;
  quickOpen: () => void;
  commandPalette: () => void;
  goToLine: () => void;
  toggleSidebar: () => void;
  toggleWordWrap: () => void;
  zoomIn: () => void;
  zoomOut: () => void;
  resetZoom: () => void;
  openSettings: () => void;
  openDiff: () => void;
  openTools: () => void;
  openPlugins: () => void;
  openFolder: () => void;
  zenMode: () => void;
}): Command[] {
  return [
    // File
    { id: "newTab", label: "新建便签", shortcut: "⌘N", action: actions.newTab, category: "文件", icon: "plus" },
    { id: "save", label: "保存", shortcut: "⌘S", action: actions.save, category: "文件", icon: "save" },
    { id: "saveAs", label: "另存为", shortcut: "⌘⇧S", action: actions.saveAs, category: "文件", icon: "save" },
    { id: "closeTab", label: "关闭标签", shortcut: "⌘W", action: actions.closeTab, category: "文件", icon: "x" },
    { id: "openFolder", label: "打开文件夹", shortcut: "", action: actions.openFolder, category: "文件", icon: "folder-open" },
    // Edit
    { id: "find", label: "查找", shortcut: "⌘F", action: actions.find, category: "编辑", icon: "search" },
    { id: "replace", label: "替换", shortcut: "⌘H", action: actions.replace, category: "编辑", icon: "replace" },
    { id: "globalSearch", label: "全局搜索", shortcut: "⌘⇧F", action: actions.globalSearch, category: "编辑", icon: "search" },
    // View
    { id: "quickOpen", label: "快速打开", shortcut: "⌘P", action: actions.quickOpen, category: "视图", icon: "file-search" },
    { id: "commandPalette", label: "命令面板", shortcut: "⌘⇧P", action: actions.commandPalette, category: "视图", icon: "terminal" },
    { id: "goToLine", label: "跳转到行", shortcut: "⌘G", action: actions.goToLine, category: "视图", icon: "arrow-down" },
    { id: "toggleSidebar", label: "切换侧边栏", shortcut: "⌘B", action: actions.toggleSidebar, category: "视图", icon: "panel-left" },
    { id: "toggleWordWrap", label: "切换自动换行", shortcut: "", action: actions.toggleWordWrap, category: "视图", icon: "wrap-text" },
    { id: "zenMode", label: "禅模式", shortcut: "", action: actions.zenMode, category: "视图", icon: "maximize" },
    { id: "zoomIn", label: "放大", shortcut: "⌘+", action: actions.zoomIn, category: "视图", icon: "zoom-in" },
    { id: "zoomOut", label: "缩小", shortcut: "⌘-", action: actions.zoomOut, category: "视图", icon: "zoom-out" },
    { id: "resetZoom", label: "重置缩放", shortcut: "⌘0", action: actions.resetZoom, category: "视图", icon: "maximize-2" },
    // Tools
    { id: "openDiff", label: "文件对比", shortcut: "", action: actions.openDiff, category: "工具", icon: "git-compare" },
    { id: "openTools", label: "工具箱", shortcut: "", action: actions.openTools, category: "工具", icon: "wrench" },
    { id: "openPlugins", label: "插件管理", shortcut: "", action: actions.openPlugins, category: "工具", icon: "puzzle" },
    { id: "openSettings", label: "设置", shortcut: "⌘,", action: actions.openSettings, category: "工具", icon: "settings" },
  ];
}
