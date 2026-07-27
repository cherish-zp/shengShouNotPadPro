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
  windowOpacity: 1,
};

export const useSettingsStore = create<SettingsStore>((set, get) => ({
  ...DEFAULTS,

  updateSetting: (key, value) => {
    set({ [key]: value } as any);
    if (key === "theme") {
      applyTheme(value as string);
    }
    if (key === "accentColor") {
      applyAccentColor(value as string);
    }
    if (key === "windowOpacity") {
      applyWindowOpacity(value as number);
    }
    get().saveSettings();
  },

  resetDefaults: () => {
    set(DEFAULTS);
    applyTheme(DEFAULTS.theme);
    applyAccentColor(DEFAULTS.accentColor);
    applyWindowOpacity(DEFAULTS.windowOpacity);
    get().saveSettings();
  },

  loadSettings: () => {
    try {
      // 确保 Tauri 原生窗口底层透明（只需一次），CSS opacity 才能透出桌面
      import("@tauri-apps/api/window").then(({ getCurrentWindow }) => {
        getCurrentWindow().setBackgroundColor("transparent");
      }).catch(() => {});

      const saved = localStorage.getItem("novaedit-settings");
      if (saved) {
        const parsed = JSON.parse(saved);
        set({ ...DEFAULTS, ...parsed });
        applyTheme(parsed.theme || DEFAULTS.theme);
        applyAccentColor(parsed.accentColor || DEFAULTS.accentColor);
        applyWindowOpacity(parsed.windowOpacity ?? DEFAULTS.windowOpacity);
      } else {
        applyAccentColor(DEFAULTS.accentColor);
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
        windowOpacity: state.windowOpacity,
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

// 把强调色写到 CSS 变量上，让全局 var(--accent) / var(--accent-hover) / var(--selection) 跟随
function applyAccentColor(color: string) {
  if (!color) return;
  const hex = normalizeHexColor(color);
  const hover = darkenHex(hex, 0.12);
  const { r, g, b } = hexToRgbValues(hex);
  const root = document.documentElement;
  root.style.setProperty("--accent", hex);
  root.style.setProperty("--accent-hover", hover);
  root.style.setProperty("--selection", `rgba(${r}, ${g}, ${b}, 0.16)`);

  // 亮白强调色：浅色背景下纯白会消失，给它加发光晕，让"自发光"感保留
  const isPureWhite = hex === "#ffffff";
  if (isPureWhite) {
    root.style.setProperty("--accent-glow", "0 0 8px rgba(255,255,255,0.95), 0 0 16px rgba(255,255,255,0.7)");
    // 浅色模式下被白色淹没，加深底色对比
    root.style.setProperty("--selection", "rgba(148, 163, 184, 0.35)");
  } else {
    root.style.setProperty("--accent-glow", "none");
  }
}

function normalizeHexColor(input: string): string {
  let s = input.trim().toLowerCase();
  if (s.startsWith("#")) s = s.slice(1);
  if (/^[0-9a-f]{3}$/.test(s)) s = s.split("").map((c) => c + c).join("");
  if (!/^[0-9a-f]{6}$/.test(s)) return "#2563eb";
  return "#" + s;
}

function hexToRgbValues(hex: string): { r: number; g: number; b: number } {
  const h = hex.slice(1);
  return {
    r: parseInt(h.slice(0, 2), 16),
    g: parseInt(h.slice(2, 4), 16),
    b: parseInt(h.slice(4, 6), 16),
  };
}

function darkenHex(hex: string, amount: number): string {
  const { r, g, b } = hexToRgbValues(hex);
  const dim = (v: number) => Math.max(0, Math.min(255, Math.round(v * (1 - amount))));
  const toHex = (v: number) => v.toString(16).padStart(2, "0");
  return "#" + toHex(dim(r)) + toHex(dim(g)) + toHex(dim(b));
}

function applyWindowOpacity(opacity: number) {
  document.body.style.opacity = String(opacity);
}
