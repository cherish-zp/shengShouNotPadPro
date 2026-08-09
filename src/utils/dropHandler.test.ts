import { describe, it, expect } from "vitest";
import { partitionDroppedPaths } from "./dropHandler";

describe("partitionDroppedPaths", () => {
  it("separates folders from files, preserving order", () => {
    const r = partitionDroppedPaths([
      { path: "/a.txt", isDir: false },
      { path: "/sub", isDir: true },
      { path: "/b.txt", isDir: false },
      { path: "/docs", isDir: true },
    ]);
    expect(r.folders).toEqual(["/sub", "/docs"]);
    expect(r.files).toEqual(["/a.txt", "/b.txt"]);
  });

  it("returns empty arrays for no items", () => {
    expect(partitionDroppedPaths([])).toEqual({ folders: [], files: [] });
  });

  it("handles only folders or only files", () => {
    expect(partitionDroppedPaths([{ path: "/x", isDir: true }])).toEqual({ folders: ["/x"], files: [] });
    expect(partitionDroppedPaths([{ path: "/y.txt", isDir: false }])).toEqual({ folders: [], files: ["/y.txt"] });
  });
});
