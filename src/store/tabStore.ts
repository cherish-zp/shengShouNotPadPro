import { create } from "zustand";
import type { Tab, TabColor } from "@/types";

const STORAGE_KEY = "novaedit-tabs";

interface PersistedState {
  tabs: Tab[];
  activeTabId: string | null;
  nextTabNum: number;
}

// 防抖保存
let saveTimer: ReturnType<typeof setTimeout> | null = null;
function debouncedSave(state: PersistedState) {
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (e) {
      console.error("保存便签失败:", e);
    }
  }, 300);
}

function loadFromStorage(): PersistedState | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

interface TabStore {
  tabs: Tab[];
  activeTabId: string | null;
  nextTabNum: number;
  hydrated: boolean;
  hydrate: () => void;
  addTab: (tab?: Partial<Tab>) => Tab;
  closeTab: (id: string) => void;
  renameTab: (id: string, name: string) => void;
  setActiveTab: (id: string) => void;
  updateContent: (id: string, content: string) => void;
  markDirty: (id: string) => void;
  markClean: (id: string) => void;
  setTabColor: (id: string, color: TabColor | undefined) => void;
  setTabEncoding: (id: string, encoding: string) => void;
  setTabLanguage: (id: string, language: string) => void;
  setTabLineEnding: (id: string, lineEnding: "LF" | "CRLF") => void;
  setTabIndent: (id: string, size: number, type: "spaces" | "tab") => void;
  reorderTabs: (fromIndex: number, toIndex: number) => void;
  closeOthers: (id: string) => void;
  closeAll: () => void;
  closeTabsToRight: (id: string) => void;
  duplicateTab: (id: string) => void;
  setFilePath: (id: string, path: string) => void;
}

// 包装 set，自动保存到 localStorage
function createPersistedSet(set: any, get: () => TabStore) {
  return (partial: any) => {
    set(partial);
    const state = get();
    debouncedSave({
      tabs: state.tabs,
      activeTabId: state.activeTabId,
      nextTabNum: state.nextTabNum,
    });
  };
}

export const useTabStore = create<TabStore>((set, get) => {
  const pset = createPersistedSet(set, get);

  return {
    tabs: [],
    activeTabId: null,
    nextTabNum: 1,
    hydrated: false,

    // 从 localStorage 恢复
    hydrate: () => {
      const stored = loadFromStorage();
      if (stored && stored.tabs && stored.tabs.length > 0) {
        set({
          tabs: stored.tabs,
          activeTabId: stored.activeTabId,
          nextTabNum: stored.nextTabNum || 1,
          hydrated: true,
        });
      } else {
        set({ hydrated: true });
      }
    },

    addTab: (tabData?: Partial<Tab>) => {
      const state = get();
      const id = crypto.randomUUID();
      const num = state.nextTabNum;
      const kind = tabData?.kind ?? "file";
      const defaultName = `新建${num}`;
      const newTab: Tab = {
        id,
        name: tabData?.name ?? defaultName,
        kind,
        filePath: tabData?.filePath,
        content: tabData?.content ?? "",
        language: tabData?.language ?? "plaintext",
        encoding: tabData?.encoding ?? "UTF-8",
        lineEnding: tabData?.lineEnding ?? "LF",
        indentSize: tabData?.indentSize ?? 2,
        indentType: tabData?.indentType ?? "spaces",
        dirty: false,
        color: tabData?.color,
        createdAt: Date.now(),
      };

      pset({
        tabs: [...state.tabs, newTab],
        activeTabId: id,
        nextTabNum: num + 1,
      });
      return newTab;
    },

    closeTab: (id: string) => {
      const state = get();
      const index = state.tabs.findIndex((t) => t.id === id);
      if (index === -1) return;

      const newTabs = state.tabs.filter((t) => t.id !== id);
      let newActiveId = state.activeTabId;

      if (state.activeTabId === id) {
        if (newTabs.length === 0) {
          newActiveId = null;
        } else if (index >= newTabs.length) {
          newActiveId = newTabs[newTabs.length - 1].id;
        } else {
          newActiveId = newTabs[index].id;
        }
      }

      pset({ tabs: newTabs, activeTabId: newActiveId });
    },

    renameTab: (id: string, name: string) => {
      pset({
        tabs: get().tabs.map((t) => (t.id === id ? { ...t, name } : t)),
      });
    },

    setActiveTab: (id: string) => {
      pset({ activeTabId: id });
    },

    updateContent: (id: string, content: string) => {
      pset({
        tabs: get().tabs.map((t) =>
          t.id === id ? { ...t, content, dirty: true } : t
        ),
      });
    },

    markDirty: (id: string) => {
      pset({
        tabs: get().tabs.map((t) => (t.id === id ? { ...t, dirty: true } : t)),
      });
    },

    markClean: (id: string) => {
      pset({
        tabs: get().tabs.map((t) => (t.id === id ? { ...t, dirty: false } : t)),
      });
    },

    setTabColor: (id: string, color: TabColor | undefined) => {
      pset({
        tabs: get().tabs.map((t) => (t.id === id ? { ...t, color } : t)),
      });
    },

    setTabEncoding: (id: string, encoding: string) => {
      pset({
        tabs: get().tabs.map((t) => (t.id === id ? { ...t, encoding } : t)),
      });
    },

    setTabLanguage: (id: string, language: string) => {
      pset({
        tabs: get().tabs.map((t) => (t.id === id ? { ...t, language } : t)),
      });
    },

    setTabLineEnding: (id: string, lineEnding: "LF" | "CRLF") => {
      pset({
        tabs: get().tabs.map((t) =>
          t.id === id ? { ...t, lineEnding } : t
        ),
      });
    },

    setTabIndent: (id: string, size: number, type: "spaces" | "tab") => {
      pset({
        tabs: get().tabs.map((t) =>
          t.id === id ? { ...t, indentSize: size, indentType: type } : t
        ),
      });
    },

    reorderTabs: (fromIndex: number, toIndex: number) => {
      const newTabs = [...get().tabs];
      const [removed] = newTabs.splice(fromIndex, 1);
      newTabs.splice(toIndex, 0, removed);
      pset({ tabs: newTabs });
    },

    closeOthers: (id: string) => {
      pset({
        tabs: get().tabs.filter((t) => t.id === id),
        activeTabId: id,
      });
    },

    closeAll: () => {
      pset({ tabs: [], activeTabId: null });
    },

    closeTabsToRight: (id: string) => {
      const state = get();
      const index = state.tabs.findIndex((t) => t.id === id);
      if (index === -1) return;
      const newTabs = state.tabs.slice(0, index + 1);
      const activeId = state.activeTabId && newTabs.find(t => t.id === state.activeTabId)
        ? state.activeTabId
        : id;
      pset({ tabs: newTabs, activeTabId: activeId });
    },

    duplicateTab: (id: string) => {
      const tab = get().tabs.find((t) => t.id === id);
      if (!tab) return;
      get().addTab({
        name: `${tab.name} (副本)`,
        content: tab.content,
        language: tab.language,
        encoding: tab.encoding,
        lineEnding: tab.lineEnding,
        indentSize: tab.indentSize,
        indentType: tab.indentType,
      });
    },

    setFilePath: (id: string, path: string) => {
      pset({
        tabs: get().tabs.map((t) =>
          t.id === id
            ? { ...t, filePath: path, name: path.split("/").pop() || t.name }
            : t
        ),
      });
    },
  };
});
