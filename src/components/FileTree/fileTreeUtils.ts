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
