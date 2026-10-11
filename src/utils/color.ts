// 颜色工具：settingsStore（强调色）与 ToolsPanel（颜色工具卡）的共享实现。
// 此前两处各持一份同形逻辑（且无测试），按编码规范收敛到 utils。

/** 把任何输入（#fff / fff / #ffffff / ffffff）规范化为 #rrggbb 小写；非法输入返回 fallback */
export function normalizeHex(input: string, fallback = "#000000"): string {
  let s = (input ?? "").trim().toLowerCase();
  if (s.startsWith("#")) s = s.slice(1);
  if (/^[0-9a-f]{3}$/.test(s)) {
    s = s.split("").map((c) => c + c).join("");
  }
  if (!/^[0-9a-f]{6}$/.test(s)) return fallback;
  return "#" + s;
}

/** #rrggbb → { r, g, b }（内部先规范化，非法输入按 fallback 解析） */
export function hexToRgb(hex: string, fallback = "#000000"): { r: number; g: number; b: number } {
  const h = normalizeHex(hex, fallback).slice(1);
  return {
    r: parseInt(h.slice(0, 2), 16),
    g: parseInt(h.slice(2, 4), 16),
    b: parseInt(h.slice(4, 6), 16),
  };
}

/** 按比例压暗颜色（amount 0-1，结果各通道钳制到 0-255） */
export function darkenHex(hex: string, amount: number, fallback = "#000000"): string {
  const { r, g, b } = hexToRgb(hex, fallback);
  const dim = (v: number) => Math.max(0, Math.min(255, Math.round(v * (1 - amount))));
  const toHex = (v: number) => v.toString(16).padStart(2, "0");
  return "#" + toHex(dim(r)) + toHex(dim(g)) + toHex(dim(b));
}

/** rgb(0-255) → hsl（h 0-360，s/l 0-100） */
export function rgbToHsl(r: number, g: number, b: number): { h: number; s: number; l: number } {
  const rn = r / 255, gn = g / 255, bn = b / 255;
  const max = Math.max(rn, gn, bn), min = Math.min(rn, gn, bn);
  let h = 0, s = 0;
  const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case rn: h = (gn - bn) / d + (gn < bn ? 6 : 0); break;
      case gn: h = (bn - rn) / d + 2; break;
      case bn: h = (rn - gn) / d + 4; break;
    }
    h /= 6;
  }
  return { h: Math.round(h * 360), s: Math.round(s * 100), l: Math.round(l * 100) };
}
