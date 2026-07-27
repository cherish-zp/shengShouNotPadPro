import { describe, it, expect } from "vitest";
import { removeNodeByPath, findTabsForDeletion } from "./fileTreeUtils";
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
