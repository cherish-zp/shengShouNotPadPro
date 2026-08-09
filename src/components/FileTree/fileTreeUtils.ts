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
