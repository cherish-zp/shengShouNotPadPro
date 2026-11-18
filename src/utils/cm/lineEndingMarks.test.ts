import { describe, expect, it } from "vitest";
import { lineEndingMarkFor } from "./lineEndingMarks";

describe("lineEndingMarkFor", () => {
  it("CRLF 文件的非末行 → 显示 CRLF 字样", () => {
    expect(lineEndingMarkFor("CRLF", false)).toBe("CRLF");
  });

  it("LF 文件的非末行 → 显示 LF 字样", () => {
    expect(lineEndingMarkFor("LF", false)).toBe("LF");
  });

  it("文档末行没有换行符 → null（不标记）", () => {
    expect(lineEndingMarkFor("CRLF", true)).toBe(null);
    expect(lineEndingMarkFor("LF", true)).toBe(null);
  });
});
