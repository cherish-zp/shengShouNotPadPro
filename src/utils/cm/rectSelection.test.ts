import { describe, it, expect } from "vitest";
import { shouldTriggerRectSelection, computeRectSelectionRanges, colFromXPosition, type RectRange } from "./rectSelection";

function makeEvent(overrides: Partial<MouseEvent> = {}): MouseEvent {
  return {
    altKey: false,
    buttons: 0,
    button: 0,
    shiftKey: false,
    ctrlKey: false,
    metaKey: false,
    type: "mousemove",
    ...overrides,
  } as MouseEvent;
}

describe("shouldTriggerRectSelection", () => {
  it("returns false for plain left-click drag", () => {
    expect(shouldTriggerRectSelection(makeEvent({ buttons: 1 }))).toBe(false);
  });

  it("returns true when middle button is held (buttons bit 2 = 4)", () => {
    expect(shouldTriggerRectSelection(makeEvent({ buttons: 4 }))).toBe(true);
  });

  it("returns true on mousedown with middle button (button === 1, buttons === 0)", () => {
    expect(shouldTriggerRectSelection(makeEvent({ type: "mousedown", button: 1, buttons: 0 }))).toBe(true);
  });

  it("returns true when Alt key is pressed", () => {
    expect(shouldTriggerRectSelection(makeEvent({ altKey: true, buttons: 1 }))).toBe(true);
  });

  it("returns false on mouseup with middle button (button=1, buttons=0, type=mouseup)", () => {
    expect(shouldTriggerRectSelection(makeEvent({ type: "mouseup", button: 1, buttons: 0 }))).toBe(false);
  });

  it("returns false for right-click", () => {
    expect(shouldTriggerRectSelection(makeEvent({ buttons: 2 }))).toBe(false);
  });

  it("returns false for no buttons and no Alt", () => {
    expect(shouldTriggerRectSelection(makeEvent({ buttons: 0 }))).toBe(false);
  });
});

// 模拟一个简单的文档
const lines = [
  "hello world",
  "foo bar baz",
  "  indented line",
  "short",
  "abcdefghij",
];

const mockDoc = {
  lines: lines.length,
  line: (n: number) => ({
    from: lines.slice(0, n - 1).join("\n").length + (n > 1 ? n - 1 : 0),
    to: lines.slice(0, n).join("\n").length + (n > 1 ? n - 1 : 0),
    length: lines[n - 1].length,
    text: lines[n - 1],
    number: n,
  }),
};

describe("computeRectSelectionRanges", () => {
  it("returns a single cursor when start and end are on the same line and same col", () => {
    const ranges = computeRectSelectionRanges(mockDoc as any, 1, 2, 1, 2);
    expect(ranges).toHaveLength(1);
    expect(ranges[0].anchor).toBe(ranges[0].head);
    expect(ranges[0].line).toBe(1);
  });

  it("creates one range per line when dragging vertically", () => {
    // 从第1行第3列拖到第3行第3列 → 3个选区，每列都是第3列
    const ranges = computeRectSelectionRanges(mockDoc as any, 1, 3, 3, 3);
    expect(ranges).toHaveLength(3);
    expect(ranges.map((r) => r.line)).toEqual([1, 2, 3]);
    expect(ranges.map((r) => r.anchor)).toEqual(ranges.map((r) => r.head)); // 光标模式，没有选中宽度
  });

  it("creates selection with width when dragging diagonally (right-down)", () => {
    // 从第1行第2列拖到第3行第5列（右下方向）
    const ranges = computeRectSelectionRanges(mockDoc as any, 1, 2, 3, 5);
    expect(ranges).toHaveLength(3);
    // anchor 在第2列，head 在第5列
    for (const r of ranges) {
      expect(r.anchor).toBeLessThan(r.head);
    }
    // 每个 range 的 head - anchor 应该是 3 个字符宽度（5-2=3）
    expect(ranges[0].head - ranges[0].anchor).toBe(3);
  });

  it("handles upward drag (end line < start line)", () => {
    // 从第3行拖到第1行
    const ranges = computeRectSelectionRanges(mockDoc as any, 3, 2, 1, 5);
    expect(ranges).toHaveLength(3);
    expect(ranges.map((r) => r.line)).toEqual([1, 2, 3]);
  });

  it("handles leftward drag (end col < start col)", () => {
    // 从第5列拖回第2列
    const ranges = computeRectSelectionRanges(mockDoc as any, 1, 5, 2, 2);
    expect(ranges).toHaveLength(2);
    for (const r of ranges) {
      expect(r.anchor).toBeGreaterThan(r.head); // 反向选区
    }
  });

  it("clamps column to line length for shorter lines", () => {
    // 第4行只有 "short" (5个字符)，但我们拖到第10列
    const ranges = computeRectSelectionRanges(mockDoc as any, 1, 0, 5, 10);
    // 第4行的 head 应该被截断到行尾
    const line4 = ranges.find((r) => r.line === 4)!;
    expect(line4.head).toBe(mockDoc.line(4).from + mockDoc.line(4).length); // 截断到行内最后一个字符之后
  });

  it("handles empty result when lines out of range", () => {
    const ranges = computeRectSelectionRanges(mockDoc as any, 0, 0, 0, 0);
    expect(ranges).toEqual([]);
  });

  it("preserves direction: anchor stays at start position", () => {
    // 从 (line1, col6) 拖到 (line3, col2)：向左拖
    const ranges = computeRectSelectionRanges(mockDoc as any, 1, 6, 3, 2);
    for (const r of ranges) {
      // anchor 应该在第6列（右边），head 在第2列（左边）
      expect(r.anchor).toBeGreaterThan(r.head);
    }
    expect(ranges[0].anchor - ranges[0].head).toBe(4); // 6-2=4
  });
});

describe("computeRectSelectionRanges — 列对齐", () => {
  const lines = [
    "abcdefghij",       // 10 chars
    "0123456789",       // 10 chars
    "short",            // 5 chars
    "four",             // 4 chars
    "abcdefghijklmnop",  // 16 chars
  ];
  const mockDoc = {
    lines: lines.length,
    line: (n: number) => {
      const from = lines.slice(0, n - 1).join("\n").length + (n > 1 ? n - 1 : 0);
      const length = lines[n - 1].length;
      return { from, to: from + length + (n < lines.length ? 1 : 0), length, text: lines[n - 1], number: n };
    },
  };

  it("长行按指定列宽对齐，短行被截断到行尾", () => {
    const ranges = computeRectSelectionRanges(mockDoc as any, 1, 1, 3, 6);
    expect(ranges).toHaveLength(3);
    // 第 1、2 行有 10 字符，宽度 5（6-1）
    expect(ranges[0].head - ranges[0].anchor).toBe(5);
    expect(ranges[1].head - ranges[1].anchor).toBe(5);
    // 第 3 行只有 5 字符，被截断：min(6,5)-1 = 4
    expect(ranges[2].head - ranges[2].anchor).toBe(4);
  });

  it("短行的列会被截断到行尾（不越界）", () => {
    // 从第1行第0列拖到第5行第12列
    // 第3行只有5个字符，第4行只有4个字符
    const ranges = computeRectSelectionRanges(mockDoc as any, 1, 0, 5, 12);
    const line3 = ranges.find((r) => r.line === 3)!;
    const line4 = ranges.find((r) => r.line === 4)!;
    expect(line3.head - line3.anchor).toBe(5);  // 短行被截断：5-0=5
    expect(line4.head - line4.anchor).toBe(4);  // 4-0=4
  });

  it("向左拖动时，长行宽度一致，短行被截断", () => {
    // 从第1行第8列拖到第3行第2列（向左拖）
    const ranges = computeRectSelectionRanges(mockDoc as any, 1, 8, 3, 2);
    expect(ranges).toHaveLength(3);
    // 第 1、2 行有 10 字符，宽度 6（8-2）
    expect(ranges[0].anchor - ranges[0].head).toBe(6);
    expect(ranges[1].anchor - ranges[1].head).toBe(6);
    // 第 3 行只有 5 字符，被截断：5-2=3
    expect(ranges[2].anchor - ranges[2].head).toBe(3);
  });

  it("第0列到第N列：每一行都从行首开始", () => {
    const ranges = computeRectSelectionRanges(mockDoc as any, 1, 0, 5, 3);
    expect(ranges).toHaveLength(5);
    for (const r of ranges) {
      const line = mockDoc.line(r.line);
      expect(r.anchor).toBe(line.from); // 行首
    }
  });
});


describe("computeRectSelectionRanges — 基于字符宽度的列对齐", () => {
  const lines = [
    "abcdefghij",       // 10 chars, line 1
    "0123456789",       // 10 chars, line 2
    "short",            // 5 chars, line 3
    "x",                // 1 char, line 4
    "abcdefghijklmnop",  // 16 chars, line 5
  ];
  const charWidth = 10; // 每个字符 10px 宽
  const mockDoc = {
    lines: lines.length,
    line: (n: number) => {
      const from = lines.slice(0, n - 1).join("\n").length + (n > 1 ? n - 1 : 0);
      const length = lines[n - 1].length;
      return { from, to: from + length, length, text: lines[n - 1], number: n };
    },
  };

  it("鼠标在行文本右侧（像素超出）时，按像素/字符宽度计算列数（短行也对齐）", () => {
    // 模拟：第1行0列 拖到 第3行，x 坐标对应第8列
    // 第3行只有 5 个字符，但矩形选区应该按第 8 列对齐（超出行尾的部分在行尾之后）
    // 注意：这是 CodeMirror 的行为 — 短行的选区会停在行尾
    const ranges = computeRectSelectionRanges(mockDoc as any, 1, 0, 3, 8);
    expect(ranges).toHaveLength(3);
    // 第 1、2 行有 10+ 字符，宽度 8
    expect(ranges[0].head - ranges[0].anchor).toBe(8);
    expect(ranges[1].head - ranges[1].anchor).toBe(8);
    // 第 3 行只有 5 字符，被截断到 5
    expect(ranges[2].head - ranges[2].anchor).toBe(5);
  });
});

describe("colFromXPosition", () => {

  it("converts pixel offset to column using character width", () => {
    expect(colFromXPosition(100, 10)).toBe(10);
    expect(colFromXPosition(15, 10)).toBe(2);  // 四舍五入
    expect(colFromXPosition(0, 10)).toBe(0);
  });

  it("handles negative x (left of content)", () => {
    expect(colFromXPosition(-5, 10)).toBe(0);
  });

  it("works with fractional character widths", () => {
    expect(colFromXPosition(7.5, 7.5)).toBe(1);
    expect(colFromXPosition(14, 7)).toBe(2);
  });
});
