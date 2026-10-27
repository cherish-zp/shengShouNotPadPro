import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import { useTabStore, getTabLineCount, countLines } from "./tabStore";
import { useEditorStore } from "./editorStore";
import type { Tab } from "@/types";

// closeTab 里会动态 import imageBridge 清理贴图暂存目录；node 环境下 mock 掉
vi.mock("@/utils/imageBridge", () => ({
  cleanupTabStaging: vi.fn().mockResolvedValue(undefined),
}));

// node 环境没有 localStorage，用内存实现 mock（参考 src/utils/updateLogic.test.ts 的 MemStorage 模式）
class MemStorage {
  private map = new Map<string, string>();
  getItem(key: string): string | null {
    return this.map.has(key) ? (this.map.get(key) as string) : null;
  }
  setItem(key: string, value: string): void {
    this.map.set(key, String(value));
  }
  removeItem(key: string): void {
    this.map.delete(key);
  }
  clear(): void {
    this.map.clear();
  }
}

beforeEach(() => {
  vi.stubGlobal("localStorage", new MemStorage());
  useTabStore.setState({ tabs: [], activeTabId: null, nextTabNum: 1, hydrated: false });
  useEditorStore.setState({ cursorPositions: {}, scrollPositions: {} });
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

/** 构造完整 Tab 字段（用于直接种入 localStorage 模拟旧数据） */
function makeRawTab(overrides: Partial<Tab> & { id: string }): Tab {
  return {
    name: "便签",
    kind: "file",
    content: "",
    language: "plaintext",
    encoding: "UTF-8",
    lineEnding: "LF",
    indentSize: 2,
    indentType: "spaces",
    dirty: false,
    createdAt: 1,
    ...overrides,
  };
}

describe("countLines（行数计算）", () => {
  it("空串算 1 行，与编辑器显示一致", () => {
    expect(countLines("")).toBe(1);
  });

  it("按 \\n 切分计数，与 content.split(\"\\n\").length 等价", () => {
    expect(countLines("a")).toBe(1);
    expect(countLines("a\nb")).toBe(2);
    expect(countLines("a\n")).toBe(2);
    expect(countLines("a\nb\nc")).toBe(3);
  });
});

describe("updateTab（单 tab 不可变更新助手）", () => {
  it("只替换目标 tab，其他 tab 保持同一引用，原 tab 不被修改", () => {
    const t1 = useTabStore.getState().addTab({ name: "甲" });
    const t2 = useTabStore.getState().addTab({ name: "乙" });
    const before = useTabStore.getState().tabs;

    useTabStore.getState().updateTab(t1.id, { name: "丙" });

    const after = useTabStore.getState().tabs;
    expect(after).not.toBe(before);
    expect(after[0].name).toBe("丙");
    expect(before[0].name).toBe("甲"); // 原数组里的旧对象不被改动
    expect(after[0]).not.toBe(before[0]);
    expect(after[1]).toBe(before[1]); // 未命中的 tab 引用不变
    expect(t2.name).toBe("乙");
  });

  it("patch 与现值完全相同时返回原数组（跳过通知与持久化）", () => {
    const t = useTabStore.getState().addTab({ name: "甲" });
    const before = useTabStore.getState().tabs;
    useTabStore.getState().updateTab(t.id, { name: "甲" });
    expect(useTabStore.getState().tabs).toBe(before);
  });

  it("id 不存在时原样返回，不做任何变更", () => {
    useTabStore.getState().addTab();
    const before = useTabStore.getState().tabs;
    useTabStore.getState().updateTab("不存在", { name: "x" });
    expect(useTabStore.getState().tabs).toBe(before);
  });
});

describe("getTabLineCount（行数缓存契约）", () => {
  it("未知 tab 返回 undefined", () => {
    expect(getTabLineCount("never-existed")).toBeUndefined();
  });

  it("addTab 时计算一次行数", () => {
    const t = useTabStore.getState().addTab({ content: "第一行\n第二行" });
    expect(getTabLineCount(t.id)).toBe(2);
  });

  it("updateContent 时同步刷新行数", () => {
    const t = useTabStore.getState().addTab({ content: "a" });
    expect(getTabLineCount(t.id)).toBe(1);
    useTabStore.getState().updateContent(t.id, "1\n2\n3");
    expect(getTabLineCount(t.id)).toBe(3);
  });

  it("closeTab 后移除该 tab 的行数缓存", () => {
    const t = useTabStore.getState().addTab({ content: "a\nb" });
    expect(getTabLineCount(t.id)).toBe(2);
    useTabStore.getState().closeTab(t.id);
    expect(getTabLineCount(t.id)).toBeUndefined();
  });

  it("hydrate 时为恢复的 tab 填充行数，并清掉旧缓存", () => {
    const stale = useTabStore.getState().addTab({ content: "旧" });

    localStorage.setItem(
      "novaedit-tabs",
      JSON.stringify({
        tabs: [
          makeRawTab({ id: "t1", content: "一\n二\n三" }),
          makeRawTab({ id: "t2", content: "x" }),
        ],
        activeTabId: "t1",
        nextTabNum: 2,
      })
    );
    useTabStore.getState().hydrate();

    expect(getTabLineCount("t1")).toBe(3);
    expect(getTabLineCount("t2")).toBe(1);
    expect(getTabLineCount(stale.id)).toBeUndefined(); // 旧缓存已被清掉
  });

  it("缓存缺失但 tab 存在时现算一次（兜底外部直接 setState 注入的 tab）", () => {
    useTabStore.setState({ tabs: [makeRawTab({ id: "injected", content: "p\nq" })] });
    expect(getTabLineCount("injected")).toBe(2);
  });
});

describe("updateContent 热路径去重", () => {
  it("内容相同且已脏时跳过更新（tabs 引用不变）", () => {
    const t = useTabStore.getState().addTab({ content: "同" });
    useTabStore.getState().updateContent(t.id, "同"); // 第一次：内容同但 dirty false→true，仍是变更
    const before = useTabStore.getState().tabs;
    useTabStore.getState().updateContent(t.id, "同"); // 第二次：内容同且已脏 → 完全跳过
    expect(useTabStore.getState().tabs).toBe(before);
  });

  it("内容变化时更新 content 并标记 dirty", () => {
    const t = useTabStore.getState().addTab({ content: "旧内容" });
    useTabStore.getState().updateContent(t.id, "新内容");
    const tab = useTabStore.getState().tabs.find((x) => x.id === t.id)!;
    expect(tab.content).toBe("新内容");
    expect(tab.dirty).toBe(true);
  });
});

describe("持久化防抖与去重", () => {
  it("updateContent 后 300ms 才写入，key 与格式保持不变", () => {
    vi.useFakeTimers();
    const t = useTabStore.getState().addTab({ content: "a" });
    useTabStore.getState().updateContent(t.id, "a\nb\nc");

    expect(localStorage.getItem("novaedit-tabs")).toBeNull(); // 防抖窗口内不写

    vi.advanceTimersByTime(300);
    const raw = localStorage.getItem("novaedit-tabs");
    expect(raw).not.toBeNull();
    const saved = JSON.parse(raw!);
    expect(saved.tabs).toHaveLength(1);
    expect(saved.tabs[0].content).toBe("a\nb\nc");
    expect(saved.tabs[0].dirty).toBe(true);
    expect(saved.activeTabId).toBe(t.id);
    expect(typeof saved.nextTabNum).toBe("number");
  });

  it("内容未变化时不产生第二次写入", () => {
    vi.useFakeTimers();
    const setItemSpy = vi.spyOn(localStorage, "setItem");
    const t = useTabStore.getState().addTab({ content: "a" });
    useTabStore.getState().updateContent(t.id, "a\nb\nc");
    vi.advanceTimersByTime(300);
    expect(setItemSpy).toHaveBeenCalledTimes(1);

    setItemSpy.mockClear();
    useTabStore.getState().updateContent(t.id, "a\nb\nc"); // 内容同且已脏 → 无变化
    vi.advanceTimersByTime(300);
    expect(setItemSpy).not.toHaveBeenCalled();
  });

  it("markClean 在防抖窗口内发生时，干净状态也能落盘（脏标不复活）", () => {
    vi.useFakeTimers();
    const t = useTabStore.getState().addTab({ content: "v1" });
    useTabStore.getState().updateContent(t.id, "v1");
    vi.advanceTimersByTime(300); // 第一次落盘：dirty=true

    useTabStore.getState().updateContent(t.id, "v2");
    useTabStore.getState().markClean(t.id); // 模拟自动保存写盘后标记干净
    vi.advanceTimersByTime(300);

    const saved = JSON.parse(localStorage.getItem("novaedit-tabs")!);
    expect(saved.tabs[0].content).toBe("v2");
    expect(saved.tabs[0].dirty).toBe(false);
  });

  it("非内容类变更（重命名）同样会持久化，不会因 dirtyTabs 为空被跳过", () => {
    vi.useFakeTimers();
    const t = useTabStore.getState().addTab({ content: "a" });
    vi.advanceTimersByTime(300);

    useTabStore.getState().renameTab(t.id, "改过的名字");
    vi.advanceTimersByTime(300);
    const saved = JSON.parse(localStorage.getItem("novaedit-tabs")!);
    expect(saved.tabs[0].name).toBe("改过的名字");
  });

  it("相同内容的重复重命名不触发写入", () => {
    vi.useFakeTimers();
    const setItemSpy = vi.spyOn(localStorage, "setItem");
    const t = useTabStore.getState().addTab({ name: "甲", content: "a" });
    vi.advanceTimersByTime(300);

    setItemSpy.mockClear();
    useTabStore.getState().renameTab(t.id, "甲"); // 与现值相同 → 无变化
    vi.advanceTimersByTime(300);
    expect(setItemSpy).not.toHaveBeenCalled();
  });
});

describe("closeTab 清理（编辑器状态防无界增长）", () => {
  it("closeTab 时删除 editorStore 中该 tab 的光标/滚动位置", () => {
    const t = useTabStore.getState().addTab();
    useEditorStore.getState().updateCursor(t.id, { line: 3, column: 5 });
    useEditorStore.getState().updateScroll(t.id, 120);

    useTabStore.getState().closeTab(t.id);

    const s = useEditorStore.getState();
    expect(s.cursorPositions[t.id]).toBeUndefined();
    expect(s.scrollPositions[t.id]).toBeUndefined();
  });

  it("closeAll 清空全部行数缓存与编辑器状态", () => {
    const t1 = useTabStore.getState().addTab({ content: "a" });
    const t2 = useTabStore.getState().addTab({ content: "b\nc" });
    useEditorStore.getState().updateCursor(t1.id, { line: 1, column: 1 });

    useTabStore.getState().closeAll();

    expect(getTabLineCount(t1.id)).toBeUndefined();
    expect(getTabLineCount(t2.id)).toBeUndefined();
    expect(useEditorStore.getState().cursorPositions[t1.id]).toBeUndefined();
  });

  it("closeOthers 只保留目标 tab 的行数缓存", () => {
    const keep = useTabStore.getState().addTab({ content: "a\nb" });
    const gone = useTabStore.getState().addTab({ content: "c" });

    useTabStore.getState().closeOthers(keep.id);

    expect(getTabLineCount(keep.id)).toBe(2);
    expect(getTabLineCount(gone.id)).toBeUndefined();
  });

  it("closeTabsToRight 移除右侧 tab 的行数缓存", () => {
    const t1 = useTabStore.getState().addTab({ content: "a" });
    const t2 = useTabStore.getState().addTab({ content: "b" });
    const t3 = useTabStore.getState().addTab({ content: "c" });

    useTabStore.getState().closeTabsToRight(t2.id);

    expect(getTabLineCount(t1.id)).toBe(1);
    expect(getTabLineCount(t2.id)).toBe(1);
    expect(getTabLineCount(t3.id)).toBeUndefined();
  });
});

describe("editorStore 缓存维护", () => {
  it("updateCursor 相同位置不产生新对象（去重）", () => {
    useEditorStore.getState().updateCursor("t1", { line: 1, column: 2 });
    const before = useEditorStore.getState().cursorPositions;
    useEditorStore.getState().updateCursor("t1", { line: 1, column: 2 });
    expect(useEditorStore.getState().cursorPositions).toBe(before);
  });

  it("updateScroll 相同位置不产生新对象（去重）", () => {
    useEditorStore.getState().updateScroll("t1", 42);
    const before = useEditorStore.getState().scrollPositions;
    useEditorStore.getState().updateScroll("t1", 42);
    expect(useEditorStore.getState().scrollPositions).toBe(before);
  });

  it("releaseTabState 删除指定 tab 的条目，其他 tab 不受影响", () => {
    useEditorStore.getState().updateCursor("t1", { line: 1, column: 1 });
    useEditorStore.getState().updateCursor("t2", { line: 2, column: 2 });
    useEditorStore.getState().updateScroll("t1", 10);

    useEditorStore.getState().releaseTabState("t1");

    const s = useEditorStore.getState();
    expect(s.cursorPositions.t1).toBeUndefined();
    expect(s.cursorPositions.t2).toEqual({ line: 2, column: 2 });
    expect(s.scrollPositions.t1).toBeUndefined();
  });
});

describe("现有 action 行为保持（经由 updateTab 的回归）", () => {
  it("renameTab / markDirty / markClean", () => {
    const t = useTabStore.getState().addTab();
    useTabStore.getState().renameTab(t.id, "新名");
    expect(useTabStore.getState().tabs[0].name).toBe("新名");

    useTabStore.getState().markDirty(t.id);
    expect(useTabStore.getState().tabs[0].dirty).toBe(true);
    useTabStore.getState().markClean(t.id);
    expect(useTabStore.getState().tabs[0].dirty).toBe(false);
  });

  it("setTabColor / setTabEncoding / setTabLanguage / setTabLineEnding / setTabIndent", () => {
    const t = useTabStore.getState().addTab();
    const s = useTabStore.getState();
    s.setTabColor(t.id, "#f38ba8");
    s.setTabEncoding(t.id, "GBK");
    s.setTabLanguage(t.id, "typescript");
    s.setTabLineEnding(t.id, "CRLF");
    s.setTabIndent(t.id, 4, "tab");
    const tab = useTabStore.getState().tabs[0];
    expect(tab.color).toBe("#f38ba8");
    expect(tab.encoding).toBe("GBK");
    expect(tab.language).toBe("typescript");
    expect(tab.lineEnding).toBe("CRLF");
    expect(tab.indentSize).toBe(4);
    expect(tab.indentType).toBe("tab");
    s.setTabColor(t.id, undefined);
    expect(useTabStore.getState().tabs[0].color).toBeUndefined();
  });

  it("setFilePath 更新路径并从路径取文件名", () => {
    const t = useTabStore.getState().addTab({ name: "新建1" });
    useTabStore.getState().setFilePath(t.id, "/Users/me/docs/笔记.txt");
    const tab = useTabStore.getState().tabs[0];
    expect(tab.filePath).toBe("/Users/me/docs/笔记.txt");
    expect(tab.name).toBe("笔记.txt");
  });

  it("togglePinTab 置顶后 tab 排在最前", () => {
    const t1 = useTabStore.getState().addTab({ name: "一" });
    useTabStore.getState().addTab({ name: "二" });
    useTabStore.getState().togglePinTab(t1.id);
    const tabs = useTabStore.getState().tabs;
    expect(tabs[0].id).toBe(t1.id);
    expect(tabs[0].pinned).toBe(true);
  });

  it("duplicateTab 复制内容并缓存行数", () => {
    const t = useTabStore.getState().addTab({ name: "原件", content: "一\n二" });
    useTabStore.getState().duplicateTab(t.id);
    const tabs = useTabStore.getState().tabs;
    expect(tabs).toHaveLength(2);
    expect(tabs[1].name).toBe("原件 (副本)");
    expect(tabs[1].content).toBe("一\n二");
    expect(getTabLineCount(tabs[1].id)).toBe(2);
  });
});

// ---------------- 大文件支持：持久化护栏 + 行数直传 + 磁盘回读 ----------------
describe("大文件支持", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  it("updateContent 接受显式行数（O(1) 路径，不再全文 split）", () => {
    const t = useTabStore.getState().addTab({ name: "大文件" });
    useTabStore.getState().updateContent(t.id, "内容", 987654);
    expect(getTabLineCount(t.id)).toBe(987654);
  });

  it("addTab 接受显式行数（来自后端 line_count，避免打开 74MB 时全文 split）", () => {
    const t = useTabStore.getState().addTab({ name: "大文件", content: "a\nb", lineCount: 987654 });
    expect(getTabLineCount(t.id)).toBe(987654);
  });

  it("超过持久化上限的内容不写入 localStorage（改为 contentOmitted 标记），小内容不受影响", () => {
    vi.stubGlobal("crypto", { randomUUID: () => "uuid-big" });
    const big = "x".repeat(1024 * 1024 + 1); // 超过 1MB 持久化上限
    useTabStore.getState().addTab({ name: "大", content: big, lineCount: 1 });
    useTabStore.getState().addTab({ name: "小", content: "小内容" });
    vi.advanceTimersByTime(300);

    const raw = JSON.parse(localStorage.getItem("novaedit-tabs") as string);
    const bigTab = raw.tabs.find((t: { id: string }) => t.id === "uuid-big");
    const smallTab = raw.tabs.find((t: { name: string }) => t.name === "小");
    expect(bigTab.content).toBe("");
    expect(bigTab.contentOmitted).toBe(true);
    expect(smallTab.content).toBe("小内容");
    // 内存中的完整内容不受影响（只是不进 localStorage）
    expect(useTabStore.getState().tabs.find((t) => t.id === "uuid-big")?.content).toBe(big);
  });

  it("hydrate 后 reloadOmittedTabs 从磁盘回读被省略的文件内容", async () => {
    const rawTab = {
      id: "big1", name: "big.txt", kind: "file", content: "", contentOmitted: true,
      filePath: "/x/big.txt", language: "plaintext", encoding: "UTF-8",
      lineEnding: "LF", indentSize: 2, indentType: "spaces", dirty: false, createdAt: 1,
    };
    localStorage.setItem(
      "novaedit-tabs",
      JSON.stringify({ tabs: [rawTab], activeTabId: "big1", nextTabNum: 2 })
    );
    useTabStore.getState().hydrate();

    const readFile = vi.fn().mockResolvedValue({ content: "真实内容\n第二行", encoding: "UTF-8", line_count: 2 });
    await useTabStore.getState().reloadOmittedTabs({ readFile });

    const tab = useTabStore.getState().tabs[0];
    expect(tab.content).toBe("真实内容\n第二行");
    expect(tab.contentOmitted).toBe(false);
    expect(tab.dirty).toBe(false);
    expect(getTabLineCount("big1")).toBe(2);
  });

  it("回读失败时保留 contentOmitted 标记并置脏（下次再试）", async () => {
    const rawTab = {
      id: "big2", name: "big.txt", kind: "file", content: "", contentOmitted: true,
      filePath: "/x/big.txt", language: "plaintext", encoding: "UTF-8",
      lineEnding: "LF", indentSize: 2, indentType: "spaces", dirty: false, createdAt: 1,
    };
    localStorage.setItem(
      "novaedit-tabs",
      JSON.stringify({ tabs: [rawTab], activeTabId: "big2", nextTabNum: 2 })
    );
    useTabStore.getState().hydrate();

    const readFile = vi.fn().mockRejectedValue(new Error("disk error"));
    await useTabStore.getState().reloadOmittedTabs({ readFile });

    const tab = useTabStore.getState().tabs[0];
    expect(tab.content).toBe("");
    expect(tab.contentOmitted).toBe(true);
    expect(tab.dirty).toBe(true);
  });
});
