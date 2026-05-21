import { useEffect, useCallback } from "react";
import { useTabStore } from "@/store/tabStore";
import { useSettingsStore } from "@/store/settingsStore";
import { useTauri } from "./useTauri";

export function useAutoSave() {
  const { autoSave, autoSaveInterval } = useSettingsStore();
  const tabs = useTabStore((s) => s.tabs);
  const markClean = useTabStore((s) => s.markClean);
  const setFilePath = useTabStore((s) => s.setFilePath);
  const { writeFile, saveDialog } = useTauri();

  // 自动保存：只针对已有文件路径的便签，没有路径的便签自动保留在本地存储（不弹窗）
  const autoSaveAll = useCallback(async () => {
    for (const tab of tabs) {
      if (tab.dirty && tab.filePath) {
        try {
          await writeFile(tab.filePath, tab.content, tab.encoding);
          markClean(tab.id);
        } catch (err) {
          console.error("自动保存失败:", tab.filePath, err);
        }
      }
    }
  }, [tabs, writeFile, markClean]);

  useEffect(() => {
    if (!autoSave) return;
    const interval = setInterval(autoSaveAll, autoSaveInterval);
    return () => clearInterval(interval);
  }, [autoSave, autoSaveInterval, autoSaveAll]);

  // Cmd+S 手动保存：未关联文件时弹保存对话框，已关联直接保存
  useEffect(() => {
    const handleSave = async () => {
      const activeTabId = useTabStore.getState().activeTabId;
      const activeTab = useTabStore.getState().tabs.find((t) => t.id === activeTabId);
      if (!activeTab) return;

      try {
        let filePath = activeTab.filePath;
        if (!filePath) {
          // 用户主动按 Cmd+S 才会弹保存对话框
          const chosen = await saveDialog(activeTab.name || "未命名.txt");
          if (!chosen) return;
          filePath = chosen;
          setFilePath(activeTab.id, filePath);
        }
        await writeFile(filePath, activeTab.content, activeTab.encoding);
        markClean(activeTab.id);
      } catch (err) {
        console.error("保存失败:", err);
      }
    };

    // Cmd+Shift+S: 另存为，始终弹对话框
    const handleSaveAs = async () => {
      const activeTabId = useTabStore.getState().activeTabId;
      const activeTab = useTabStore.getState().tabs.find((t) => t.id === activeTabId);
      if (!activeTab) return;

      try {
        const chosen = await saveDialog(activeTab.name || "未命名.txt");
        if (!chosen) return;
        await writeFile(chosen, activeTab.content, activeTab.encoding);
        setFilePath(activeTab.id, chosen);
        markClean(activeTab.id);
      } catch (err) {
        console.error("另存为失败:", err);
      }
    };

    window.addEventListener("novaedit:save", handleSave);
    window.addEventListener("novaedit:saveAs", handleSaveAs);
    return () => {
      window.removeEventListener("novaedit:save", handleSave);
      window.removeEventListener("novaedit:saveAs", handleSaveAs);
    };
  }, [writeFile, saveDialog, setFilePath, markClean]);
}
