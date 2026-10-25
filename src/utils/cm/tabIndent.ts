import type { EditorView } from "@codemirror/view";
import { indentMore } from "@codemirror/commands";
import { useSettingsStore } from "@/store/settingsStore";

// Tab 键行为（v0.2.2 用户反馈修复）：
//   无选区 → 在光标处插入缩进空格（此前 indentWithTab 会把整行带着右移）；
//   有选区 → 缩进所选行（保持多行缩进习惯，Shift+Tab 反向缩进不变）。

/** 生成 Tab 插入的缩进空格；非法 tabSize 回落到默认 2 */
export function tabIndentText(tabSize: number): string {
  if (!Number.isInteger(tabSize) || tabSize < 1) return "  ";
  return " ".repeat(tabSize);
}

/** 由选区状态决定 Tab 行为：全部为空光标 → insert；任一非空 → indent */
export function tabActionFor(ranges: readonly { empty: boolean }[]): "insert" | "indent" {
  return ranges.some((r) => !r.empty) ? "indent" : "insert";
}

/** CodeMirror Tab 命令：见文件头注释 */
export function smartTab(view: EditorView): boolean {
  if (tabActionFor(view.state.selection.ranges) === "indent") {
    return indentMore(view);
  }
  const tabSize = useSettingsStore.getState().tabSize;
  view.dispatch(
    view.state.replaceSelection(tabIndentText(tabSize))
  );
  return true;
}
