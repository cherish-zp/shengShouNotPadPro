import { describe, it, expect } from "vitest";
import { selectSidebarView, RAIL_VIEWS, resolvePanelView } from "./sidebarState";

describe("selectSidebarView", () => {
  it("always reveals the sidebar and switches to the chosen view", () => {
    expect(selectSidebarView("files")).toEqual({ sidebarVisible: true, activeSidebarView: "files" });
    expect(selectSidebarView("search")).toEqual({ sidebarVisible: true, activeSidebarView: "search" });
    expect(selectSidebarView("tools")).toEqual({ sidebarVisible: true, activeSidebarView: "tools" });
    expect(selectSidebarView("plugins")).toEqual({ sidebarVisible: true, activeSidebarView: "plugins" });
  });

  it("reveals the panel even when it was previously collapsed", () => {
    expect(selectSidebarView("files").sidebarVisible).toBe(true);
    expect(selectSidebarView("plugins").sidebarVisible).toBe(true);
  });
});

describe("RAIL_VIEWS", () => {
  it("便签和文件是独立视图，文件排在搜索上面", () => {
    expect(RAIL_VIEWS.map((v) => v.id)).toEqual(["tabs", "files", "search", "tools", "plugins"]);
  });

  it("每个视图都有标题（tooltip 用）", () => {
    for (const v of RAIL_VIEWS) {
      expect(v.label.length).toBeGreaterThan(0);
    }
  });
});

describe("resolvePanelView", () => {
  it("便签视图只渲染便签面板（不再叠加文件树）", () => {
    expect(resolvePanelView("tabs")).toBe("notes");
  });

  it("文件视图只渲染文件树面板", () => {
    expect(resolvePanelView("files")).toBe("tree");
  });

  it("搜索/工具/插件视图各自渲染对应面板", () => {
    expect(resolvePanelView("search")).toBe("search");
    expect(resolvePanelView("tools")).toBe("tools");
    expect(resolvePanelView("plugins")).toBe("plugins");
  });

  it("git 视图回落到便签面板（尚未实现独立面板）", () => {
    expect(resolvePanelView("git")).toBe("notes");
  });
});
