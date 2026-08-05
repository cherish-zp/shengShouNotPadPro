import { describe, it, expect } from "vitest";
import {
  scrollContainerStyle,
  notesSectionHeight,
  isFileTreeVisible,
} from "./panelLayout";

describe("scrollContainerStyle", () => {
  it("lets the flex item shrink and scroll instead of expanding", () => {
    expect(scrollContainerStyle.flex).toBe(1);
    expect(scrollContainerStyle.overflowY).toBe("auto");
    // 关键：minHeight:0 才能在内容增多时滚动，而非撑开父容器遮挡同级区域
    expect(scrollContainerStyle.minHeight).toBe(0);
  });
});

describe("notesSectionHeight", () => {
  const base = { itemHeight: 30, headerHeight: 36, basisHeight: 200 };

  it("stays at the basis when scrollable, regardless of tab count", () => {
    expect(
      notesSectionHeight({ ...base, tabCount: 100, scrollable: true })
    ).toBe(200);
  });

  it("grows beyond the basis when not scrollable and tabs are many", () => {
    expect(
      notesSectionHeight({ ...base, tabCount: 100, scrollable: false })
    ).toBeGreaterThan(200);
  });
});

describe("isFileTreeVisible", () => {
  const opts = {
    itemHeight: 30,
    headerHeight: 36,
    totalAvailableHeight: 400,
    notesBasisHeight: 200,
    treeMinHeight: 80,
  };

  it("is obscured when there are many tabs and notes do not scroll (the bug)", () => {
    expect(
      isFileTreeVisible({ ...opts, tabCount: 50, notesScrollable: false })
    ).toBe(false);
  });

  it("stays visible when there are many tabs but notes scroll (the fix)", () => {
    expect(
      isFileTreeVisible({ ...opts, tabCount: 50, notesScrollable: true })
    ).toBe(true);
  });
});
