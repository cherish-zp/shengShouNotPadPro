import { create } from "zustand";
import type { AppSettings } from "@/types";
import { darkenHex, hexToRgb, normalizeHex } from "@/utils/color";

const SETTINGS_KEY = "novaedit-settings";

interface SettingsStore extends AppSettings {
  updateSetting: <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => void;
  resetDefaults: () => void;
  loadSettings: () => void;
  saveSettings: () => void;
}

const DEFAULTS: AppSettings = {
  theme: "light",
  skin: "default",
  backgroundImage: "",
  backgroundDim: 0.45,
  backgroundBlur: 0,
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

// 设置写盘防抖（500ms）：updateSetting 在滑杆拖动时每 tick 触发一次，
// 全部同步写 localStorage 会造成高频串行化；合并为停止调整后写一次。
// saveSettings 本身保持同步写（resetDefaults / 退出冲写 / 外部直调不受影响）。
let settingsSaveTimer: ReturnType<typeof setTimeout> | null = null;

function scheduleSettingsSave() {
  if (settingsSaveTimer) clearTimeout(settingsSaveTimer);
  settingsSaveTimer = setTimeout(() => {
    settingsSaveTimer = null;
    useSettingsStore.getState().saveSettings();
  }, 500);
}

function cancelScheduledSettingsSave() {
  if (settingsSaveTimer) {
    clearTimeout(settingsSaveTimer);
    settingsSaveTimer = null;
  }
}

export const useSettingsStore = create<SettingsStore>((set, get) => ({
  ...DEFAULTS,

  updateSetting: (key, value) => {
    set({ [key]: value } as any);
    if (key === "theme") {
      applyTheme(value as string);
    }
    if (key === "skin") {
      applySkin(value as string, get().accentColor);
    }
    if (key === "backgroundImage") {
      applyBackgroundImage(value as string);
    }
    if (key === "accentColor") {
      applyAccentColor(value as string);
    }
    if (key === "windowOpacity") {
      applyWindowOpacity(value as number);
    }
    // 写盘走防抖：滑杆/选色器拖动每 tick 都会进来，同步写 localStorage 太频繁
    scheduleSettingsSave();
  },

  resetDefaults: () => {
    // 取消未触发的防抖写入后同步落盘，保持 reset 即时生效的原行为
    cancelScheduledSettingsSave();
    set(DEFAULTS);
    applyTheme(DEFAULTS.theme);
    applySkin(DEFAULTS.skin, DEFAULTS.accentColor);
    applyBackgroundImage(DEFAULTS.backgroundImage);
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

      const saved = localStorage.getItem(SETTINGS_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        set({ ...DEFAULTS, ...parsed });
        applyTheme(parsed.theme || DEFAULTS.theme);
        applySkin(parsed.skin || DEFAULTS.skin, parsed.accentColor || DEFAULTS.accentColor);
        applyBackgroundImage(parsed.backgroundImage || DEFAULTS.backgroundImage);
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
        skin: state.skin,
        backgroundImage: state.backgroundImage,
        backgroundDim: state.backgroundDim,
        backgroundBlur: state.backgroundBlur,
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
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    } catch {
      // ignore
    }
  },
}));

// 防抖窗口内退出（关闭窗口/刷新页面）时冲写一次，避免丢掉最后一次调整
if (typeof window !== "undefined") {
  window.addEventListener("pagehide", () => {
    if (settingsSaveTimer) {
      cancelScheduledSettingsSave();
      useSettingsStore.getState().saveSettings();
    }
  });
}

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
  const hex = normalizeHex(color, "#2563eb");
  const hover = darkenHex(hex, 0.12, "#2563eb");
  const { r, g, b } = hexToRgb(hex, "#2563eb");
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

// 皮肤：在 documentElement 上挂 class（与 .dark 同机制）；少女粉皮肤接管强调色，
// 清掉 applyAccentColor 写的内联变量，让 .skin-pink 的 token 生效；切回默认时恢复用户强调色
function applySkin(skin: string, accentColor: string) {
  const root = document.documentElement;
  root.classList.toggle("skin-pink", skin === "pink");
  if (skin === "pink") {
    root.style.removeProperty("--accent");
    root.style.removeProperty("--accent-hover");
    root.style.removeProperty("--selection");
    root.style.removeProperty("--accent-glow");
  } else {
    applyAccentColor(accentColor);
  }
}

// 背景图：挂 class 让 html/body/#root 透出 BackgroundLayer（CSS 规则见 index.css）
function applyBackgroundImage(path: string) {
  document.documentElement.classList.toggle("has-bg-image", !!path);
}

function applyWindowOpacity(opacity: number) {
  document.body.style.opacity = String(opacity);
}
