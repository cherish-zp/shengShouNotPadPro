import { create } from "zustand";
import type { EditorView } from "@codemirror/view";

const PERSIST_KEY = "novaedit-editor-ui";

interface PersistedUI {
  sidebarVisible?: boolean;
  markdownPreviewVisible?: boolean;
  activeSidebarView?: EditorStore["activeSidebarView"];
}

function loadPersisted(): PersistedUI {
  try {
    const raw = localStorage.getItem(PERSIST_KEY);
    return raw ? (JSON.parse(raw) as PersistedUI) : {};
  } catch {
    return {};
  }
}

function persist(state: PersistedUI) {
  try {
    const merged = { ...loadPersisted(), ...state };
    localStorage.setItem(PERSIST_KEY, JSON.stringify(merged));
  } catch {
    // ignore
  }
}

const persisted = loadPersisted();

interface CursorPosition {
  line: number;
  column: number;
}

interface EditorStore {
  cursorPositions: Record<string, CursorPosition>;
  scrollPositions: Record<string, number>;
  sidebarVisible: boolean;
  settingsOpen: boolean;
  commandPaletteOpen: boolean;
  quickOpenOpen: boolean;
  goToLineOpen: boolean;
  diffViewOpen: boolean;
  toolsPanelOpen: boolean;
  activeSidebarView: "tabs" | "files" | "search" | "git" | "tools" | "plugins";
  editorView: EditorView | null;  // 当前活跃的 CodeMirror 视图
  setEditorView: (view: EditorView | null) => void;
  updateCursor: (tabId: string, pos: CursorPosition) => void;
  updateScroll: (tabId: string, pos: number) => void;
  toggleSidebar: () => void;
  setSettingsOpen: (open: boolean) => void;
  setCommandPaletteOpen: (open: boolean) => void;
  setQuickOpenOpen: (open: boolean) => void;
  setGoToLineOpen: (open: boolean) => void;
  setDiffViewOpen: (open: boolean) => void;
  setToolsPanelOpen: (open: boolean) => void;
  setActiveSidebarView: (view: EditorStore["activeSidebarView"]) => void;
  openFolder: string | null;
  setOpenFolder: (path: string | null) => void;
  markdownPreviewVisible: boolean;
  toggleMarkdownPreview: () => void;
}

export const useEditorStore = create<EditorStore>((set) => ({
  cursorPositions: {},
  scrollPositions: {},
  sidebarVisible: persisted.sidebarVisible ?? true,
  settingsOpen: false,
  commandPaletteOpen: false,
  quickOpenOpen: false,
  goToLineOpen: false,
  diffViewOpen: false,
  toolsPanelOpen: false,
  activeSidebarView: persisted.activeSidebarView ?? "tabs",
  openFolder: null,
  editorView: null,
  markdownPreviewVisible: persisted.markdownPreviewVisible ?? false,

  toggleMarkdownPreview: () =>
    set((s) => {
      const next = !s.markdownPreviewVisible;
      persist({ markdownPreviewVisible: next });
      return { markdownPreviewVisible: next };
    }),

  setEditorView: (view) => set({ editorView: view }),

  updateCursor: (tabId, pos) =>
    set((s) => ({
      cursorPositions: { ...s.cursorPositions, [tabId]: pos },
    })),

  updateScroll: (tabId, pos) =>
    set((s) => ({
      scrollPositions: { ...s.scrollPositions, [tabId]: pos },
    })),

  toggleSidebar: () =>
    set((s) => {
      const next = !s.sidebarVisible;
      persist({ sidebarVisible: next });
      return { sidebarVisible: next };
    }),
  setSettingsOpen: (open) => set({ settingsOpen: open }),
  setCommandPaletteOpen: (open) => set({ commandPaletteOpen: open }),
  setQuickOpenOpen: (open) => set({ quickOpenOpen: open }),
  setGoToLineOpen: (open) => set({ goToLineOpen: open }),
  setDiffViewOpen: (open) => set({ diffViewOpen: open }),
  setToolsPanelOpen: (open) => set({ toolsPanelOpen: open }),
  setActiveSidebarView: (view) => {
    persist({ activeSidebarView: view });
    set({ activeSidebarView: view });
  },
  setOpenFolder: (path) => set({ openFolder: path }),
}));
