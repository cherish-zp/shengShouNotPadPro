import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { backgroundToCssUrl, pickBackgroundImage } from "./background";

// 用 vi.hoisted 提前创建 mock 句柄，供 vi.mock 工厂引用（vi.mock 会被提升到文件顶部）
const { mockOpen, mockConvertFileSrc } = vi.hoisted(() => ({
  mockOpen: vi.fn(),
  mockConvertFileSrc: vi.fn((path: string) => `asset://test${path}`),
}));

vi.mock("@tauri-apps/plugin-dialog", () => ({
  open: mockOpen,
}));

vi.mock("@tauri-apps/api/core", () => ({
  convertFileSrc: mockConvertFileSrc,
}));

/** 模拟 Tauri 环境（isTauriEnvironment 检查 window.__TAURI_INTERNALS__） */
function stubTauri(): void {
  vi.stubGlobal("window", { __TAURI_INTERNALS__: {} });
}

beforeEach(() => {
  mockOpen.mockReset();
  mockConvertFileSrc.mockClear();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("pickBackgroundImage（选择背景图）", () => {
  it("非 Tauri 环境直接返回 null，且不弹对话框", async () => {
    await expect(pickBackgroundImage()).resolves.toBeNull();
    expect(mockOpen).not.toHaveBeenCalled();
  });

  it("选中文件时返回该绝对路径，并以图片过滤器调用 open", async () => {
    stubTauri();
    mockOpen.mockResolvedValue("/Users/x/图.png");
    await expect(pickBackgroundImage()).resolves.toBe("/Users/x/图.png");
    expect(mockOpen).toHaveBeenCalledTimes(1);
    expect(mockOpen).toHaveBeenCalledWith({
      multiple: false,
      directory: false,
      title: "选择背景图片",
      filters: [
        {
          name: "图片",
          extensions: ["png", "jpg", "jpeg", "webp", "gif", "bmp", "avif"],
        },
      ],
    });
  });

  it("用户取消（open 返回 null）时返回 null", async () => {
    stubTauri();
    mockOpen.mockResolvedValue(null);
    await expect(pickBackgroundImage()).resolves.toBeNull();
  });

  it("open 抛异常时吞掉错误返回 null，不向外抛出", async () => {
    stubTauri();
    mockOpen.mockRejectedValue(new Error("dialog unavailable"));
    await expect(pickBackgroundImage()).resolves.toBeNull();
  });

  it("open 返回数组时取第一个（防御 multiple 配置）", async () => {
    stubTauri();
    mockOpen.mockResolvedValue(["/a/1.png", "/a/2.png"]);
    await expect(pickBackgroundImage()).resolves.toBe("/a/1.png");
  });

  it("open 返回空数组时返回 null", async () => {
    stubTauri();
    mockOpen.mockResolvedValue([]);
    await expect(pickBackgroundImage()).resolves.toBeNull();
  });
});

describe("backgroundToCssUrl（路径转 CSS url）", () => {
  it("空字符串返回空串，且不调用 convertFileSrc", () => {
    expect(backgroundToCssUrl("")).toBe("");
    expect(mockConvertFileSrc).not.toHaveBeenCalled();
  });

  it("undefined/null 等空值返回空串", () => {
    expect(backgroundToCssUrl(undefined as unknown as string)).toBe("");
    expect(backgroundToCssUrl(null as unknown as string)).toBe("");
    expect(mockConvertFileSrc).not.toHaveBeenCalled();
  });

  it("普通路径交给 convertFileSrc 转换并返回其结果", () => {
    expect(backgroundToCssUrl("/Users/x/图.png")).toBe("asset://test/Users/x/图.png");
    expect(mockConvertFileSrc).toHaveBeenCalledTimes(1);
    expect(mockConvertFileSrc).toHaveBeenCalledWith("/Users/x/图.png");
  });
});
