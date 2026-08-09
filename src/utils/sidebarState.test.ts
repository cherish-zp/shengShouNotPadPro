import { describe, it, expect } from "vitest";
import { selectSidebarView } from "./sidebarState";

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
