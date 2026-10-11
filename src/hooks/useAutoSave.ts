import { useEffect, useCallback } from "react";
import { useTabStore } from "@/store/tabStore";
import type { Tab } from "@/types";
import { useSettingsStore } from "@/store/settingsStore";
import { useTauri } from "./useTauri";
import { extractStagingImageMoves, rewriteStagingLinks } from "@/utils/imagePaste";

/**
 * 保存单个便签：
 * 1. 若正文引用了暂存目录的图片（草稿贴图），先把图片迁移到 <文档目录>/assets/ 并重写链接；
 *    迁移失败不阻塞正文保存（保留暂存绝对路径，预览仍可显示）。
 * 2. 写入正文。
 * imageBridge 走动态 import：拆出主包 chunk，且只在真正保存时加载。
 */
async function persistTab(
  tab: Tab,
  writeFile: (path: string, content: string, encoding: string) => Promise<void>
): Promise<void> {
  if (!tab.filePath) return;
  let content = tab.content;
  try {
    const { getAssetsDir, getStagingRoot, ensureDir, moveFile } = await import(
      "@/utils/imageBridge"
    );
    const stagingRoot = await getStagingRoot();
    const assetsDir = getAssetsDir(tab.filePath);
    const moves = extractStagingImageMoves(content, stagingRoot, assetsDir);
    if (moves.length > 0) {
      await ensureDir(assetsDir);
      const succeeded: Array<{ link: string; newLink: string }> = [];
      for (const mv of moves) {
        try {
          await moveFile(mv.from, mv.to);
          succeeded.push({ link: mv.link, newLink: mv.newLink });
        } catch (err) {
          console.error("迁移暂存图片失败:", mv.from, err);
        }
      }
      if (succeeded.length > 0) {
        content = rewriteStagingLinks(content, succeeded);
      }
    }
  } catch (err) {
    // 暂存目录不可用（如非 Tauri 环境）时跳过迁移，正文照常保存
    console.warn("跳过图片迁移:", err);
  }
  await writeFile(tab.filePath, content, tab.encoding);
}

export function useAutoSave() {
  const autoSave = useSettingsStore((s) => s.autoSave);
  const autoSaveInterval = useSettingsStore((s) => s.autoSaveInterval);
  const markClean = useTabStore((s) => s.markClean);
  const setFilePath = useTabStore((s) => s.setFilePath);
  const { writeFile, saveDialog } = useTauri();

  // 自动保存：只针对已有文件路径的便签，没有路径的便签自动保留在本地存储（不弹窗）
  // tabs 在回调内 getState() 读取：本回调稳定，interval effect 不会因击键重建
  const autoSaveAll = useCallback(async () => {
    const { tabs } = useTabStore.getState();
    for (const tab of tabs) {
      if (tab.dirty && tab.filePath) {
        try {
          await persistTab(tab, writeFile);
          markClean(tab.id);
        } catch (err) {
          console.error("自动保存失败:", tab.filePath, err);
        }
      }
    }
  }, [writeFile, markClean]);

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
        await persistTab({ ...activeTab, filePath }, writeFile);
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
        // 先关联新路径再保存：暂存图片会迁移到新文档同目录的 assets/
        setFilePath(activeTab.id, chosen);
        const tab = useTabStore.getState().tabs.find((t) => t.id === activeTab.id);
        if (!tab) return;
        await persistTab({ ...tab, filePath: chosen }, writeFile);
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
