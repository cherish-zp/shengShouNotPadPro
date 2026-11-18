import { describe, expect, it, vi } from "vitest";
import { persistTab } from "./useAutoSave";
import type { Tab } from "@/types";

function makeTab(partial: Partial<Tab>): Tab {
  return {
    id: "t1",
    name: "win.txt",
    kind: "file",
    content: "",
    language: "plaintext",
    encoding: "UTF-8",
    lineEnding: "CRLF",
    indentSize: 2,
    indentType: "spaces",
    dirty: false,
    createdAt: 1,
    ...partial,
  };
}

describe("persistTab 按标签换行符写盘", () => {
  it("CRLF 标签：CodeMirror 归一后的 LF 内容写盘前展开回 CRLF", async () => {
    const writeFile = vi.fn(async () => {});
    const tab = makeTab({ filePath: "/tmp/win.txt", content: "a\nb\n", lineEnding: "CRLF" });
    await persistTab(tab, writeFile);
    expect(writeFile).toHaveBeenCalledWith("/tmp/win.txt", "a\r\nb\r\n", "UTF-8");
  });

  it("LF 标签：写盘保持 LF（混入的 \\r\\n / 孤立 \\r 一并归一）", async () => {
    const writeFile = vi.fn(async () => {});
    const tab = makeTab({ filePath: "/tmp/mac.txt", content: "a\r\nb\rc\n", lineEnding: "LF" });
    await persistTab(tab, writeFile);
    expect(writeFile).toHaveBeenCalledWith("/tmp/mac.txt", "a\nb\nc\n", "UTF-8");
  });

  it("无文件路径的便签不写盘", async () => {
    const writeFile = vi.fn(async () => {});
    const tab = makeTab({ content: "草稿" });
    await persistTab(tab, writeFile);
    expect(writeFile).not.toHaveBeenCalled();
  });
});
