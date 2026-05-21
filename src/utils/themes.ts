export interface ThemeColors {
  bgPrimary: string;
  bgSecondary: string;
  bgSurface: string;
  bgHover: string;
  textPrimary: string;
  textSecondary: string;
  accent: string;
  accentHover: string;
  border: string;
  success: string;
  error: string;
  warning: string;
}

export const DARK_THEME: ThemeColors = {
  bgPrimary: "#1e1e2e",
  bgSecondary: "#181825",
  bgSurface: "#313244",
  bgHover: "#45475a",
  textPrimary: "#cdd6f4",
  textSecondary: "#a6adc8",
  accent: "#89b4fa",
  accentHover: "#74c7ec",
  border: "#45475a",
  success: "#a6e3a1",
  error: "#f38ba8",
  warning: "#fab387",
};

export const LIGHT_THEME: ThemeColors = {
  bgPrimary: "#eff1f5",
  bgSecondary: "#e6e9ef",
  bgSurface: "#ccd0da",
  bgHover: "#bcc0cc",
  textPrimary: "#4c4f69",
  textSecondary: "#6c6f85",
  accent: "#1e66f5",
  accentHover: "#2a6ef5",
  border: "#bcc0cc",
  success: "#40a02b",
  error: "#d20f39",
  warning: "#df8e1d",
};

export const ACCENT_PRESETS = [
  { name: "蓝", color: "#89b4fa" },
  { name: "紫", color: "#cba6f7" },
  { name: "粉", color: "#f5c2e7" },
  { name: "红", color: "#f38ba8" },
  { name: "橙", color: "#fab387" },
  { name: "黄", color: "#f9e2af" },
  { name: "绿", color: "#a6e3a1" },
  { name: "青", color: "#89dceb" },
];
