import { describe, it, expect } from "vitest";
import { pinTab, unpinTab, moveTab, moveTabByOffset, tabMoveBounds, normalizeTabOrder } from "./tabOrder";

interface Item {
  id: string;
  pinned?: boolean;
  pinnedAt?: number;
}

function item(id: string, pinned?: boolean, pinnedAt?: number): Item {
  return pinned ? { id, pinned, pinnedAt } : { id };
}

/** 便捷构造：ids 形如 "a b c"，pinnedAt 用下标*10 */
function list(spec: string): Item[] {
  return spec.split(" ").map((id, i) =>
    id.startsWith("P") ? item(id, true, i * 10) : item(id)
  );
}

function ids(tabs: Item[]): string[] {
  return tabs.map((t) => t.id);
}

describe("pinTab（置顶：移入数组前段，最近置顶在最上）", () => {
  it("普通便签置顶后移到数组第一位并带上 pinned/pinnedAt", () => {
    const tabs = list("a b c");
    const next = pinTab(tabs, "c", 1000);
    expect(ids(next)).toEqual(["c", "a", "b"]);
    expect(next[0]).toMatchObject({ id: "c", pinned: true, pinnedAt: 1000 });
    // 其余项原样保留（不共享被改对象）
    expect(next[1].id).toBe("a");
    expect(next[1].pinned).toBeUndefined();
  });

  it("连续置顶多张时，最近置顶的排最上", () => {
    const tabs = list("a b c d");
    const step1 = pinTab(tabs, "b", 1000);
    const step2 = pinTab(step1, "d", 2000);
    expect(ids(step2)).toEqual(["d", "b", "a", "c"]);
    expect(step2[0].pinnedAt).toBe(2000);
    expect(step2[1].pinnedAt).toBe(1000);
  });

  it("已置顶的便签再次置顶 = 顶到最上并刷新 pinnedAt", () => {
    const tabs = [item("P1", true, 100), item("P2", true, 200), item("a")];
    const next = pinTab(tabs, "P1", 9999);
    expect(ids(next)).toEqual(["P1", "P2", "a"]);
    expect(next[0].pinnedAt).toBe(9999);
  });

  it("置顶不存在的 id 时原样返回", () => {
    const tabs = list("a b");
    expect(pinTab(tabs, "x", 1)).toEqual(tabs);
  });
});

describe("unpinTab（取消置顶：回到普通区第一位）", () => {
  it("取消置顶后紧跟在置顶区之后（普通区头部），并清除标记", () => {
    const tabs = [item("P2", true, 200), item("P1", true, 100), item("a"), item("b")];
    const next = unpinTab(tabs, "P1");
    expect(ids(next)).toEqual(["P2", "P1", "a", "b"]);
    expect(next[1].pinned).toBe(false);
    expect(next[1].pinnedAt).toBeUndefined();
  });

  it("取消最后一个置顶后回到普通区头部", () => {
    const tabs = [item("P1", true, 100), item("a"), item("b")];
    const next = unpinTab(tabs, "P1");
    expect(ids(next)).toEqual(["P1", "a", "b"]);
    expect(next[0].pinned).toBe(false);
  });

  it("未置顶的便签取消置顶时原样返回", () => {
    const tabs = list("a b c");
    expect(unpinTab(tabs, "b")).toEqual(tabs);
  });
});

describe("moveTab（组内拖拽移动，禁止跨区）", () => {
  it("普通区内上下移动", () => {
    const tabs = [item("P1", true, 1), item("a"), item("b"), item("c")];
    expect(ids(moveTab(tabs, 1, 3))).toEqual(["P1", "b", "c", "a"]);
    expect(ids(moveTab(tabs, 3, 1))).toEqual(["P1", "c", "a", "b"]);
  });

  it("置顶区内上下移动", () => {
    const tabs = [item("P1", true, 1), item("P2", true, 2), item("a")];
    const swapped = moveTab(tabs, 0, 1);
    expect(ids(swapped)).toEqual(["P2", "P1", "a"]);
    expect(ids(moveTab(swapped, 1, 0))).toEqual(["P1", "P2", "a"]);
  });

  it("置顶项不能被拖出置顶区（目标越界钳制在置顶区末尾）", () => {
    const tabs = [item("P1", true, 1), item("P2", true, 2), item("a"), item("b")];
    // P1 从 0 拖到 2（普通区）→ 钳制到 1
    expect(ids(moveTab(tabs, 0, 2))).toEqual(["P2", "P1", "a", "b"]);
    // P1 从 0 拖到 99 → 同样钳制
    expect(ids(moveTab(tabs, 0, 99))).toEqual(["P2", "P1", "a", "b"]);
  });

  it("普通项不能被拖进置顶区（目标越界钳制在普通区头部）", () => {
    const tabs = [item("P1", true, 1), item("P2", true, 2), item("a"), item("b")];
    // b 从 3 拖到 0（置顶区）→ 钳制到 2
    expect(ids(moveTab(tabs, 3, 0))).toEqual(["P1", "P2", "b", "a"]);
    expect(ids(moveTab(tabs, 3, 1))).toEqual(["P1", "P2", "b", "a"]);
  });

  it("没有置顶项时整表自由移动（向后兼容旧行为）", () => {
    const tabs = list("a b c");
    expect(ids(moveTab(tabs, 0, 2))).toEqual(["b", "c", "a"]);
  });

  it("原地移动（from === to）原样返回", () => {
    const tabs = [item("P1", true, 1), item("a")];
    expect(moveTab(tabs, 0, 0)).toEqual(tabs);
  });

  it("源索引越界时原样返回", () => {
    const tabs = list("a b");
    expect(moveTab(tabs, -1, 0)).toEqual(tabs);
    expect(moveTab(tabs, 5, 0)).toEqual(tabs);
  });
});

describe("moveTabByOffset（按 id 上移/下移一格，组内钳制）", () => {
  it("普通区内下移/上移一格", () => {
    const tabs = [item("P1", true, 1), item("a"), item("b"), item("c")];
    expect(ids(moveTabByOffset(tabs, "a", 1))).toEqual(["P1", "b", "a", "c"]);
    expect(ids(moveTabByOffset(tabs, "b", -1))).toEqual(["P1", "b", "a", "c"]);
  });

  it("置顶区内上下移动", () => {
    const tabs = [item("P1", true, 1), item("P2", true, 2), item("a")];
    expect(ids(moveTabByOffset(tabs, "P1", 1))).toEqual(["P2", "P1", "a"]);
    expect(ids(moveTabByOffset(tabs, "P2", -1))).toEqual(["P2", "P1", "a"]);
  });

  it("置顶区边界为 no-op：第一位不能上移，区内最后一位不能下移出区", () => {
    const tabs = [item("P1", true, 1), item("P2", true, 2), item("a")];
    expect(moveTabByOffset(tabs, "P1", -1)).toEqual(tabs);
    expect(moveTabByOffset(tabs, "P2", 1)).toEqual(tabs);
  });

  it("普通区边界为 no-op：第一张普通便签不能上移进置顶区，最后一张不能下移", () => {
    const tabs = [item("P1", true, 1), item("a"), item("b")];
    expect(moveTabByOffset(tabs, "a", -1)).toEqual(tabs);
    expect(moveTabByOffset(tabs, "b", 1)).toEqual(tabs);
  });

  it("不存在的 id 原样返回", () => {
    const tabs = list("a b");
    expect(moveTabByOffset(tabs, "x", 1)).toEqual(tabs);
  });
});

describe("tabMoveBounds（右键菜单 上移/下移 可用性）", () => {
  it("按所在区的边界给出可用性", () => {
    const tabs = [item("P1", true, 1), item("P2", true, 2), item("a"), item("b")];
    expect(tabMoveBounds(tabs, "P1")).toEqual({ canMoveUp: false, canMoveDown: true });
    expect(tabMoveBounds(tabs, "P2")).toEqual({ canMoveUp: true, canMoveDown: false });
    expect(tabMoveBounds(tabs, "a")).toEqual({ canMoveUp: false, canMoveDown: true });
    expect(tabMoveBounds(tabs, "b")).toEqual({ canMoveUp: true, canMoveDown: false });
  });

  it("无置顶时整表首尾同理", () => {
    const tabs = list("a b c");
    expect(tabMoveBounds(tabs, "a")).toEqual({ canMoveUp: false, canMoveDown: true });
    expect(tabMoveBounds(tabs, "b")).toEqual({ canMoveUp: true, canMoveDown: true });
    expect(tabMoveBounds(tabs, "c")).toEqual({ canMoveUp: true, canMoveDown: false });
  });

  it("不存在的 id 双双不可用", () => {
    const tabs = list("a");
    expect(tabMoveBounds(tabs, "x")).toEqual({ canMoveUp: false, canMoveDown: false });
  });
});

describe("normalizeTabOrder（不变量：置顶在前段且按 pinnedAt 降序）", () => {
  it("把交错排列整理为 [置顶区(pinnedAt 降序), 普通区(原顺序)]", () => {
    const tabs = [
      item("a"),
      item("P1", true, 100),
      item("b"),
      item("P2", true, 200),
    ];
    expect(ids(normalizeTabOrder(tabs))).toEqual(["P2", "P1", "a", "b"]);
  });

  it("pinnedAt 相同或缺失时保持原有相对顺序（稳定排序）", () => {
    const tabs = [item("P2", true), item("P1", true), item("a")];
    expect(ids(normalizeTabOrder(tabs))).toEqual(["P2", "P1", "a"]);
  });

  it("没有置顶项时原样返回（同内容）", () => {
    const tabs = list("a b c");
    expect(normalizeTabOrder(tabs)).toEqual(tabs);
  });
});
