import { describe, expect, it } from "vitest";
import { shouldApplyExternalContent } from "./externalContentSync";

describe("shouldApplyExternalContent", () => {
  const big = "x".repeat(1000);

  it("启动回读场景：编辑器是空文档，store 拿到磁盘回读内容 → 需要同步", () => {
    expect(shouldApplyExternalContent("", big, "")).toBe(true);
  });

  it("击键回写场景：store 内容与编辑器文档、上次回写均为同一引用 → 跳过（热路径 O(1)）", () => {
    expect(shouldApplyExternalContent(big, big, big)).toBe(false);
  });

  it("编辑器文档已与 store 一致 → 跳过", () => {
    expect(shouldApplyExternalContent(big, big, null)).toBe(false);
  });

  it("编码切换重读：store 换成了新解码内容（引用不同）→ 需要同步", () => {
    const editorDoc = "旧解码内容";
    const store = "新解码内容";
    expect(shouldApplyExternalContent(editorDoc, store, editorDoc)).toBe(true);
  });

  it("编辑器有未防抖落库的本地编辑、store 是旧值 → 不回灌（防丢字）", () => {
    // 编辑器 doc = "abcPROBE"（尚未 flush），store/lastSynced = "abc"
    expect(shouldApplyExternalContent("abcPROBE", "abc", "abc")).toBe(false);
  });

  it("空字符串边界：双方都空 → 跳过", () => {
    expect(shouldApplyExternalContent("", "", "")).toBe(false);
    expect(shouldApplyExternalContent("", "", null)).toBe(false);
  });
});
