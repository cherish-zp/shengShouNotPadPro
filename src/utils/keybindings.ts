export interface KeyBinding {
  command: string;
  keys: string;
  label: string;
}

export const DEFAULT_KEYBINDINGS: KeyBinding[] = [
  { command: "newTab", keys: "Meta+n", label: "新建便签" },
  { command: "save", keys: "Meta+s", label: "保存" },
  { command: "saveAs", keys: "Meta+Shift+s", label: "另存为" },
  { command: "closeTab", keys: "Meta+w", label: "关闭便签" },
  { command: "undo", keys: "Meta+z", label: "撤销" },
  { command: "redo", keys: "Meta+Shift+z", label: "重做" },
  { command: "find", keys: "Meta+f", label: "查找" },
  { command: "replace", keys: "Meta+h", label: "替换" },
  { command: "globalSearch", keys: "Meta+Shift+f", label: "全局搜索" },
  { command: "quickOpen", keys: "Meta+p", label: "快速打开" },
  { command: "commandPalette", keys: "Meta+Shift+p", label: "命令面板" },
  { command: "goToLine", keys: "Meta+g", label: "跳转到行" },
  { command: "toggleSidebar", keys: "Meta+b", label: "切换侧边栏" },
  { command: "zoomIn", keys: "Meta+=", label: "放大" },
  { command: "zoomOut", keys: "Meta+-", label: "缩小" },
  { command: "resetZoom", keys: "Meta+0", label: "重置缩放" },
  { command: "duplicateLine", keys: "Meta+d", label: "复制行" },
  { command: "deleteLine", keys: "Meta+Shift+k", label: "删除行" },
  { command: "moveLineUp", keys: "Alt+ArrowUp", label: "上移行" },
  { command: "moveLineDown", keys: "Alt+ArrowDown", label: "下移行" },
  { command: "toggleComment", keys: "Meta+/", label: "切换注释" },
];

export function formatShortcut(keys: string): string {
  return keys
    .replace("Meta+", "⌘")
    .replace("Ctrl+", "⌃")
    .replace("Alt+", "⌥")
    .replace("Shift+", "⇧")
    .replace("ArrowUp", "↑")
    .replace("ArrowDown", "↓")
    .replace("ArrowLeft", "←")
    .replace("ArrowRight", "→");
}
