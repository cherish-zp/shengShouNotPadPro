import { useEffect } from "react";
import { useTabStore } from "@/store/tabStore";
import { useEditorStore } from "@/store/editorStore";
import { useSearchStore } from "@/store/searchStore";
import { useSettingsStore } from "@/store/settingsStore";

const MIN_FONT_SIZE = 8;
const MAX_FONT_SIZE = 48;

export function useKeyboard() {
  useEffect(() => {
    // handler 内统一用 getState() 取最新状态：监听器只挂一次，
    // 不随 store 变化重挂（此前整店订阅导致每次击键都重装监听器）
    const handleKeyDown = (e: KeyboardEvent) => {
      const isMeta = e.metaKey || e.ctrlKey;
      const tabStore = useTabStore.getState();
      const editorStore = useEditorStore.getState();
      const searchStore = useSearchStore.getState();
      const settingsStore = useSettingsStore.getState();

      // Cmd+N - New tab
      if (isMeta && e.key === "n" && !e.shiftKey) {
        e.preventDefault();
        tabStore.addTab();
        return;
      }

      // Cmd+S - Save
      if (isMeta && e.key === "s" && !e.shiftKey) {
        e.preventDefault();
        window.dispatchEvent(new CustomEvent("novaedit:save"));
        return;
      }

      // Cmd+Shift+S - Save As
      if (isMeta && e.key === "s" && e.shiftKey) {
        e.preventDefault();
        window.dispatchEvent(new CustomEvent("novaedit:saveAs"));
        return;
      }

      // Cmd+W - Close tab
      if (isMeta && e.key === "w") {
        e.preventDefault();
        const { activeTabId } = tabStore;
        if (activeTabId) tabStore.closeTab(activeTabId);
        return;
      }

      // Cmd+F - Find
      if (isMeta && e.key === "f" && !e.shiftKey) {
        e.preventDefault();
        searchStore.openSearch("find");
        return;
      }

      // Cmd+H - Replace
      if (isMeta && e.key === "h") {
        e.preventDefault();
        searchStore.openSearch("replace");
        return;
      }

      // Cmd+Shift+F - Global search
      if (isMeta && e.key === "f" && e.shiftKey) {
        e.preventDefault();
        searchStore.openSearch("global");
        return;
      }

      // Cmd+P - Quick open
      if (isMeta && e.key === "p" && !e.shiftKey) {
        e.preventDefault();
        editorStore.setQuickOpenOpen(!editorStore.quickOpenOpen);
        return;
      }

      // Cmd+Shift+P - Command palette
      if (isMeta && e.key === "p" && e.shiftKey) {
        e.preventDefault();
        editorStore.setCommandPaletteOpen(!editorStore.commandPaletteOpen);
        return;
      }

      // Cmd+G - Go to line
      if (isMeta && e.key === "g") {
        e.preventDefault();
        editorStore.setGoToLineOpen(!editorStore.goToLineOpen);
        return;
      }

      // Cmd+B - Toggle sidebar
      if (isMeta && e.key === "b") {
        e.preventDefault();
        editorStore.toggleSidebar();
        return;
      }

      // Cmd+= - Zoom in
      if (isMeta && (e.key === "=" || e.key === "+")) {
        e.preventDefault();
        settingsStore.updateSetting("fontSize", Math.min(settingsStore.fontSize + 1, MAX_FONT_SIZE));
        return;
      }

      // Cmd+- - Zoom out
      if (isMeta && e.key === "-") {
        e.preventDefault();
        settingsStore.updateSetting("fontSize", Math.max(settingsStore.fontSize - 1, MIN_FONT_SIZE));
        return;
      }

      // Cmd+0 - Reset zoom
      if (isMeta && e.key === "0") {
        e.preventDefault();
        settingsStore.updateSetting("fontSize", 14);
        return;
      }

      // Escape - Close modals
      if (e.key === "Escape") {
        if (editorStore.commandPaletteOpen) editorStore.setCommandPaletteOpen(false);
        if (editorStore.quickOpenOpen) editorStore.setQuickOpenOpen(false);
        if (editorStore.goToLineOpen) editorStore.setGoToLineOpen(false);
        if (editorStore.settingsOpen) editorStore.setSettingsOpen(false);
        if (searchStore.isOpen) searchStore.closeSearch();
        return;
      }
    };

    // 鼠标滚轮缩放字体 (Ctrl/Cmd + 滚轮)
    const handleWheel = (e: WheelEvent) => {
      if (e.metaKey || e.ctrlKey) {
        e.preventDefault();
        const settingsStore = useSettingsStore.getState();
        const currentSize = settingsStore.fontSize;
        if (e.deltaY < 0) {
          // 向上滚 = 放大
          settingsStore.updateSetting("fontSize", Math.min(currentSize + 1, MAX_FONT_SIZE));
        } else {
          // 向下滚 = 缩小
          settingsStore.updateSetting("fontSize", Math.max(currentSize - 1, MIN_FONT_SIZE));
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("wheel", handleWheel, { passive: false });
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("wheel", handleWheel);
    };
    // getState() 在 handler 内取值，依赖数组保持为空（监听器终身只挂一次）
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}

export { MIN_FONT_SIZE, MAX_FONT_SIZE };
