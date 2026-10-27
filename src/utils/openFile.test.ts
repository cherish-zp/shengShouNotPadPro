import { describe, it, expect, vi } from "vitest";
import { languageForPath, loadFileContent, openPathAsTab, type OpenFileDeps } from "./openFile";
import { useTabStore } from "@/store/tabStore";

/** 构造可注入的 Tauri 能力 mock（无需 Tauri 环境） */
function makeDeps(overrides: Partial<OpenFileDeps> = {}): OpenFileDeps {
  return {
    detectEncoding: vi.fn(async () => "UTF-8"),
    readFile: vi.fn(async () => ({ content: "hello", encoding: "UTF-8", line_count: 1 })),
    ...overrides,
  };
}

describe("languageForPath", () => {
  it("常见扩展映射到语言 id", () => {
    expect(languageForPath("/a/b/main.ts")).toBe("typescript");
    expect(languageForPath("/a/b/index.tsx")).toBe("typescript");
    expect(languageForPath("app.js")).toBe("javascript");
    expect(languageForPath("C:\\dir\\script.py")).toBe("python");
    expect(languageForPath("main.rs")).toBe("rust");
    expect(languageForPath("README.md")).toBe("markdown");
    expect(languageForPath("styles.css")).toBe("css");
    expect(languageForPath("run.sh")).toBe("shell");
    expect(languageForPath("INDEX.HTML")).toBe("html");
    expect(languageForPath("data.json")).toBe("json");
    expect(languageForPath("config.yaml")).toBe("yaml");
  });

  it("未知扩展 / 无扩展名回落 plaintext", () => {
    expect(languageForPath("Makefile")).toBe("plaintext");
    expect(languageForPath("data.unknownext")).toBe("plaintext");
    expect(languageForPath("")).toBe("plaintext");
  });
});

describe("loadFileContent", () => {
  it("以探测到的编码读取并返回内容与编码", async () => {
    const deps = makeDeps({
      detectEncoding: vi.fn(async () => "GBK"),
      readFile: vi.fn(async () => ({ content: "内容", encoding: "GBK", line_count: 1 })),
    });
    const r = await loadFileContent("/f.txt", deps);
    expect(deps.detectEncoding).toHaveBeenCalledWith("/f.txt");
    expect(deps.readFile).toHaveBeenCalledWith("/f.txt", "GBK");
    expect(r).toEqual({ content: "内容", encoding: "GBK", lineCount: 1 });
  });

  it("探测失败回落 UTF-8", async () => {
    const deps = makeDeps({
      detectEncoding: vi.fn(async () => {
        throw new Error("detect failed");
      }),
    });
    const r = await loadFileContent("/f.txt", deps);
    expect(deps.readFile).toHaveBeenCalledWith("/f.txt", "UTF-8");
    expect(r.encoding).toBe("UTF-8");
  });

  it("探测返回空结果回落 UTF-8", async () => {
    const deps = makeDeps({
      detectEncoding: vi.fn(async () => ""),
    });
    const r = await loadFileContent("/f.txt", deps);
    expect(deps.readFile).toHaveBeenCalledWith("/f.txt", "UTF-8");
    expect(r.encoding).toBe("UTF-8");
  });

  it("readFile 返回的编码与探测不同时以 readFile 为准（后端转码后判定）", async () => {
    const deps = makeDeps({
      detectEncoding: vi.fn(async () => "GBK"),
      readFile: vi.fn(async () => ({ content: "abc", encoding: "GB18030", line_count: 1 })),
    });
    const r = await loadFileContent("/f.txt", deps);
    expect(r.encoding).toBe("GB18030");
  });

  it("readFile 返回空编码时回落探测编码", async () => {
    const deps = makeDeps({
      detectEncoding: vi.fn(async () => "GBK"),
      readFile: vi.fn(async () => ({ content: "abc", encoding: "", line_count: 1 })),
    });
    const r = await loadFileContent("/f.txt", deps);
    expect(r.encoding).toBe("GBK");
  });

  it("读取失败时错误向上抛出，由调用方决定兜底", async () => {
    const deps = makeDeps({
      readFile: vi.fn(async () => {
        throw new Error("io error");
      }),
    });
    await expect(loadFileContent("/f.txt", deps)).rejects.toThrow("io error");
  });
});

describe("openPathAsTab", () => {
  it("读取成功后以公共字段新增文件 tab 并返回", async () => {
    const deps = makeDeps({
      detectEncoding: vi.fn(async () => "GBK"),
      readFile: vi.fn(async () => ({ content: "print(1)", encoding: "GBK", line_count: 1 })),
    });
    const before = useTabStore.getState().tabs.length;
    const tab = await openPathAsTab("/tmp/hello.py", deps);
    expect(tab.name).toBe("hello.py");
    expect(tab.filePath).toBe("/tmp/hello.py");
    expect(tab.content).toBe("print(1)");
    expect(tab.encoding).toBe("GBK");
    expect(tab.language).toBe("python");
    expect(tab.kind).toBe("file");
    expect(useTabStore.getState().tabs.length).toBe(before + 1);
    expect(useTabStore.getState().activeTabId).toBe(tab.id);
    expect(deps.readFile).toHaveBeenCalledWith("/tmp/hello.py", "GBK");
  });

  it("读取失败时向上抛错且不创建 tab（兜底由调用方决定）", async () => {
    const deps = makeDeps({
      readFile: vi.fn(async () => {
        throw new Error("boom");
      }),
    });
    const before = useTabStore.getState().tabs.length;
    await expect(openPathAsTab("/x/y.txt", deps)).rejects.toThrow("boom");
    expect(useTabStore.getState().tabs.length).toBe(before);
  });
});
