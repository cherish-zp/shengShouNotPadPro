import { describe, it, expect } from "vitest";
import { resolveTitleText } from "./titleText";
import type { Tab } from "@/types";

function tab(id: string, name: string): Tab {
  return {
    id,
    name,
    kind: "file",
    content: "",
    language: "plaintext",
    encoding: "UTF-8",
    lineEnding: "LF",
    indentSize: 2,
    indentType: "spaces",
    dirty: false,
    createdAt: 0,
  };
}

describe("resolveTitleText（顶栏标题）", () => {
  it("tabs 为空数组时返回默认标题「圣手编辑器」", () => {
    expect(resolveTitleText([], "任意id")).toBe("圣手编辑器");
  });

  it("activeTabId 为 null 时返回默认标题「圣手编辑器」", () => {
    expect(resolveTitleText([tab("a", "笔记A")], null)).toBe("圣手编辑器");
  });

  it("有激活 tab 时返回该 tab 的 name", () => {
    expect(resolveTitleText([tab("a", "笔记A")], "a")).toBe("笔记A");
  });

  it("activeTabId 在 tabs 中找不到时返回默认标题「圣手编辑器」", () => {
    expect(resolveTitleText([tab("a", "笔记A")], "不存在")).toBe("圣手编辑器");
  });

  it("多个 tab 时返回激活 tab（而非第一个）的 name", () => {
    const tabs = [tab("a", "笔记A"), tab("b", "会议记录"), tab("c", "笔记C")];
    expect(resolveTitleText(tabs, "b")).toBe("会议记录");
  });

  it("激活 tab 的 name 含空格 / 特殊字符时原样返回", () => {
    expect(resolveTitleText([tab("a", "期末总结 v2 (草稿).md")], "a")).toBe(
      "期末总结 v2 (草稿).md"
    );
  });

  it("激活 tab 的 name 为空字符串时返回默认标题（不显示空白标题）", () => {
    expect(resolveTitleText([tab("a", "")], "a")).toBe("圣手编辑器");
  });
});
