import { create } from "zustand";
import type { Tab, TabColor } from "@/types";
import { moveTab, moveTabByOffset, normalizeTabOrder, pinTab, unpinTab } from "@/utils/tabOrder";
import { useEditorStore } from "./editorStore";

const STORAGE_KEY = "novaedit-tabs";
// 超过此长度的正文不写入 localStorage（quota 约 5-10MB，且每 300ms 序列化
// 几十 MB 会持续烧 CPU）：快照里省略正文并标 contentOmitted，重开时从磁盘回读
export const PERSIST_CONTENT_LIMIT = 1024 * 1024;

interface PersistedState {
  tabs: Tab[];
  activeTabId: string | null;
  nextTabNum: number;
}

// ---------------- 行数缓存（模块级 Map，按 tabId 存行数） ----------------
// 击键热路径上 StatusBar 等处若每次渲染都对全文 split("\n")，大文件开销明显；
// 这里在内容变更时算一次并缓存，组件通过 getTabLineCount(tabId) 读取。
const lineCounts = new Map<string, number>();

/** 计算文本行数（与 content.split("\n").length 语义一致，空串算 1 行） */
export function countLines(content: string): number {
  return content.split("\n").length;
}

/** 读取 tab 的缓存行数；tab 不存在返回 undefined（组件层有 ?? 兜底） */
export function getTabLineCount(tabId: string): number | undefined {
  const cached = lineCounts.get(tabId);
  if (cached !== undefined) return cached;
  // 兜底：缓存缺失但 tab 存在（如外部直接 setState 注入）时现算一次并回填
  const tab = useTabStore.getState().tabs.find((t) => t.id === tabId);
  if (!tab) return undefined;
  const n = countLines(tab.content);
  lineCounts.set(tabId, n);
  return n;
}

// ---------------- 持久化（300ms 防抖 + 变更去重） ----------------
let saveTimer: ReturnType<typeof setTimeout> | null = null;
// 内容发生变更的 tab id：updateContent/markDirty 加入，序列化落盘后清空，tab 关闭时移除
const dirtyTabs = new Set<string>();
// 非内容类变更（重命名/关闭/排序/markClean 等低频操作）也必须落盘，用独立标记保证不丢
let needsPersist = false;

function schedulePersist() {
  needsPersist = true;
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    saveTimer = null;
    // 无任何待写变更时跳过序列化与写盘
    if (!needsPersist && dirtyTabs.size === 0) return;
    needsPersist = false;
    dirtyTabs.clear();
    try {
      // 触发时刻读取最新状态，一次 burst 只串行化并写入一次。
      // 超限正文省略（v0.2.3 大文件支持）：防止 localStorage 超配额与巨量序列化
      const s = useTabStore.getState();
      const snapshot: PersistedState = {
        tabs: s.tabs.map((t) =>
          t.content.length > PERSIST_CONTENT_LIMIT ? { ...t, content: "", contentOmitted: true } : t
        ),
        activeTabId: s.activeTabId,
        nextTabNum: s.nextTabNum,
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
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

/** tab 被移除时清理其簿记（行数缓存 + 脏标记） */
function forgetTabBookkeeping(id: string) {
  dirtyTabs.delete(id);
  lineCounts.delete(id);
}

/**
 * 单 tab 不可变更新：找到目标 tab 应用 patch 并返回新数组。
 * id 不存在或 patch 与现值完全相同（浅比较）时返回原数组，
 * 调用方据此跳过订阅通知与持久化调度（击键热路径去重的关键）。
 */
function applyTabPatch(tabs: Tab[], id: string, patch: Partial<Tab>): Tab[] {
  const index = tabs.findIndex((t) => t.id === id);
  if (index === -1) return tabs;
  const target = tabs[index];
  let changed = false;
  for (const key of Object.keys(patch) as (keyof Tab)[]) {
    if (target[key] !== patch[key]) {
      changed = true;
      break;
    }
  }
  if (!changed) return tabs;
  const next = tabs.slice();
  next[index] = { ...target, ...patch };
  return next;
}

interface TabStore {
  tabs: Tab[];
  activeTabId: string | null;
  nextTabNum: number;
  hydrated: boolean;
  hydrate: () => void;
  addTab: (tab?: Partial<Tab> & { lineCount?: number }) => Tab;
  /** 大文件支持：把持久化时省略正文的文件标签从磁盘回读（内容直写内存，不入 localStorage） */
  reloadOmittedTabs: (deps: {
    readFile: (
      path: string,
      encoding: string
    ) => Promise<{ content: string; encoding: string; line_count: number }>;
  }) => Promise<void>;
  closeTab: (id: string) => void;
  /** 单 tab 不可变更新：内容无变化时为 no-op（不通知、不持久化） */
  updateTab: (id: string, patch: Partial<Tab>) => void;
  renameTab: (id: string, name: string) => void;
  setActiveTab: (id: string) => void;
  updateContent: (id: string, content: string, lineCount?: number) => void;
  markDirty: (id: string) => void;
  markClean: (id: string) => void;
  setTabColor: (id: string, color: TabColor | undefined) => void;
  setTabEncoding: (id: string, encoding: string) => void;
  setTabLanguage: (id: string, language: string) => void;
  setTabLineEnding: (id: string, lineEnding: "LF" | "CRLF") => void;
  setTabIndent: (id: string, size: number, type: "spaces" | "tab") => void;
  reorderTabs: (fromIndex: number, toIndex: number) => void;
  moveTabUp: (id: string) => void;
  moveTabDown: (id: string) => void;
  togglePinTab: (id: string) => void;
  closeOthers: (id: string) => void;
  closeAll: () => void;
  closeTabsToRight: (id: string) => void;
  duplicateTab: (id: string) => void;
  setFilePath: (id: string, path: string) => void;
}

// 包装 set，自动调度防抖持久化
function createPersistedSet(set: any, get: () => TabStore) {
  return (partial: any) => {
    set(partial);
    schedulePersist();
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
        // 整理为「置顶区在前」的不变量顺序，兼容旧数据与外部改动
        const tabs = normalizeTabOrder(stored.tabs);
        lineCounts.clear();
        for (const t of tabs) {
          lineCounts.set(t.id, countLines(typeof t.content === "string" ? t.content : ""));
        }
        set({
          tabs,
          activeTabId: stored.activeTabId,
          nextTabNum: stored.nextTabNum || 1,
          hydrated: true,
        });
      } else {
        set({ hydrated: true });
      }
    },

    // 大文件支持：内容超持久化上限的文件标签，正文在 localStorage 里被省略——
    // 重开应用后从这里按 filePath 从磁盘回读（异步火忘式，失败保持置脏）。
    // 注意：脏编辑（未保存修改）不参与回读，恢复的是磁盘上的内容。
    reloadOmittedTabs: async (deps) => {
      const { readFile } = deps;
      const omitted = get().tabs.filter((t) => t.contentOmitted && t.filePath);
      for (const tab of omitted) {
        try {
          const result = await readFile(tab.filePath as string, tab.encoding || "UTF-8");
          get().updateContent(tab.id, result.content, result.line_count);
          get().markClean(tab.id);
          get().updateTab(tab.id, { contentOmitted: false });
        } catch (err) {
          console.error("回读大文件失败，保持置脏以便重试:", tab.filePath, err);
          get().markDirty(tab.id);
        }
      }
    },

    addTab: (tabData) => {
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
      // 行数优先用调用方传入的（后端 line_count，O(1)），否则现算一次
      lineCounts.set(id, tabData?.lineCount ?? countLines(newTab.content));

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
      forgetTabBookkeeping(id);
      // 清理编辑器层的光标/滚动缓存，防止 Record 无界增长
      useEditorStore.getState().releaseTabState(id);

      // 关闭草稿时清理其贴图暂存目录（火忘式，失败不影响关tab）
      void import("@/utils/imageBridge")
        .then((m) => m.cleanupTabStaging(id))
        .catch(() => {});
    },

    updateTab: (id: string, patch: Partial<Tab>) => {
      const prev = get().tabs;
      const next = applyTabPatch(prev, id, patch);
      if (next === prev) return; // 无实际变化：跳过通知与持久化
      pset({ tabs: next });
    },

    renameTab: (id: string, name: string) => {
      get().updateTab(id, { name });
    },

    setActiveTab: (id: string) => {
      pset({ activeTabId: id });
    },

    updateContent: (id: string, content: string, lineCount?: number) => {
      const tab = get().tabs.find((t) => t.id === id);
      if (!tab) return;
      if (tab.content === content && tab.dirty) return; // 热路径去重：内容与脏标均未变
      // 行数优先取显式传入（CodeMirror doc.lines，O(1)）；
      // 未传时回退全文 split——大文件下调用方必须传，否则每击键都会 O(N)
      lineCounts.set(id, lineCount ?? countLines(content));
      dirtyTabs.add(id);
      get().updateTab(id, { content, dirty: true });
    },

    markDirty: (id: string) => {
      dirtyTabs.add(id);
      get().updateTab(id, { dirty: true });
    },

    markClean: (id: string) => {
      get().updateTab(id, { dirty: false }); // 变更经 pset 记为 needsPersist，防抖窗口内也能落盘
    },

    setTabColor: (id: string, color: TabColor | undefined) => {
      get().updateTab(id, { color });
    },

    setTabEncoding: (id: string, encoding: string) => {
      get().updateTab(id, { encoding });
    },

    setTabLanguage: (id: string, language: string) => {
      get().updateTab(id, { language });
    },

    setTabLineEnding: (id: string, lineEnding: "LF" | "CRLF") => {
      get().updateTab(id, { lineEnding });
    },

    setTabIndent: (id: string, size: number, type: "spaces" | "tab") => {
      get().updateTab(id, { indentSize: size, indentType: type });
    },

    reorderTabs: (fromIndex: number, toIndex: number) => {
      // moveTab 内含「禁止跨置顶区/普通区」的钳制
      pset({ tabs: moveTab(get().tabs, fromIndex, toIndex) });
    },

    moveTabUp: (id: string) => {
      pset({ tabs: moveTabByOffset(get().tabs, id, -1) });
    },

    moveTabDown: (id: string) => {
      pset({ tabs: moveTabByOffset(get().tabs, id, 1) });
    },

    togglePinTab: (id: string) => {
      const tabs = get().tabs;
      const next = tabs.find((t) => t.id === id)?.pinned
        ? unpinTab(tabs, id)
        : pinTab(tabs, id, Date.now());
      pset({ tabs: next });
    },

    closeOthers: (id: string) => {
      const removed = get().tabs.filter((t) => t.id !== id);
      pset({ tabs: get().tabs.filter((t) => t.id === id), activeTabId: id });
      for (const t of removed) {
        forgetTabBookkeeping(t.id);
        useEditorStore.getState().releaseTabState(t.id);
      }
    },

    closeAll: () => {
      const removed = get().tabs;
      pset({ tabs: [], activeTabId: null });
      dirtyTabs.clear();
      lineCounts.clear();
      for (const t of removed) {
        useEditorStore.getState().releaseTabState(t.id);
      }
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
      for (const t of state.tabs.slice(index + 1)) {
        forgetTabBookkeeping(t.id);
        useEditorStore.getState().releaseTabState(t.id);
      }
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
      const tab = get().tabs.find((t) => t.id === id);
      if (!tab) return;
      get().updateTab(id, { filePath: path, name: path.split("/").pop() || tab.name });
    },
  };
});
