import React, { useState } from "react";
import { FolderOpen, FileText, ChevronRight, ChevronDown, Plus, Search, StickyNote, Trash2 } from "lucide-react";
import { useEditorStore } from "@/store/editorStore";
import { useTabStore } from "@/store/tabStore";
import TabItem from "@/components/TabBar/TabItem";
import TabContextMenu from "@/components/TabBar/TabContextMenu";
import ContextMenu from "@/components/Common/ContextMenu";
import Modal from "@/components/Common/Modal";
import { removeNodeByPath, findTabsForDeletion, buildTargetPath, isSameOrAncestorPath, moveNodeInTree, buildMovedPath } from "./fileTreeUtils";
import { scrollContainerStyle } from "./panelLayout";
import type { TabColor, FileTreeNode } from "@/types";

type TreeNode = FileTreeNode;

export default function FilePanel() {
  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <NotesSection />
      <div style={{ height: 1, background: "var(--border)", flexShrink: 0 }} />
      <FileTreeSection />
    </div>
  );
}

/* ──────────── 便签区域 ──────────── */
function NotesSection() {
  const tabs = useTabStore((s) => s.tabs);
  const activeTabId = useTabStore((s) => s.activeTabId);
  const addTab = useTabStore((s) => s.addTab);
  const closeTab = useTabStore((s) => s.closeTab);
  const setActiveTab = useTabStore((s) => s.setActiveTab);
  const renameTab = useTabStore((s) => s.renameTab);
  const setTabColor = useTabStore((s) => s.setTabColor);
  const closeOthers = useTabStore((s) => s.closeOthers);
  const closeAll = useTabStore((s) => s.closeAll);

  const [filter, setFilter] = useState("");
  const [showSearch, setShowSearch] = useState(false);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; tabId: string } | null>(null);

  const filtered = filter
    ? tabs.filter((t) => t.name.toLowerCase().includes(filter.toLowerCase()))
    : tabs;

  return (
    <div style={{ display: "flex", flexDirection: "column", minHeight: 120, flex: "0 1 50%" }}>
      {/* Header */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "8px 10px 6px 12px", flexShrink: 0,
      }}>
        <span style={{
          fontSize: 11, fontWeight: 700, color: "var(--text-secondary)",
          textTransform: "uppercase", letterSpacing: "0.08em",
          display: "flex", alignItems: "center", gap: 4,
        }}>
          <StickyNote size={12} /> 便签
        </span>
        <div style={{ display: "flex", gap: 2 }}>
          <button
            onClick={() => setShowSearch(!showSearch)}
            title="搜索便签"
            style={{
              display: "flex", alignItems: "center", justifyContent: "center",
              width: 24, height: 24, borderRadius: 6,
              color: showSearch ? "var(--accent)" : "var(--text-secondary)",
              background: showSearch ? "var(--bg-hover)" : "transparent",
              cursor: "pointer",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = "var(--bg-hover)")}
            onMouseLeave={(e) => { if (!showSearch) e.currentTarget.style.background = "transparent"; }}
          >
            <Search size={12} />
          </button>
          <button
            onClick={() => addTab()}
            title="新建便签 (⌘N)"
            style={{
              display: "flex", alignItems: "center", justifyContent: "center",
              width: 24, height: 24, borderRadius: 6,
              color: "var(--text-secondary)", background: "transparent", cursor: "pointer",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = "var(--bg-hover)")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
          >
            <Plus size={13} />
          </button>
        </div>
      </div>

      {/* Search */}
      {showSearch && (
        <div style={{ padding: "4px 10px", flexShrink: 0 }}>
          <input
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="搜索便签..."
            autoFocus
            style={{
              width: "100%", padding: "4px 8px", fontSize: 12,
              background: "var(--bg-primary)", border: "1px solid var(--border)",
              borderRadius: 6, color: "var(--text-primary)", outline: "none",
            }}
          />
        </div>
      )}

      {/* List */}
      <div style={scrollContainerStyle}>
        {filtered.length === 0 ? (
          <div style={{
            display: "flex", flexDirection: "column", alignItems: "center",
            justifyContent: "center", padding: "16px 0",
            color: "var(--text-secondary)", fontSize: 12, opacity: 0.5,
          }}>
            <span>{filter ? "没有匹配的便签" : "⌘N 新建便签"}</span>
          </div>
        ) : (
          filtered.map((tab) => (
            <TabItem
              key={tab.id}
              tab={tab}
              isActive={tab.id === activeTabId}
              onSelect={() => setActiveTab(tab.id)}
              onClose={() => closeTab(tab.id)}
              onRename={(name) => renameTab(tab.id, name)}
              onContextMenu={(e) => {
                e.preventDefault();
                setContextMenu({ x: e.clientX, y: e.clientY, tabId: tab.id });
              }}
            />
          ))
        )}
      </div>

      {/* Context menu */}
      {contextMenu && (
        <TabContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          tabId={contextMenu.tabId}
          hasFilePath={!!tabs.find((t) => t.id === contextMenu.tabId)?.filePath}
          onClose={() => setContextMenu(null)}
          onRename={() => {}}
          onSetColor={(color: TabColor | undefined) => setTabColor(contextMenu.tabId, color)}
          onCloseTab={() => closeTab(contextMenu.tabId)}
          onCloseOthers={() => closeOthers(contextMenu.tabId)}
          onCloseAll={() => closeAll()}
          onCopyPath={() => {
            const tab = tabs.find((t) => t.id === contextMenu.tabId);
            if (tab?.filePath) navigator.clipboard.writeText(tab.filePath);
          }}
          onReveal={() => {
            const tab = tabs.find((t) => t.id === contextMenu.tabId);
            if (tab?.filePath) {
              import("@tauri-apps/api/core").then(({ invoke }) => {
                invoke("reveal_in_finder", { path: tab.filePath });
              }).catch(() => {});
            }
          }}
          onSave={() => {
            window.dispatchEvent(new CustomEvent("novaedit:save"));
          }}
        />
      )}
    </div>
  );
}

/* ──────────── 文件树区域 ──────────── */
function FileTreeSection() {
  const openFolder = useEditorStore((s) => s.openFolder);
  const setOpenFolder = useEditorStore((s) => s.setOpenFolder);
  const addTab = useTabStore((s) => s.addTab);
  const tabs = useTabStore((s) => s.tabs);
  const closeTab = useTabStore((s) => s.closeTab);
  const [tree, setTree] = useState<TreeNode[]>([]);
  const [fileContextMenu, setFileContextMenu] = useState<{ x: number; y: number; node: TreeNode } | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<TreeNode | null>(null);
  const [dragOverPath, setDragOverPath] = useState<string | null>(null);
  const setFilePath = useTabStore((s) => s.setFilePath);

  const handleOpenFolder = async () => {
    try {
      const { invoke } = await import("@tauri-apps/api/core");
      const path = await invoke<string | null>("open_folder_dialog");
      if (path) {
        setOpenFolder(path);
        const entries = await invoke<Array<{ name: string; path: string; is_dir: boolean }>>("list_directory", { path });
        setTree(entries.map((e) => ({
          name: e.name, path: e.path, isDir: e.is_dir,
          children: e.is_dir ? [] : undefined, expanded: false,
        })));
      }
    } catch { /* Dev mode fallback */ }
  };

  const toggleNode = async (node: TreeNode) => {
    if (!node.isDir) {
      try {
        const { invoke } = await import("@tauri-apps/api/core");
        const result = await invoke<{ content: string; encoding: string }>("read_file", { path: node.path, encoding: "UTF-8" });
        addTab({ name: node.name, filePath: node.path, content: result.content, encoding: result.encoding });
      } catch {
        addTab({ name: node.name, filePath: node.path, content: "" });
      }
      return;
    }

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

  const handleConfirmDelete = async () => {
    if (!confirmDelete) return;
    const target = confirmDelete;
    try {
      const { invoke } = await import("@tauri-apps/api/core");
      await invoke("delete_file", { path: target.path });
      setTree((prev) => removeNodeByPath(prev, target.path));
      findTabsForDeletion(tabs, target.path, target.isDir).forEach((t) => closeTab(t.id));
    } catch (err) {
      window.alert(`删除失败：${err}`);
    } finally {
      setConfirmDelete(null);
    }
  };

  const refreshDir = async (dirPath: string) => {
    try {
      const { invoke } = await import("@tauri-apps/api/core");
      const entries = await invoke<Array<{ name: string; path: string; is_dir: boolean }>>("list_directory", { path: dirPath });
      setTree((prev) => {
        const apply = (nodes: TreeNode[]): TreeNode[] =>
          nodes.map((n) => {
            if (n.path === dirPath && n.isDir) {
              return {
                ...n,
                children: entries.map((e) => ({
                  name: e.name, path: e.path, isDir: e.is_dir,
                  children: e.is_dir ? [] : undefined, expanded: false,
                })),
              };
            }
            if (n.children) return { ...n, children: apply(n.children) };
            return n;
          });
        return apply(prev);
      });
    } catch {
      /* ignore */
    }
  };

  const handleDropOnDir = async (e: React.DragEvent, target: TreeNode) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOverPath(null);
    const sourcePath = e.dataTransfer.getData("application/x-node-path");
    const sourceIsDir = e.dataTransfer.getData("application/x-node-isdir") === "true";
    if (!sourcePath || sourcePath === target.path) return;
    if (sourceIsDir && isSameOrAncestorPath(sourcePath, target.path)) {
      window.alert("不能将文件夹移动到自身或其子目录中。");
      return;
    }
    const sourceName = sourcePath.split(/[\\/]/).pop() || sourcePath;
    const newPath = buildTargetPath(target.path, sourceName);
    try {
      const { invoke } = await import("@tauri-apps/api/core");
      const entries = await invoke<Array<{ name: string; path: string; is_dir: boolean }>>("list_directory", { path: target.path });
      if (entries.some((en) => en.name === sourceName)) {
        window.alert(`目标文件夹已存在同名项「${sourceName}」，已取消移动。`);
        return;
      }
      await invoke("rename_file", { oldPath: sourcePath, newPath });
      setTree((prev) => moveNodeInTree(prev, sourcePath, target.path));
      if (target.expanded) void refreshDir(target.path);
      const sourcePrefix = sourcePath.endsWith("/") ? sourcePath : sourcePath + "/";
      tabs
        .filter((t) => !!t.filePath && (t.filePath === sourcePath || (sourceIsDir && t.filePath.startsWith(sourcePrefix))))
        .forEach((t) => setFilePath(t.id, buildMovedPath(t.filePath!, sourcePath, newPath, sourceIsDir)));
    } catch (err) {
      window.alert(`移动失败：${err}`);
    }
  };

  const renderNode = (node: TreeNode, depth: number = 0) => (
    <div key={node.path}>
      <div
        draggable
        onDragStart={(e) => {
          e.dataTransfer.setData("application/x-node-path", node.path);
          e.dataTransfer.setData("application/x-node-isdir", String(node.isDir));
          e.dataTransfer.effectAllowed = "move";
        }}
        onDragEnd={() => setDragOverPath(null)}
        onClick={() => toggleNode(node)}
        onContextMenu={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setFileContextMenu({ x: e.clientX, y: e.clientY, node });
        }}
        onDragOver={node.isDir ? (e) => {
          e.preventDefault();
          e.stopPropagation();
          e.dataTransfer.dropEffect = "move";
          if (dragOverPath !== node.path) setDragOverPath(node.path);
        } : undefined}
        onDragLeave={node.isDir ? () => {
          if (dragOverPath === node.path) setDragOverPath(null);
        } : undefined}
        onDrop={node.isDir ? (e) => handleDropOnDir(e, node) : undefined}
        style={{
          display: "flex", alignItems: "center", gap: 4,
          padding: "3px 8px 3px " + (8 + depth * 16) + "px",
          fontSize: 13, cursor: "pointer", color: "var(--text-secondary)",
          borderRadius: 4,
          outline: dragOverPath === node.path && node.isDir ? "1px dashed var(--accent)" : "none",
          outlineOffset: -1,
        }}
        onMouseEnter={(e) => { if (dragOverPath !== node.path) e.currentTarget.style.background = "var(--bg-hover)"; }}
        onMouseLeave={(e) => { if (dragOverPath !== node.path) e.currentTarget.style.background = "none"; }}
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
    <div style={{ display: "flex", flexDirection: "column", minHeight: 80, flex: "0 1 50%" }}>
      {/* Header */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "8px 10px 6px 12px", flexShrink: 0,
      }}>
        <span style={{
          fontSize: 11, fontWeight: 700, color: "var(--text-secondary)",
          textTransform: "uppercase", letterSpacing: "0.08em",
          display: "flex", alignItems: "center", gap: 4,
        }}>
          <FolderOpen size={12} /> 文件
        </span>
        <button
          onClick={handleOpenFolder}
          title="打开文件夹"
          style={{
            display: "flex", alignItems: "center", justifyContent: "center",
            width: 24, height: 24, borderRadius: 6,
            color: "var(--text-secondary)", background: "transparent", cursor: "pointer",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.background = "var(--bg-hover)")}
          onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
        >
          <FolderOpen size={13} />
        </button>
      </div>

      {/* Tree */}
      <div style={scrollContainerStyle}>
        {tree.length === 0 ? (
          <div style={{
            display: "flex", flexDirection: "column", alignItems: "center",
            justifyContent: "center", padding: "16px 0", gap: 8,
            color: "var(--text-secondary)", fontSize: 12, opacity: 0.5,
          }}>
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

      {fileContextMenu && (
        <ContextMenu
          x={fileContextMenu.x}
          y={fileContextMenu.y}
          items={[
            {
              label: fileContextMenu.node.isDir ? "删除文件夹" : "删除文件",
              icon: <Trash2 size={14} />,
              danger: true,
              action: () => setConfirmDelete(fileContextMenu.node),
            },
          ]}
          onClose={() => setFileContextMenu(null)}
        />
      )}

      <Modal
        isOpen={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
        title={confirmDelete?.isDir ? "删除文件夹" : "删除文件"}
        maxWidth="420px"
        showClose={false}
      >
        <p style={{ fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.6, margin: 0 }}>
          确定要删除「{confirmDelete?.name}」吗？此操作不可撤销。
        </p>
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 20 }}>
          <button
            onClick={() => setConfirmDelete(null)}
            style={{
              padding: "7px 16px", borderRadius: 8, fontSize: 13,
              background: "var(--bg-hover)", color: "var(--text-primary)", cursor: "pointer", border: "none",
            }}
          >
            取消
          </button>
          <button
            onClick={handleConfirmDelete}
            style={{
              padding: "7px 16px", borderRadius: 8, fontSize: 13,
              background: "var(--error)", color: "#fff", cursor: "pointer", border: "none", fontWeight: 600,
            }}
          >
            删除
          </button>
        </div>
      </Modal>
    </div>
  );
}
