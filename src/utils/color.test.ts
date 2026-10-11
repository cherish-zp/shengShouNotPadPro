import { describe, expect, it } from "vitest";
import { darkenHex, hexToRgb, normalizeHex, rgbToHsl } from "./color";

describe("normalizeHex", () => {
  it("补全 # 前缀并展开 3 位缩写", () => {
    expect(normalizeHex("fff")).toBe("#ffffff");
    expect(normalizeHex("#fff")).toBe("#ffffff");
    expect(normalizeHex("FfF")).toBe("#ffffff");
  });

  it("6 位原样保留（小写化）", () => {
    expect(normalizeHex("#AbCdEf")).toBe("#abcdef");
    expect(normalizeHex("123456")).toBe("#123456");
  });

  it("非法输入回落到 fallback", () => {
    expect(normalizeHex("zzzzzz")).toBe("#000000");
    expect(normalizeHex("")).toBe("#000000");
    expect(normalizeHex("12345")).toBe("#000000");
    expect(normalizeHex("nope", "#2563eb")).toBe("#2563eb");
  });

  it("非字符串输入安全处理", () => {
    // @ts-expect-error 防御性：运行时可能收到 undefined
    expect(normalizeHex(undefined)).toBe("#000000");
  });
});

describe("hexToRgb", () => {
  it("解析各通道 0-255", () => {
    expect(hexToRgb("#ff0000")).toEqual({ r: 255, g: 0, b: 0 });
    expect(hexToRgb("00ff00")).toEqual({ r: 0, g: 255, b: 0 });
    expect(hexToRgb("#2563eb")).toEqual({ r: 0x25, g: 0x63, b: 0xeb });
  });

  it("内部先做 normalizeHex", () => {
    expect(hexToRgb("f00")).toEqual({ r: 255, g: 0, b: 0 });
  });
});

describe("darkenHex", () => {
  it("按比例压暗并四舍五入", () => {
    expect(darkenHex("#ffffff", 0.12)).toBe("#e0e0e0");
    expect(darkenHex("#2563eb", 0)).toBe("#2563eb");
  });

  it("amount 过大时钳制到 0 不越界", () => {
    expect(darkenHex("#102030", 0.5)).toBe("#081018");
    expect(darkenHex("#ffffff", 1)).toBe("#000000");
  });
});

describe("rgbToHsl", () => {
  it("纯红 h=0 s=100 l=50", () => {
    expect(rgbToHsl(255, 0, 0)).toEqual({ h: 0, s: 100, l: 50 });
  });

  it("纯白与纯黑 l 两端", () => {
    expect(rgbToHsl(255, 255, 255)).toEqual({ h: 0, s: 0, l: 100 });
    expect(rgbToHsl(0, 0, 0)).toEqual({ h: 0, s: 0, l: 0 });
  });

  it("绿色 h=120", () => {
    expect(rgbToHsl(0, 255, 0)).toEqual({ h: 120, s: 100, l: 50 });
  });
});
