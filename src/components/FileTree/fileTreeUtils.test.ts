import { describe, it, expect } from "vitest";
import {
  removeNodeByPath,
  findTabsForDeletion,
  buildTargetPath,
  isSameOrAncestorPath,
  moveNodeInTree,
  buildMovedPath,
} from "./fileTreeUtils";
import type { FileTreeNode, Tab } from "@/types";

function node(name: string, path: string, isDir: boolean, children: FileTreeNode[] = []): FileTreeNode {
  return { name, path, isDir, children, expanded: false };
}

function tab(id: string, filePath?: string): Tab {
  return {
    id, name: id, kind: "file", filePath, content: "", language: "plaintext",
    encoding: "UTF-8", lineEnding: "LF", indentSize: 2, indentType: "spaces",
    dirty: false, createdAt: 0,
  };
}

describe("removeNodeByPath", () => {
  it("removes a top-level file node", () => {
    const tree = [node("a.txt", "/r/a.txt", false), node("b.txt", "/r/b.txt", false)];
    const result = removeNodeByPath(tree, "/r/a.txt");
    expect(result.map((n) => n.path)).toEqual(["/r/b.txt"]);
  });

  it("removes a nested file node recursively", () => {
    const tree = [
      node("sub", "/r/sub", true, [
        node("c.txt", "/r/sub/c.txt", false),
        node("d.txt", "/r/sub/d.txt", false),
      ]),
    ];
    const result = removeNodeByPath(tree, "/r/sub/c.txt");
    expect(result[0].children!.map((n) => n.path)).toEqual(["/r/sub/d.txt"]);
  });

  it("removes a directory node together with its children", () => {
    const tree = [
      node("sub", "/r/sub", true, [node("c.txt", "/r/sub/c.txt", false)]),
      node("e.txt", "/r/e.txt", false),
    ];
    const result = removeNodeByPath(tree, "/r/sub");
    expect(result.map((n) => n.path)).toEqual(["/r/e.txt"]);
  });

  it("does not mutate the original tree", () => {
    const tree = [node("a.txt", "/r/a.txt", false), node("b.txt", "/r/b.txt", false)];
    const snapshot = JSON.stringify(tree);
    removeNodeByPath(tree, "/r/a.txt");
    expect(JSON.stringify(tree)).toBe(snapshot);
  });

  it("returns an unchanged tree when path is not found", () => {
    const tree = [node("a.txt", "/r/a.txt", false)];
    const result = removeNodeByPath(tree, "/r/missing.txt");
    expect(result.map((n) => n.path)).toEqual(["/r/a.txt"]);
  });

  it("preserves sibling nodes and ordering", () => {
    const tree = [
      node("a.txt", "/r/a.txt", false),
      node("b.txt", "/r/b.txt", false),
      node("c.txt", "/r/c.txt", false),
    ];
    const result = removeNodeByPath(tree, "/r/b.txt");
    expect(result.map((n) => n.path)).toEqual(["/r/a.txt", "/r/c.txt"]);
  });
});

describe("findTabsForDeletion", () => {
  it("returns tabs whose filePath exactly matches a deleted file", () => {
    const tabs = [tab("1", "/r/a.txt"), tab("2", "/r/b.txt")];
    const result = findTabsForDeletion(tabs, "/r/a.txt", false);
    expect(result.map((t) => t.id)).toEqual(["1"]);
  });

  it("returns tabs under a deleted directory (prefix match on path separator)", () => {
    const tabs = [
      tab("1", "/r/sub/c.txt"),
      tab("2", "/r/sub2/x.txt"),
      tab("3", "/r/sub/d.txt"),
    ];
    const result = findTabsForDeletion(tabs, "/r/sub", true);
    expect(result.map((t) => t.id).sort()).toEqual(["1", "3"]);
  });

  it("does not match sibling directories that share a name prefix", () => {
    const tabs = [tab("1", "/r/sub-extra/x.txt")];
    const result = findTabsForDeletion(tabs, "/r/sub", true);
    expect(result).toEqual([]);
  });

  it("ignores notes (tabs without a filePath)", () => {
    const tabs = [tab("1"), tab("2", "/r/a.txt")];
    const result = findTabsForDeletion(tabs, "/r/a.txt", false);
    expect(result.map((t) => t.id)).toEqual(["2"]);
  });

  it("returns empty when nothing matches", () => {
    const tabs = [tab("1", "/r/a.txt")];
    expect(findTabsForDeletion(tabs, "/r/missing.txt", false)).toEqual([]);
  });
});

describe("buildTargetPath", () => {
  it("joins a directory path and file name", () => {
    expect(buildTargetPath("/r/sub", "a.txt")).toBe("/r/sub/a.txt");
  });

  it("normalizes a trailing slash", () => {
    expect(buildTargetPath("/r/sub/", "a.txt")).toBe("/r/sub/a.txt");
  });

  it("normalizes a trailing backslash", () => {
    expect(buildTargetPath("/r/sub\\", "a.txt")).toBe("/r/sub/a.txt");
  });

  it("handles an empty directory path", () => {
    expect(buildTargetPath("", "a.txt")).toBe("/a.txt");
  });
});

describe("isSameOrAncestorPath", () => {
  it("returns true when source equals target", () => {
    expect(isSameOrAncestorPath("/r/sub", "/r/sub")).toBe(true);
  });

  it("returns true when target is a descendant of source", () => {
    expect(isSameOrAncestorPath("/r/sub", "/r/sub/deep")).toBe(true);
  });

  it("returns false for a sibling directory", () => {
    expect(isSameOrAncestorPath("/r/sub", "/r/other")).toBe(false);
  });

  it("returns false when moving a file into a folder", () => {
    expect(isSameOrAncestorPath("/r/a.txt", "/r/sub")).toBe(false);
  });

  it("does not treat a name-prefix sibling as an ancestor", () => {
    expect(isSameOrAncestorPath("/r/sub", "/r/sub-extra")).toBe(false);
  });
});

describe("moveNodeInTree", () => {
  it("moves a file into an expanded directory and updates its path", () => {
    const tree = [
      node("a.txt", "/r/a.txt", false),
      node("sub", "/r/sub", true, [node("c.txt", "/r/sub/c.txt", false)]),
    ];
    tree[1].expanded = true;
    const result = moveNodeInTree(tree, "/r/a.txt", "/r/sub");
    expect(result.map((n) => n.path)).toEqual(["/r/sub"]);
    const sub = result.find((n) => n.path === "/r/sub")!;
    expect(sub.children!.map((c) => c.path)).toEqual(["/r/sub/c.txt", "/r/sub/a.txt"]);
  });

  it("does not insert into a collapsed directory (refresh will populate)", () => {
    const tree = [
      node("a.txt", "/r/a.txt", false),
      node("sub", "/r/sub", true, []),
    ];
    const result = moveNodeInTree(tree, "/r/a.txt", "/r/sub");
    expect(result.map((n) => n.path)).toEqual(["/r/sub"]);
    expect(result[0].children).toEqual([]);
  });

  it("moves a directory node and keeps its children reference", () => {
    const tree = [
      node("sub2", "/r/sub2", true, [node("x.txt", "/r/sub2/x.txt", false)]),
      node("sub", "/r/sub", true, [node("c.txt", "/r/sub/c.txt", false)]),
    ];
    tree[1].expanded = true;
    const result = moveNodeInTree(tree, "/r/sub2", "/r/sub");
    const sub = result.find((n) => n.path === "/r/sub")!;
    expect(sub.children!.map((c) => c.path)).toEqual(["/r/sub/c.txt", "/r/sub/sub2"]);
    const movedSub2 = sub.children!.find((c) => c.name === "sub2")!;
    expect(movedSub2.isDir).toBe(true);
  });

  it("does not mutate the original tree", () => {
    const tree = [
      node("a.txt", "/r/a.txt", false),
      node("sub", "/r/sub", true, [node("c.txt", "/r/sub/c.txt", false)]),
    ];
    tree[1].expanded = true;
    const snapshot = JSON.stringify(tree);
    moveNodeInTree(tree, "/r/a.txt", "/r/sub");
    expect(JSON.stringify(tree)).toBe(snapshot);
  });

  it("leaves the tree unchanged when the source is not found", () => {
    const tree = [node("a.txt", "/r/a.txt", false)];
    const result = moveNodeInTree(tree, "/r/missing.txt", "/r/sub");
    expect(result.map((n) => n.path)).toEqual(["/r/a.txt"]);
  });

  it("removes the source when the target directory is not in the tree", () => {
    const tree = [node("a.txt", "/r/a.txt", false)];
    const result = moveNodeInTree(tree, "/r/a.txt", "/r/elsewhere");
    expect(result.map((n) => n.path)).toEqual([]);
  });
});

describe("buildMovedPath", () => {
  it("returns newPath for an exact file match", () => {
    expect(buildMovedPath("/r/a.txt", "/r/a.txt", "/r/sub/a.txt", false)).toBe("/r/sub/a.txt");
  });

  it("rewrites the prefix for files under a moved directory", () => {
    expect(buildMovedPath("/r/sub/x.txt", "/r/sub", "/r/sub2", true)).toBe("/r/sub2/x.txt");
  });

  it("rewrites the prefix for nested files under a moved directory", () => {
    expect(buildMovedPath("/r/sub/d/y.txt", "/r/sub", "/r/sub2", true)).toBe("/r/sub2/d/y.txt");
  });

  it("returns the original path when unrelated", () => {
    expect(buildMovedPath("/r/other/x.txt", "/r/sub", "/r/sub2", true)).toBe("/r/other/x.txt");
  });
});
