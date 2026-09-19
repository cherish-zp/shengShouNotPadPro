import { describe, it, expect } from "vitest";
import {
  removeNodeByPath,
  findTabsForDeletion,
  buildTargetPath,
  isSameOrAncestorPath,
  moveNodeInTree,
  buildMovedPath,
  buildFileTreeNodes,
  buildFolderRoot,
  dedupePaths,
  syncFolderRoots,
  migrateOpenFolders,
  buildRenameTarget,
  isHiddenName,
  filterHiddenNodes,
  filterHiddenPreservingRoot,
  filterTreeByQuery,
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

  it("expands a collapsed target directory and inserts the moved node", () => {
    const tree = [
      node("a.txt", "/r/a.txt", false),
      node("sub", "/r/sub", true, []),
    ];
    const result = moveNodeInTree(tree, "/r/a.txt", "/r/sub");
    expect(result.map((n) => n.path)).toEqual(["/r/sub"]);
    const sub = result.find((n) => n.path === "/r/sub")!;
    expect(sub.expanded).toBe(true);
    expect(sub.children!.map((c) => c.path)).toEqual(["/r/sub/a.txt"]);
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

describe("buildFileTreeNodes", () => {
  const e = (name: string, path: string, is_dir: boolean) => ({ name, path, is_dir });

  it("maps entries to nodes: dirs get empty children, files get none", () => {
    const nodes = buildFileTreeNodes([e("a.txt", "/r/a.txt", false), e("sub", "/r/sub", true)]);
    expect(nodes).toEqual([
      { name: "sub", path: "/r/sub", isDir: true, children: [], expanded: false },
      { name: "a.txt", path: "/r/a.txt", isDir: false, children: undefined, expanded: false },
    ]);
  });

  it("sorts directories first, then files alphabetically (case-insensitive)", () => {
    const nodes = buildFileTreeNodes([
      e("z.txt", "/r/z.txt", false),
      e("a.txt", "/r/a.txt", false),
      e("Bdir", "/r/Bdir", true),
      e("adir", "/r/adir", true),
    ]);
    expect(nodes.map((n) => n.name)).toEqual(["adir", "Bdir", "a.txt", "z.txt"]);
  });

  it("returns an empty array for no entries", () => {
    expect(buildFileTreeNodes([])).toEqual([]);
  });
});


describe("isHiddenName", () => {
  it("returns true for names starting with a dot", () => {
    expect(isHiddenName(".git")).toBe(true);
    expect(isHiddenName(".DS_Store")).toBe(true);
    expect(isHiddenName(".env.local")).toBe(true);
  });

  it("returns false for normal names", () => {
    expect(isHiddenName("src")).toBe(false);
    expect(isHiddenName("README.md")).toBe(false);
    expect(isHiddenName("main.ts")).toBe(false);
  });

  it("returns false for empty string", () => {
    expect(isHiddenName("")).toBe(false);
  });
});

describe("filterHiddenNodes", () => {
  it("removes top-level hidden files and directories", () => {
    const tree = [
      node(".git", "/r/.git", true),
      node("src", "/r/src", true),
      node(".DS_Store", "/r/.DS_Store", false),
      node("README.md", "/r/README.md", false),
    ];
    const result = filterHiddenNodes(tree);
    expect(result.map((n) => n.name)).toEqual(["src", "README.md"]);
  });

  it("removes hidden entries inside nested directories", () => {
    const tree = [
      node("src", "/r/src", true, [
        node(".hidden", "/r/src/.hidden", false),
        node("main.ts", "/r/src/main.ts", false),
        node(".cache", "/r/src/.cache", true, [node("temp.txt", "/r/src/.cache/temp.txt", false)]),
      ]),
    ];
    const result = filterHiddenNodes(tree);
    expect(result[0].children!.map((n) => n.name)).toEqual(["main.ts"]);
  });

  it("does not mutate the original tree", () => {
    const tree = [node(".git", "/r/.git", true), node("src", "/r/src", true)];
    const snapshot = JSON.stringify(tree);
    filterHiddenNodes(tree);
    expect(JSON.stringify(tree)).toBe(snapshot);
  });

  it("returns empty array for all-hidden tree", () => {
    const tree = [node(".git", "/r/.git", true), node(".env", "/r/.env", false)];
    expect(filterHiddenNodes(tree)).toEqual([]);
  });
});

describe("filterTreeByQuery", () => {
  it("returns all nodes when query is empty", () => {
    const tree = [node("a.txt", "/r/a.txt", false), node("b", "/r/b", true)];
    const result = filterTreeByQuery(tree, "");
    expect(result).toHaveLength(2);
  });

  it("filters top-level nodes by name (case-insensitive)", () => {
    const tree = [
      node("hello.txt", "/r/hello.txt", false),
      node("world.md", "/r/world.md", false),
      node("HELLO.js", "/r/HELLO.js", false),
    ];
    const result = filterTreeByQuery(tree, "hello");
    expect(result.map((n) => n.name)).toEqual(["hello.txt", "HELLO.js"]);
  });

  it("keeps parent directories when a child matches", () => {
    const tree = [
      node("src", "/r/src", true, [
        node("components", "/r/src/components", true, [
          node("Button.tsx", "/r/src/components/Button.tsx", false),
        ]),
        node("utils.ts", "/r/src/utils.ts", false),
      ]),
      node("docs", "/r/docs", true, [node("readme.md", "/r/docs/readme.md", false)]),
    ];
    tree[0].children![0].expanded = true;
    const result = filterTreeByQuery(tree, "Button");
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe("src");
    expect(result[0].children).toHaveLength(1);
    expect(result[0].children![0].name).toBe("components");
    expect(result[0].children![0].children).toHaveLength(1);
    expect(result[0].children![0].children![0].name).toBe("Button.tsx");
  });

  it("matches directory names themselves", () => {
    const tree = [
      node("src", "/r/src", true, [node("main.ts", "/r/src/main.ts", false)]),
      node("public", "/r/public", true),
    ];
    const result = filterTreeByQuery(tree, "src");
    expect(result.map((n) => n.name)).toEqual(["src"]);
    // Keep children of matched directory
    expect(result[0].children).toHaveLength(1);
  });

  it("returns empty array when nothing matches", () => {
    const tree = [node("a.txt", "/r/a.txt", false)];
    expect(filterTreeByQuery(tree, "zzz")).toEqual([]);
  });

  it("does not mutate the original tree", () => {
    const tree = [node("a.txt", "/r/a.txt", false), node("b.txt", "/r/b.txt", false)];
    const snapshot = JSON.stringify(tree);
    filterTreeByQuery(tree, "a");
    expect(JSON.stringify(tree)).toBe(snapshot);
  });

  it("matches partial names anywhere in the name", () => {
    const tree = [
      node("foobar.txt", "/r/foobar.txt", false),
      node("bazfoo.md", "/r/bazfoo.md", false),
      node("test.js", "/r/test.js", false),
    ];
    const result = filterTreeByQuery(tree, "foo");
    expect(result.map((n) => n.name)).toEqual(["foobar.txt", "bazfoo.md"]);
  });
});

describe("buildFolderRoot", () => {
  const entries = [
    { name: "b.txt", path: "/docs/b.txt", is_dir: false },
    { name: "sub", path: "/docs/sub", is_dir: true },
    { name: "a.txt", path: "/docs/a.txt", is_dir: false },
  ];

  it("把打开的文件夹本身作为唯一根节点（而不是把子项平铺在顶层）", () => {
    const tree = buildFolderRoot("/Users/me/Downloads", entries);
    expect(tree).toHaveLength(1);
    expect(tree[0]).toMatchObject({
      name: "Downloads",
      path: "/Users/me/Downloads",
      isDir: true,
      expanded: true,
    });
  });

  it("根节点子级按原有规则排序（目录优先，名称次序）", () => {
    const tree = buildFolderRoot("/docs", entries);
    expect(tree[0].children?.map((c) => c.name)).toEqual(["sub", "a.txt", "b.txt"]);
  });

  it("子目录默认折叠，根节点默认展开", () => {
    const tree = buildFolderRoot("/docs", entries);
    expect(tree[0].children?.find((c) => c.name === "sub")?.expanded).toBe(false);
    expect(tree[0].children?.find((c) => c.name === "a.txt")?.isDir).toBe(false);
  });

  it("空目录：根节点仍存在且无子项（区别于「未打开文件夹」状态）", () => {
    const tree = buildFolderRoot("/empty", []);
    expect(tree).toHaveLength(1);
    expect(tree[0].children).toEqual([]);
  });

  it("根路径 / 时名称回退为 /", () => {
    const tree = buildFolderRoot("/", entries);
    expect(tree[0].name).toBe("/");
  });
});

describe("filterHiddenPreservingRoot", () => {
  it("用户打开的根目录即使名字以点开头也保留，子级正常过滤", () => {
    const root = {
      name: ".config", path: "/me/.config", isDir: true, expanded: true,
      children: [
        { name: ".git", path: "/me/.config/.git", isDir: true, children: [], expanded: false },
        { name: "app.conf", path: "/me/.config/app.conf", isDir: false, children: undefined, expanded: false },
      ],
    };
    const result = filterHiddenPreservingRoot([root]);
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe(".config");
    expect(result[0].children?.map((c) => c.name)).toEqual(["app.conf"]);
  });

  it("普通树结构与 filterHiddenNodes 行为一致", () => {
    const tree = [
      { name: ".hidden", path: "/r/.hidden", isDir: true, children: [], expanded: false },
      { name: "a.txt", path: "/r/a.txt", isDir: false, children: undefined, expanded: false },
    ];
    expect(filterHiddenPreservingRoot(tree)).toEqual(filterHiddenNodes(tree));
  });
});

describe("dedupePaths", () => {
  it("追加新目录，跳过已存在的，保持原有顺序", () => {
    expect(dedupePaths(["/a", "/b"], ["/b", "/c", "/a"])).toEqual(["/a", "/b", "/c"]);
  });

  it("existing 为空时全部追加", () => {
    expect(dedupePaths([], ["/x", "/y"])).toEqual(["/x", "/y"]);
  });

  it("adding 为空时返回原列表", () => {
    expect(dedupePaths(["/a"], [])).toEqual(["/a"]);
  });
});

describe("syncFolderRoots", () => {
  const rootA = { name: "a", path: "/a", isDir: true, children: [], expanded: true } as FileTreeNode;
  const rootB = { name: "b", path: "/b", isDir: true, children: [], expanded: false } as FileTreeNode;

  it("指出需要加载的新目录，保留仍在打开列表中的根节点", () => {
    const { toLoad, next } = syncFolderRoots([rootA], ["/a", "/b"]);
    expect(toLoad).toEqual(["/b"]);
    expect(next).toEqual([rootA]);
  });

  it("已关闭的目录从树中移除", () => {
    const { toLoad, next } = syncFolderRoots([rootA, rootB], ["/b"]);
    expect(toLoad).toEqual([]);
    expect(next).toEqual([rootB]);
  });

  it("空树时全部待加载，顺序与 openFolders 一致", () => {
    const { toLoad, next } = syncFolderRoots([], ["/x", "/y"]);
    expect(toLoad).toEqual(["/x", "/y"]);
    expect(next).toEqual([]);
  });

  it("next 中根节点的展开状态与子级原样保留", () => {
    const { next } = syncFolderRoots([rootA, rootB], ["/a"]);
    expect(next[0]).toBe(rootA);
  });
});

describe("migrateOpenFolders", () => {
  it("旧版单目录 openFolder 迁移为数组", () => {
    expect(migrateOpenFolders({ openFolder: "/legacy" })).toEqual(["/legacy"]);
  });

  it("新版 openFolders 字段优先", () => {
    expect(migrateOpenFolders({ openFolder: "/legacy", openFolders: ["/a", "/b"] })).toEqual(["/a", "/b"]);
  });

  it("两者都缺失时返回空数组（未打开任何目录）", () => {
    expect(migrateOpenFolders({})).toEqual([]);
    expect(migrateOpenFolders({ openFolder: null })).toEqual([]);
  });
});

describe("buildRenameTarget", () => {
  it("同一目录下生成新路径，并给出所在目录（重命名后刷新文件树用）", () => {
    expect(buildRenameTarget("/docs/IDC用户抽取标准化", "IDC用户抽取标准化1.txt")).toEqual({
      newPath: "/docs/IDC用户抽取标准化1.txt",
      dir: "/docs",
    });
  });

  it("嵌套目录同样处理", () => {
    expect(buildRenameTarget("/a/b/c.md", "d.md")).toEqual({ newPath: "/a/b/d.md", dir: "/a/b" });
  });

  it("无文件路径的草稿便签返回 null（仅改显示名）", () => {
    expect(buildRenameTarget(undefined, "new-name")).toBeNull();
    expect(buildRenameTarget("", "new-name")).toBeNull();
  });

  it("新名称为空或纯空白返回 null", () => {
    expect(buildRenameTarget("/docs/a.txt", "")).toBeNull();
    expect(buildRenameTarget("/docs/a.txt", "   ")).toBeNull();
  });

  it("新名称与当前名称相同返回 null（无需磁盘操作）", () => {
    expect(buildRenameTarget("/docs/a.txt", "a.txt")).toBeNull();
  });
});
