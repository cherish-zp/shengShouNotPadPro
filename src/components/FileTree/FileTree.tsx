import React, { useState } from "react";
import { FolderOpen, FileText, ChevronRight, ChevronDown } from "lucide-react";
import { useEditorStore } from "@/store/editorStore";
import { useTabStore } from "@/store/tabStore";

interface TreeNode {
  name: string;
  path: string;
  isDir: boolean;
  children?: TreeNode[];
  expanded?: boolean;
}

export default function FileTree() {
  const openFolder = useEditorStore((s) => s.openFolder);
  const setOpenFolder = useEditorStore((s) => s.setOpenFolder);
  const addTab = useTabStore((s) => s.addTab);
  const [tree, setTree] = useState<TreeNode[]>([]);

  const handleOpenFolder = async () => {
    try {
      const { invoke } = await import("@tauri-apps/api/core");
      const path = await invoke<string | null>("open_folder_dialog");
      if (path) {
        setOpenFolder(path);
        const entries = await invoke<Array<{ name: string; path: string; is_dir: boolean }>>("list_directory", { path });
        setTree(entries.map((e) => ({
          name: e.name,
          path: e.path,
          isDir: e.is_dir,
          children: e.is_dir ? [] : undefined,
          expanded: false,
        })));
      }
    } catch {
      // Dev mode fallback
    }
  };

  const toggleNode = async (node: TreeNode) => {
    if (!node.isDir) {
      // Open file in new tab
      try {
        const { invoke } = await import("@tauri-apps/api/core");
        const result = await invoke<{ content: string; encoding: string }>("read_file", { path: node.path, encoding: "UTF-8" });
        addTab({ name: node.name, filePath: node.path, content: result.content, encoding: result.encoding });
      } catch {
        addTab({ name: node.name, filePath: node.path, content: "" });
      }
      return;
    }

    // Toggle directory
    const newTree = [...tree];
    const updateNode = (nodes: TreeNode[]): TreeNode[] =>
      nodes.map((n) => {
        if (n.path === node.path) {
          const expanded = !n.expanded;
          return { ...n, expanded, children: expanded && (!n.children || n.children.length === 0) ? n.children : n.children ? updateNode(n.children) : n.children };
        }
        if (n.children) return { ...n, children: updateNode(n.children) };
        return n;
      });
    setTree(updateNode(newTree));

    // Load children if not loaded
    if (!node.expanded && (!node.children || node.children.length === 0)) {
      try {
        const { invoke } = await import("@tauri-apps/api/core");
        const entries = await invoke<Array<{ name: string; path: string; is_dir: boolean }>>("list_directory", { path: node.path });
        const newTree2 = [...tree];
        const loadChildren = (nodes: TreeNode[]): TreeNode[] =>
          nodes.map((n) => {
            if (n.path === node.path) {
              return {
                ...n, expanded: true,
                children: entries.map((e) => ({ name: e.name, path: e.path, isDir: e.is_dir, children: e.is_dir ? [] : undefined, expanded: false })),
              };
            }
            if (n.children) return { ...n, children: loadChildren(n.children) };
            return n;
          });
        setTree(loadChildren(newTree2));
      } catch { /* ignore */ }
    }
  };

  const renderNode = (node: TreeNode, depth: number = 0) => (
    <div key={node.path}>
      <div
        onClick={() => toggleNode(node)}
        style={{
          display: "flex", alignItems: "center", gap: 4,
          padding: "3px 8px 3px " + (8 + depth * 16) + "px",
          fontSize: 13, cursor: "pointer", color: "var(--text-secondary)",
        }}
        onMouseEnter={(e) => (e.currentTarget.style.background = "var(--bg-hover)")}
        onMouseLeave={(e) => (e.currentTarget.style.background = "none")}
      >
        {node.isDir ? (
          node.expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />
        ) : (
          <span style={{ width: 14 }} />
        )}
        {node.isDir ? <FolderOpen size={14} style={{ color: "var(--warning)" }} /> : <FileText size={14} />}
        <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{node.name}</span>
      </div>
      {node.isDir && node.expanded && node.children?.map((child) => renderNode(child, depth + 1))}
    </div>
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <div style={{ padding: "8px 12px", borderBottom: "1px solid var(--border)" }}>
        <span style={{ fontSize: 12, fontWeight: 600, color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
          文件
        </span>
      </div>
      <div style={{ flex: 1, overflowY: "auto" }}>
        {tree.length === 0 ? (
          <div style={{
            display: "flex", flexDirection: "column", alignItems: "center",
            justifyContent: "center", height: 160, gap: 8,
            color: "var(--text-secondary)", fontSize: 12, opacity: 0.5,
          }}>
            <FolderOpen size={28} />
            <button
              onClick={handleOpenFolder}
              style={{
                padding: "6px 12px", borderRadius: 6, fontSize: 12,
                background: "var(--bg-hover)", color: "var(--text-primary)", cursor: "pointer",
              }}
            >
              打开文件夹
            </button>
          </div>
        ) : (
          tree.map((node) => renderNode(node))
        )}
      </div>
    </div>
  );
}
