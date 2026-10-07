import React, { useState, useEffect, useRef } from "react";
import { FolderOpen, FileText, ChevronRight, ChevronDown, Plus, Search, StickyNote, Trash2, Eye, EyeOff, Shield, FolderMinus } from "lucide-react";
import { useEditorStore } from "@/store/editorStore";
import { useTabStore } from "@/store/tabStore";
import TabItem from "@/components/TabBar/TabItem";
import TabContextMenu from "@/components/TabBar/TabContextMenu";
import ContextMenu from "@/components/Common/ContextMenu";
import Modal from "@/components/Common/Modal";
import { removeNodeByPath, findTabsForDeletion, buildTargetPath, isSameOrAncestorPath, moveNodeInTree, buildMovedPath, buildFileTreeNodes, buildFolderRoot, filterHiddenPreservingRoot, filterTreeByQuery, syncFolderRoots } from "./fileTreeUtils";
import { FILE_RENAMED_EVENT, renameTabPersisted } from "@/utils/tabRename";
import { classifyFileExtension } from "@/utils/quarantine";
import { toast } from "@/utils/toast";
import { fileSizeLimitMessage, getFileSizeBytes, isFileSizeOverLimit } from "@/utils/fileSize";
import { scrollContainerStyle } from "./panelLayout";
import type { TabColor, FileTreeNode } from "@/types";

type TreeNode = FileTreeNode;

/**
 * 侧边栏内容面板：便签列表与文件树是两个独立面板（SidebarRail 分别有入口），
 * 不再上下叠放。导出 NotesPanel / FileTreePanel 供 SidebarContent 按 activeSidebarView 渲染。
 */

export default function NotesPanel() {
  return <NotesSection />;
}

export function FileTreePanel() {
  return <FileTreeSection />;
}

/* ──────────── 便签区域 ──────────── */
function NotesSection() {
  const tabs = useTabStore((s) => s.tabs);
  const activeTabId = useTabStore((s) => s.activeTabId);
  const addTab = useTabStore((s) => s.addTab);
  const closeTab = useTabStore((s) => s.closeTab);
  const setActiveTab = useTabStore((s) => s.setActiveTab);
  const setTabColor = useTabStore((s) => s.setTabColor);
  const closeOthers = useTabStore((s) => s.closeOthers);
  const closeAll = useTabStore((s) => s.closeAll);
  const reorderTabs = useTabStore((s) => s.reorderTabs);
  const togglePinTab = useTabStore((s) => s.togglePinTab);

  const [filter, setFilter] = useState("");
  const [showSearch, setShowSearch] = useState(false);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; tabId: string } | null>(null);

  // 拖拽排序状态：dragIndex 为拖起项在列表中的索引；indicator 为当前落点（行 + 上/下）
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [indicator, setIndicator] = useState<{ index: number; pos: "above" | "below" } | null>(null);
  const indicatorRef = useRef(indicator);
  indicatorRef.current = indicator;
  // 搜索过滤时列表是子集、索引与 store 不对齐，禁用拖拽
  const dragEnabled = !filter;

  const handleDragStart = (index: number) => (e: React.DragEvent) => {
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", tabs[index]?.name ?? "");
    setDragIndex(index);
  };

  const handleDragOver = (index: number) => (e: React.DragEvent) => {
    if (dragIndex === null) return;
    // 置顶区 ↔ 普通区禁止跨区：不 preventDefault，光标显示禁行且不会触发 drop
    if (!!tabs[index]?.pinned !== !!tabs[dragIndex]?.pinned) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    const rect = e.currentTarget.getBoundingClientRect();
    const pos: "above" | "below" = e.clientY < rect.top + rect.height / 2 ? "above" : "below";
    setIndicator((prev) => (prev && prev.index === index && prev.pos === pos ? prev : { index, pos }));
  };

  const handleDragLeave = (index: number) => () => {
    setIndicator((prev) => (prev && prev.index === index ? null : prev));
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const drop = indicatorRef.current;
    if (dragIndex !== null && drop) {
      const to = drop.index + (drop.pos === "below" ? 1 : 0);
      // moveTab 为 splice 语义（先移除再插入），源在目标之前时插入点前移一位
      reorderTabs(dragIndex, dragIndex < to ? to - 1 : to);
    }
    setDragIndex(null);
    setIndicator(null);
  };

  const handleDragEnd = () => {
    setDragIndex(null);
    setIndicator(null);
  };

  const filtered = filter
    ? tabs.filter((t) => t.name.toLowerCase().includes(filter.toLowerCase()))
    : tabs;

  // 置顶区与普通区之间的分隔线：画在「最后一张置顶便签」与「第一张普通便签」之间
  const showGroupDivider = (i: number) =>
    i > 0 && !filtered[i].pinned && !!filtered[i - 1]?.pinned;

  return (
    <div style={{ display: "flex", flexDirection: "column", flex: 1, minHeight: 0 }}>
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
          filtered.map((tab, i) => (
            <React.Fragment key={tab.id}>
              {showGroupDivider(i) && (
                <div style={{ height: 1, background: "var(--border)", margin: "3px 10px" }} />
              )}
              <TabItem
                tab={tab}
                isActive={tab.id === activeTabId}
                onSelect={() => setActiveTab(tab.id)}
                onClose={() => closeTab(tab.id)}
                onRename={(name) => {
                  // 关联磁盘文件的便签：磁盘文件一并重命名；失败提示且不改显示名
                  renameTabPersisted(tab, name).catch((err) => window.alert(`重命名失败：${err}`));
                }}
                onContextMenu={(e) => {
                  e.preventDefault();
                  setContextMenu({ x: e.clientX, y: e.clientY, tabId: tab.id });
                }}
                dragDisabled={!dragEnabled}
                dropIndicator={indicator?.index === i ? indicator.pos : null}
                onDragStart={dragEnabled ? handleDragStart(i) : undefined}
                onDragOver={dragEnabled ? handleDragOver(i) : undefined}
                onDragLeave={dragEnabled ? handleDragLeave(i) : undefined}
                onDrop={dragEnabled ? handleDrop : undefined}
                onDragEnd={dragEnabled ? handleDragEnd : undefined}
              />
            </React.Fragment>
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
          pinned={!!tabs.find((t) => t.id === contextMenu.tabId)?.pinned}
          onClose={() => setContextMenu(null)}
          onRename={() => {}}
          onTogglePin={() => togglePinTab(contextMenu.tabId)}
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

/* ──────────── 文件树区域（多目录工作区：每个打开的目录是一个根节点） ──────────── */
function FileTreeSection() {
  const openFolders = useEditorStore((s) => s.openFolders);
  const addOpenFolder = useEditorStore((s) => s.addOpenFolder);
  const removeOpenFolder = useEditorStore((s) => s.removeOpenFolder);
  const addTab = useTabStore((s) => s.addTab);
  const tabs = useTabStore((s) => s.tabs);
  const closeTab = useTabStore((s) => s.closeTab);
  const [tree, setTree] = useState<TreeNode[]>([]);
  const treeRef = useRef<TreeNode[]>([]);
  treeRef.current = tree;
  const [fileContextMenu, setFileContextMenu] = useState<{ x: number; y: number; node: TreeNode } | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<TreeNode | null>(null);
  const [dragOverPath, setDragOverPath] = useState<string | null>(null);
  const [fileSearchQuery, setFileSearchQuery] = useState("");
  const [showFileSearch, setShowFileSearch] = useState(false);
  const [showHidden, setShowHidden] = useState(() => {
    try { return localStorage.getItem("npp-show-hidden") === "true"; } catch { return false; }
  });
  const setFilePath = useTabStore((s) => s.setFilePath);

  const toggleShowHidden = () => {
    setShowHidden((prev) => {
      const next = !prev;
      try { localStorage.setItem("npp-show-hidden", String(next)); } catch { /* ignore */ }
      return next;
    });
  };

  const loadRoot = async (folderPath: string): Promise<TreeNode | null> => {
    try {
      const { invoke } = await import("@tauri-apps/api/core");
      const entries = await invoke<Array<{ name: string; path: string; is_dir: boolean }>>("list_directory", { path: folderPath });
      // 打开的文件夹本身作为根节点，子项收在其下展开
      return buildFolderRoot(folderPath, entries)[0];
    } catch { return null; /* 文件夹可能已不存在 */ }
  };

  const handleOpenFolder = async () => {
    try {
      const { invoke } = await import("@tauri-apps/api/core");
      const path = await invoke<string | null>("open_folder_dialog");
      if (path) {
        addOpenFolder(path); // openFolders 变化会触发下方同步 effect 追加根节点
      }
    } catch { /* Dev mode fallback */ }
  };

  // openFolders 变化（打开/拖入/移除目录 / 启动恢复）时同步根节点：
  // 追加新目录的根节点，移除已关闭目录的根节点；已有根节点的展开状态原样保留
  useEffect(() => {
    let cancelled = false;
    setTree((prev) => syncFolderRoots(prev, openFolders).next);
    const { toLoad } = syncFolderRoots(treeRef.current, openFolders);
    const loadMissing = async () => {
      for (const p of toLoad) {
        const root = await loadRoot(p);
        if (cancelled || !root) continue;
        setTree((prev) => (prev.some((r) => r.path === root.path) ? prev : [...prev, root]));
      }
    };
    void loadMissing();
    return () => { cancelled = true; };
    // 仅依赖 openFolders，避免每次渲染重复同步
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openFolders]);

  // 便签重命名磁盘文件后，刷新文件所在的目录，避免文件树显示旧文件名
  useEffect(() => {
    const handler = (e: Event) => {
      const dir = (e as CustomEvent).detail?.dir;
      if (typeof dir === "string") void refreshDir(dir);
    };
    window.addEventListener(FILE_RENAMED_EVENT, handler);
    return () => window.removeEventListener(FILE_RENAMED_EVENT, handler);
    // refreshDir 通过函数式 setTree 更新状态，此处仅需绑定一次
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const toggleNode = async (node: TreeNode) => {
    if (!node.isDir) {
      try {
        const { invoke } = await import("@tauri-apps/api/core");
        // 打开前检查文件大小，超限则提示并阻止读取内容
        const sizeBytes = await getFileSizeBytes(node.path);
        if (sizeBytes !== null && isFileSizeOverLimit(sizeBytes)) {
          toast(fileSizeLimitMessage(sizeBytes), { type: "error" });
          return;
        }
        // 打开前先移除 macOS 隔离属性，避免下载的文件弹出安全警告
        const safety = classifyFileExtension(node.name);
        if (safety !== "caution") {
          invoke("remove_quarantine", { path: node.path, recursive: false }).catch(() => {});
        }
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
      // 删除的是打开的根目录时，同步从工作区移除，避免下次同步又加载回来
      if (openFolders.includes(target.path)) removeOpenFolder(target.path);
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
                children: buildFileTreeNodes(entries),
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
      void refreshDir(target.path);
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

  const filteredTree = (() => {
    let result = tree;
    if (!showHidden) result = filterHiddenPreservingRoot(result);
    if (fileSearchQuery) result = filterTreeByQuery(result, fileSearchQuery);
    return result;
  })();

  return (
    <div style={{ display: "flex", flexDirection: "column", flex: 1, minHeight: 0 }}>
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
        <div style={{ display: "flex", gap: 2 }}>
          <button
            onClick={() => { setShowFileSearch(!showFileSearch); if (showFileSearch) setFileSearchQuery(""); }}
            title="搜索文件"
            style={{
              display: "flex", alignItems: "center", justifyContent: "center",
              width: 24, height: 24, borderRadius: 6,
              color: showFileSearch ? "var(--accent)" : "var(--text-secondary)",
              background: showFileSearch ? "var(--bg-hover)" : "transparent",
              cursor: "pointer",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = "var(--bg-hover)")}
            onMouseLeave={(e) => { if (!showFileSearch) e.currentTarget.style.background = "transparent"; }}
          >
            <Search size={12} />
          </button>
          <button
            onClick={toggleShowHidden}
            title={showHidden ? "隐藏以点开头的文件" : "显示隐藏文件"}
            style={{
              display: "flex", alignItems: "center", justifyContent: "center",
              width: 24, height: 24, borderRadius: 6,
              color: showHidden ? "var(--accent)" : "var(--text-secondary)",
              background: showHidden ? "var(--bg-hover)" : "transparent",
              cursor: "pointer",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = "var(--bg-hover)")}
            onMouseLeave={(e) => { if (!showHidden) e.currentTarget.style.background = "transparent"; }}
          >
            {showHidden ? <Eye size={12} /> : <EyeOff size={12} />}
          </button>
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
      </div>

      {/* Search input */}
      {showFileSearch && tree.length > 0 && (
        <div style={{ padding: "4px 10px", flexShrink: 0 }}>
          <input
            value={fileSearchQuery}
            onChange={(e) => setFileSearchQuery(e.target.value)}
            placeholder="搜索文件或文件夹..."
            autoFocus
            style={{
              width: "100%", padding: "4px 8px", fontSize: 12,
              background: "var(--bg-primary)", border: "1px solid var(--border)",
              borderRadius: 6, color: "var(--text-primary)", outline: "none",
            }}
          />
        </div>
      )}

      {/* Tree */}
      <div style={scrollContainerStyle}>
        {tree.length === 0 ? (
          <div style={{
            display: "flex", flexDirection: "column", alignItems: "center",
            justifyContent: "center", padding: "24px 12px", gap: 10,
            color: "var(--text-secondary)", fontSize: 12,
          }}>
            <FolderOpen size={26} style={{ opacity: 0.4 }} />
            <span style={{ opacity: 0.7 }}>未打开文件夹</span>
            <button
              onClick={handleOpenFolder}
              style={{
                padding: "7px 16px", borderRadius: 8, fontSize: 12, fontWeight: 600,
                background: "var(--accent)", color: "#fff", cursor: "pointer", border: "none",
              }}
            >
              打开文件夹
            </button>
          </div>
        ) : (
          filteredTree.length === 0 ? (
            <div style={{
              display: "flex", alignItems: "center", justifyContent: "center",
              padding: "24px 12px", color: "var(--text-secondary)", fontSize: 12, opacity: 0.6,
            }}>
              没有匹配的文件
            </div>
          ) : (
            filteredTree.map((node) => renderNode(node))
          )
        )}
      </div>

      {fileContextMenu && (
        <ContextMenu
          x={fileContextMenu.x}
          y={fileContextMenu.y}
          items={[
            ...(openFolders.includes(fileContextMenu.node.path)
              ? [{
                  label: "从文件面板移除（不删除磁盘文件）",
                  icon: <FolderMinus size={14} />,
                  action: () => removeOpenFolder(fileContextMenu.node.path),
                }]
              : []),
            {
              label: fileContextMenu.node.isDir ? "清除文件夹隔离属性" : "清除隔离属性",
              icon: <Shield size={14} />,
              action: () => {
                const node = fileContextMenu.node;
                import("@tauri-apps/api/core").then(({ invoke }) => {
                  invoke("remove_quarantine", { path: node.path, recursive: node.isDir })
                    .then(() => {
                      // 静默成功
                    })
                    .catch((err) => {
                      window.alert("清除隔离属性失败：" + err);
                    });
                }).catch(() => {});
              },
            },
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
