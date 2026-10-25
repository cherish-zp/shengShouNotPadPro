import { describe, expect, it } from "vitest";
import { tabActionFor, tabIndentText } from "./tabIndent";

describe("tabIndentText", () => {
  it("按 tabSize 生成对应数量的空格", () => {
    expect(tabIndentText(2)).toBe("  ");
    expect(tabIndentText(4)).toBe("    ");
    expect(tabIndentText(8)).toBe("        ");
  });

  it("非法值回落到默认 2 空格", () => {
    expect(tabIndentText(0)).toBe("  ");
    expect(tabIndentText(-3)).toBe("  ");
    expect(tabIndentText(NaN)).toBe("  ");
    expect(tabIndentText(2.7)).toBe("  "); // 非整数按无效处理，不四舍五入成 3
  });
});

describe("tabActionFor", () => {
  it("全部选区为空光标 → 在光标处插入缩进（insert）", () => {
    expect(tabActionFor([{ empty: true }])).toBe("insert");
    expect(tabActionFor([{ empty: true }, { empty: true }])).toBe("insert"); // 多光标
    expect(tabActionFor([])).toBe("insert"); // 无选区的兜底
  });

  it("任一选区非空 → 缩进所选行（indent）", () => {
    expect(tabActionFor([{ empty: false }])).toBe("indent");
    expect(tabActionFor([{ empty: true }, { empty: false }])).toBe("indent");
  });
});
