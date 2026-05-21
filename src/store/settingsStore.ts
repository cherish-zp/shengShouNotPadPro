import { create } from "zustand";
import type { AppSettings } from "@/types";

interface SettingsStore extends AppSettings {
  updateSetting: <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => void;
  resetDefaults: () => void;
  loadSettings: () => void;
  saveSettings: () => void;
}

const DEFAULTS: AppSettings = {
  theme: "light",
  fontSize: 14,
  fontFamily: "'SF Mono', 'Fira Code', 'JetBrains Mono', Menlo, Monaco, Consolas, monospace",
  lineHeight: 1.6,
  tabSize: 2,
  wordWrap: false,
  autoSave: true,
  autoSaveInterval: 30000,
  showLineNumbers: true,
  accentColor: "#2563EB",
  sidebarWidth: 240,
};

export const useSettingsStore = create<SettingsStore>((set, get) => ({
  ...DEFAULTS,

  updateSetting: (key, value) => {
    set({ [key]: value } as any);
    if (key === "theme") {
      applyTheme(value as string);
    }
    get().saveSettings();
  },

  resetDefaults: () => {
    set(DEFAULTS);
    applyTheme(DEFAULTS.theme);
    get().saveSettings();
  },

  loadSettings: () => {
    try {
      const saved = localStorage.getItem("novaedit-settings");
      if (saved) {
        const parsed = JSON.parse(saved);
        set({ ...DEFAULTS, ...parsed });
        applyTheme(parsed.theme || DEFAULTS.theme);
      }
    } catch {
      // ignore
    }
  },

  saveSettings: () => {
    try {
      const state = get();
      const settings: AppSettings = {
        theme: state.theme,
        fontSize: state.fontSize,
        fontFamily: state.fontFamily,
        lineHeight: state.lineHeight,
        tabSize: state.tabSize,
        wordWrap: state.wordWrap,
        autoSave: state.autoSave,
        autoSaveInterval: state.autoSaveInterval,
        showLineNumbers: state.showLineNumbers,
        accentColor: state.accentColor,
        sidebarWidth: state.sidebarWidth,
      };
      localStorage.setItem("novaedit-settings", JSON.stringify(settings));
    } catch {
      // ignore
    }
  },
}));

// :root 默认就是冷白，只有深色模式才加 .dark
function applyTheme(theme: string) {
  const root = document.documentElement;
  root.classList.remove("dark");
  if (theme === "dark") {
    root.classList.add("dark");
  } else if (theme === "system") {
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    if (prefersDark) {
      root.classList.add("dark");
    }
  }
  // "light" 不需要加任何类，:root 就是冷白
}
