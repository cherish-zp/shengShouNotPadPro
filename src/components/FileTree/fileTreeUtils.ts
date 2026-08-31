import type { FileTreeNode, Tab } from "@/types";

/**
 * Return a new tree with the node at `path` removed (recursively).
 * Does not mutate the input tree.
 */
export function removeNodeByPath(tree: FileTreeNode[], path: string): FileTreeNode[] {
  return tree
    .filter((node) => node.path !== path)
    .map((node) => ({
      ...node,
      children: node.children ? removeNodeByPath(node.children, path) : node.children,
    }));
}

/**
 * Return the tabs that should be closed when the file/directory at `path`
 * is deleted. For a file this is an exact match; for a directory it also
 * includes every tab whose file lives somewhere beneath that directory.
 */
export function findTabsForDeletion(
  tabs: Tab[],
  path: string,
  isDir: boolean
): Tab[] {
  if (!isDir) {
    return tabs.filter((t) => t.filePath === path);
  }
  const prefix = path.endsWith("/") ? path : path + "/";
  return tabs.filter((t) => !!t.filePath && (t.filePath === path || t.filePath.startsWith(prefix)));
}

/**
 * Find a node by its path anywhere in the tree.
 */
export function findNodeByPath(tree: FileTreeNode[], path: string): FileTreeNode | undefined {
  for (const node of tree) {
    if (node.path === path) return node;
    if (node.children) {
      const found = findNodeByPath(node.children, path);
      if (found) return found;
    }
  }
  return undefined;
}

/**
 * Build the destination path for a file/dir moved into `targetDirPath`.
 * Normalizes any trailing path separator on the directory.
 */
export function buildTargetPath(targetDirPath: string, name: string): string {
  const base = targetDirPath.replace(/[\\/]+$/, "");
  return `${base}/${name}`;
}

/**
 * Guard against moving a directory into itself or one of its descendants.
 * Returns true when `sourcePath` is the same as, or an ancestor of, `targetDirPath`.
 */
export function isSameOrAncestorPath(sourcePath: string, targetDirPath: string): boolean {
  if (sourcePath === targetDirPath) return true;
  const prefix = sourcePath.endsWith("/") ? sourcePath : sourcePath + "/";
  return targetDirPath.startsWith(prefix);
}

/**
 * Return a new tree reflecting a node moved from `sourcePath` into the
 * directory at `targetDirPath`.
 *
 * - The source node is always removed from its original location (the move
 *   has physically happened on disk).
 * - The target directory is always marked expanded and the moved node
 *   (with an updated path) is appended to its children, so the move is
 *   immediately visible. The caller should still refresh the target to
 *   load its full on-disk contents.
 *
 * Does not mutate the input tree.
 */
export function moveNodeInTree(
  tree: FileTreeNode[],
  sourcePath: string,
  targetDirPath: string
): FileTreeNode[] {
  const sourceNode = findNodeByPath(tree, sourcePath);
  if (!sourceNode) return tree;

  let next = removeNodeByPath(tree, sourcePath);

  const targetDir = findNodeByPath(next, targetDirPath);
  if (targetDir && targetDir.isDir) {
    const moved: FileTreeNode = {
      ...sourceNode,
      path: buildTargetPath(targetDirPath, sourceNode.name),
    };
    next = insertIntoDir(next, targetDirPath, moved);
  }

  return next;
}

function insertIntoDir(
  nodes: FileTreeNode[],
  targetDirPath: string,
  moved: FileTreeNode
): FileTreeNode[] {
  return nodes.map((node) => {
    if (node.path === targetDirPath && node.isDir) {
      return { ...node, expanded: true, children: [...(node.children ?? []), moved] };
    }
    if (node.children) {
      return { ...node, children: insertIntoDir(node.children, targetDirPath, moved) };
    }
    return node;
  });
}

/**
 * Compute the new filePath for a tab whose underlying file was moved from
 * `sourcePath` to `newPath`. For a moved directory, every file beneath it
 * gets its prefix rewritten.
 */
export function buildMovedPath(
  filePath: string,
  sourcePath: string,
  newPath: string,
  sourceIsDir: boolean
): string {
  if (filePath === sourcePath) return newPath;
  if (sourceIsDir) {
    const prefix = sourcePath.endsWith("/") ? sourcePath : sourcePath + "/";
    if (filePath.startsWith(prefix)) {
      const newPrefix = newPath.endsWith("/") ? newPath : newPath + "/";
      return newPrefix + filePath.slice(prefix.length);
    }
  }
  return filePath;
}


/**
 * Convert raw directory entries (as returned by the `list_directory` Tauri
 * command) into file-tree nodes.
 *
 * Directories are sorted before files, and within each group names are
 * compared case-insensitively, so the file area always displays a stable,
 * readable listing regardless of the underlying filesystem order.
 */
export function buildFileTreeNodes(
  entries: Array<{ name: string; path: string; is_dir: boolean }>
): FileTreeNode[] {
  const sorted = [...entries].sort((a, b) => {
    if (a.is_dir !== b.is_dir) return a.is_dir ? -1 : 1;
    return a.name.toLowerCase().localeCompare(b.name.toLowerCase());
  });
  return sorted.map((e) => ({
    name: e.name,
    path: e.path,
    isDir: e.is_dir,
    children: e.is_dir ? [] : undefined,
    expanded: false,
  }));
}

/**
 * 多目录工作区：打开新目录是「追加」为新的根节点，而不是覆盖当前文件树。
 * 各打开目录的根节点并列展示，各自可独立展开/折叠/移除。
 */

/** 追加目录并去重（保持顺序） */
export function dedupePaths(existing: string[], adding: string[]): string[] {
  const seen = new Set(existing);
  const out = [...existing];
  for (const p of adding) {
    if (!seen.has(p)) {
      seen.add(p);
      out.push(p);
    }
  }
  return out;
}

export interface FolderRootSync {
  /** 需要新加载的目录（当前树中没有的） */
  toLoad: string[];
  /** 同步后的树：仅保留仍在打开列表中的根节点，顺序与 folders 一致 */
  next: FileTreeNode[];
}

/** 计算多根文件树的同步：保留仍打开的根节点（原样保留展开状态与子级），指出待加载目录 */
export function syncFolderRoots(tree: FileTreeNode[], folders: string[]): FolderRootSync {
  const byPath = new Map(tree.map((n) => [n.path, n]));
  const toLoad: string[] = [];
  const next: FileTreeNode[] = [];
  const seen = new Set<string>();
  for (const p of folders) {
    if (seen.has(p)) continue;
    seen.add(p);
    const node = byPath.get(p);
    if (node) next.push(node);
    else toLoad.push(p);
  }
  return { toLoad, next };
}

/** 持久化迁移：旧版单 openFolder → openFolders 数组；新版字段优先 */
export function migrateOpenFolders(
  persisted: { openFolder?: string | null; openFolders?: string[] }
): string[] {
  if (Array.isArray(persisted.openFolders)) return persisted.openFolders;
  if (persisted.openFolder) return [persisted.openFolder];
  return [];
}

/**
 * 把打开的文件夹本身作为树的唯一根节点，其子目录/文件作为根节点的子级展示
 * （而不是把子项平铺在顶层）。根节点默认展开；空目录时根节点仍存在，
 * 与「未打开文件夹」的空树状态区分开。
 */
export function buildFolderRoot(
  folderPath: string,
  entries: Array<{ name: string; path: string; is_dir: boolean }>
): FileTreeNode[] {
  const segments = folderPath.split("/").filter(Boolean);
  const name = segments.length > 0 ? segments[segments.length - 1] : "/";
  return [
    {
      name,
      path: folderPath,
      isDir: true,
      children: buildFileTreeNodes(entries),
      expanded: true,
    },
  ];
}


/**
 * Check whether a file or directory name is "hidden" (starts with a dot).
 */
export function isHiddenName(name: string): boolean {
  return name.length > 0 && name[0] === ".";
}

/**
 * Return a new tree with all hidden files and directories removed.
 * A node is hidden when its name starts with ".".
 * Does not mutate the input tree.
 */
export function filterHiddenNodes(tree: FileTreeNode[]): FileTreeNode[] {
  return tree
    .filter((node) => !isHiddenName(node.name))
    .map((node) => ({
      ...node,
      children: node.children ? filterHiddenNodes(node.children) : node.children,
    }));
}

/**
 * 隐藏文件过滤，但保留用户主动打开的根目录节点本身
 * （根目录是用户显式选择的，即使名字以点开头也不该被过滤掉；
 * 其子级仍按隐藏规则正常过滤）。
 */
export function filterHiddenPreservingRoot(tree: FileTreeNode[]): FileTreeNode[] {
  if (tree.length === 1 && tree[0].isDir) {
    return [{ ...tree[0], children: filterHiddenNodes(tree[0].children ?? []) }];
  }
  return filterHiddenNodes(tree);
}

/**
 * Return a new tree containing only nodes whose name matches `query`
 * (case-insensitive substring match), plus all ancestor directories so
 * the path context is preserved.
 *
 * - When a directory name matches, all its children are kept.
 * - When only a descendant matches, the directory is kept but only the
 *   matching subtree is included.
 * - An empty query returns the tree unchanged.
 *
 * Does not mutate the input tree.
 */
export function filterTreeByQuery(tree: FileTreeNode[], query: string): FileTreeNode[] {
  if (!query) return tree.map((n) => ({ ...n, children: n.children ? filterTreeByQuery(n.children, query) : n.children }));

  const lowerQuery = query.toLowerCase();

  function walk(nodes: FileTreeNode[]): FileTreeNode[] {
    const result: FileTreeNode[] = [];
    for (const node of nodes) {
      const nameMatch = node.name.toLowerCase().includes(lowerQuery);

      if (nameMatch) {
        result.push({ ...node, children: node.children ? node.children.map((c) => ({ ...c, children: c.children ? walk(c.children) : c.children })) : node.children });
        continue;
      }

      if (node.children) {
        const filteredChildren = walk(node.children);
        if (filteredChildren.length > 0) {
          result.push({ ...node, children: filteredChildren });
        }
      }
    }
    return result;
  }

  return walk(tree);
}
