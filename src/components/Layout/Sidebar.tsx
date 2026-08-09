import React from "react";
import { FileText, Search, Wrench, Puzzle, Settings } from "lucide-react";
import { useEditorStore } from "@/store/editorStore";
import FilePanel from "@/components/FileTree/FilePanel";
import GlobalSearch from "@/components/Search/GlobalSearch";
import ToolsPanel from "@/components/Tools/ToolsPanel";
import PluginPanel from "@/components/PluginManager/PluginPanel";

const VIEWS = [
  { id: "files" as const, icon: FileText, label: "文件" },
  { id: "search" as const, icon: Search, label: "搜索" },
  { id: "tools" as const, icon: Wrench, label: "工具" },
  { id: "plugins" as const, icon: Puzzle, label: "插件" },
];

/**
 * 固定显示的左侧图标栏：始终可见（不受 sidebarVisible 影响）。
 * 点击图标会展开侧边栏内容面板并切换到对应视图，确保侧边栏不会被「弄丢」。
 */
export function SidebarRail() {
  const activeView = useEditorStore((s) => s.activeSidebarView);
  const openSidebarView = useEditorStore((s) => s.openSidebarView);
  const setSettingsOpen = useEditorStore((s) => s.setSettingsOpen);

  const isActive = (id: string) => activeView === id || (activeView === "tabs" && id === "files");

  return (
    <div
      style={{
        width: 48, display: "flex", flexDirection: "column", alignItems: "center",
        padding: "10px 0", gap: 4,
        borderRight: "1px solid var(--border)", flexShrink: 0,
        background: "var(--bg-primary)",
      }}
    >
      {VIEWS.map(({ id, icon: Icon, label }) => {
        const active = isActive(id);
        return (
          <button
            key={id}
            onClick={() => openSidebarView(id)}
            title={label}
            style={{
              display: "flex", alignItems: "center", justifyContent: "center",
              width: 36, height: 36, borderRadius: 10,
              color: active ? "var(--accent)" : "var(--text-secondary)",
              background: active ? "var(--selection)" : "transparent",
              cursor: "pointer",
              transition: "all 180ms cubic-bezier(0.4, 0, 0.2, 1)",
              boxShadow: active ? "var(--accent-glow)" : "none",
            }}
            onMouseEnter={(e) => { if (!active) { e.currentTarget.style.background = "var(--bg-hover)"; e.currentTarget.style.color = "var(--text-primary)"; } }}
            onMouseLeave={(e) => { if (!active) { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "var(--text-secondary)"; } }}
          >
            <Icon size={19} />
          </button>
        );
      })}
      <div style={{ flex: 1 }} />
      <button
        onClick={() => setSettingsOpen(true)}
        title="设置"
        style={{
          display: "flex", alignItems: "center", justifyContent: "center",
          width: 36, height: 36, borderRadius: 10,
          color: "var(--text-secondary)", cursor: "pointer",
          transition: "all 180ms cubic-bezier(0.4, 0, 0.2, 1)",
        }}
        onMouseEnter={(e) => { e.currentTarget.style.background = "var(--bg-hover)"; e.currentTarget.style.color = "var(--text-primary)"; }}
        onMouseLeave={(e) => { e.currentTarget.style.background = "none"; e.currentTarget.style.color = "var(--text-secondary)"; }}
      >
        <Settings size={19} />
      </button>
    </div>
  );
}

/** 侧边栏内容面板：按当前视图渲染（仅在 sidebarVisible 时由 MainLayout 挂载） */
export function SidebarContent() {
  const activeView = useEditorStore((s) => s.activeSidebarView);
  const view = activeView === "tabs" ? "files" : activeView;
  return (
    <div
      style={{
        flex: 1, overflow: "hidden", display: "flex", flexDirection: "column",
        minWidth: 0, background: "var(--bg-primary)",
      }}
    >
      {view === "files" ? <FilePanel /> : view === "search" ? <GlobalSearch /> : view === "tools" ? <ToolsPanel /> : view === "plugins" ? <PluginPanel /> : <FilePanel />}
    </div>
  );
}
