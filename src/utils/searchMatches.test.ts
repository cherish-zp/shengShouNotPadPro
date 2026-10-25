import { describe, expect, it } from "vitest";
import { computeMatches } from "./searchMatches";

describe("computeMatches", () => {
  it("默认大小写不敏感：所有大小写变体都命中", () => {
    const ms = computeMatches("Node node NODE x", "node", {});
    expect(ms).toHaveLength(3);
    expect(ms.map((m) => m.from)).toEqual([0, 5, 10]);
  });

  it("caseSensitive 时只命中大小写一致的", () => {
    const ms = computeMatches("Node node NODE", "node", { caseSensitive: true });
    expect(ms).toHaveLength(1);
    expect(ms[0].from).toBe(5);
  });

  it("正则模式按正则匹配", () => {
    const ms = computeMatches("a1 b a22", "a\\d+", { useRegex: true });
    expect(ms).toHaveLength(2);
    expect(ms[0]).toMatchObject({ from: 0, to: 2 });
    expect(ms[1]).toMatchObject({ from: 5, to: 8 });
  });

  it("非法正则返回空数组而不抛出", () => {
    expect(computeMatches("abc", "a(", { useRegex: true })).toEqual([]);
  });

  it("空查询返回空数组", () => {
    expect(computeMatches("abc", "", {})).toEqual([]);
  });

  it("无匹配返回空数组", () => {
    expect(computeMatches("abc", "xyz", {})).toEqual([]);
  });

  it("零长匹配被跳过且不死循环", () => {
    expect(computeMatches("bb", "a*", { useRegex: true })).toEqual([]);
    expect(computeMatches("ab", "b*", { useRegex: true })).toHaveLength(1);
  });

  it("行号列号从 1 计，跨行正确", () => {
    // "ab" 在第 1 行第 1 列；第 2 行的 "ab" 在第 3 列
    const ms = computeMatches("ab\ncdab", "ab", {});
    expect(ms[0]).toMatchObject({ from: 0, to: 2, line: 1, col: 1 });
    expect(ms[1]).toMatchObject({ from: 5, to: 7, line: 2, col: 3 });
  });

  it("正则中的特殊字符在非正则模式下按字面匹配", () => {
    const ms = computeMatches("a.b a|b ab", "a.b", {});
    expect(ms).toHaveLength(1);
    expect(ms[0].from).toBe(0);
  });
});
