import { describe, expect, it } from "vitest";
import { applyLineEnding } from "./lineEndings";

describe("applyLineEnding", () => {
  it("LF 目标：CRLF 与孤立 CR 全部归一为 LF", () => {
    expect(applyLineEnding("a\r\nb\rc\nd", "LF")).toBe("a\nb\nc\nd");
    expect(applyLineEnding("a\r\nb\r\n", "LF")).toBe("a\nb\n");
  });

  it("CRLF 目标：所有换行统一展开为 CRLF", () => {
    expect(applyLineEnding("a\nb\rc\r\nd", "CRLF")).toBe("a\r\nb\r\nc\r\nd");
  });

  it("已是目标格式时保持不变（幂等）", () => {
    expect(applyLineEnding("a\r\nb\r\n", "CRLF")).toBe("a\r\nb\r\n");
    expect(applyLineEnding("a\nb\n", "LF")).toBe("a\nb\n");
  });

  it("无换行文本原样返回", () => {
    expect(applyLineEnding("hello", "LF")).toBe("hello");
    expect(applyLineEnding("hello", "CRLF")).toBe("hello");
  });

  it("空串安全", () => {
    expect(applyLineEnding("", "LF")).toBe("");
    expect(applyLineEnding("", "CRLF")).toBe("");
  });
});
