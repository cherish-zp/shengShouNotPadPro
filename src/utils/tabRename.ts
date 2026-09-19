/**
 * 便签重命名编排：关联了磁盘文件的便签改名时，同步重命名磁盘文件，
 * 并更新所有引用旧路径的便签（可能有多个便签打开同一个文件）。
 * 草稿便签（无 filePath）退化为仅改显示名。
 * 失败时抛错（磁盘文件保持原名），由调用方提示。
 */
import type { Tab } from "@/types";
import { useTabStore } from "@/store/tabStore";
import { buildRenameTarget } from "@/components/FileTree/fileTreeUtils";

/** 文件树监听此事件刷新对应目录（detail.dir），避免树中显示旧文件名 */
export const FILE_RENAMED_EVENT = "novaedit:file-renamed";

export async function renameTabPersisted(tab: Tab, newName: string): Promise<void> {
  const trimmed = newName.trim();
  const target = buildRenameTarget(tab.filePath, trimmed);
  if (!target) {
    // 草稿便签或名称无变化：仅更新显示名
    useTabStore.getState().renameTab(tab.id, trimmed);
    return;
  }

  const { invoke } = await import("@tauri-apps/api/core");
  // 先改磁盘，成功后才更新 store，保证两边一致
  await invoke("rename_file", { oldPath: tab.filePath, newPath: target.newPath });

  const { setFilePath, tabs } = useTabStore.getState();
  tabs
    .filter((t) => t.filePath === tab.filePath)
    .forEach((t) => setFilePath(t.id, target.newPath));

  window.dispatchEvent(new CustomEvent(FILE_RENAMED_EVENT, { detail: { dir: target.dir } }));
}
