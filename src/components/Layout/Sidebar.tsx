import React from "react";
import { FileText, FolderOpen, Search, GitBranch, Wrench, Puzzle, Settings } from "lucide-react";
import { useEditorStore } from "@/store/editorStore";
import TabList from "@/components/TabBar/TabList";
import FileTree from "@/components/FileTree/FileTree";
import GlobalSearch from "@/components/Search/GlobalSearch";
import ToolsPanel from "@/components/Tools/ToolsPanel";
import PluginPanel from "@/components/PluginManager/PluginPanel";

const VIEWS = [
  { id: "tabs" as const, icon: FileText, label: "便签" },
  { id: "files" as const, icon: FolderOpen, label: "文件" },
  { id: "search" as const, icon: Search, label: "搜索" },
  { id: "tools" as const, icon: Wrench, label: "工具" },
  { id: "plugins" as const, icon: Puzzle, label: "插件" },
];

export default function Sidebar() {
  const activeView = useEditorStore((s) => s.activeSidebarView);
  const setActiveView = useEditorStore((s) => s.setActiveSidebarView);
  const setSettingsOpen = useEditorStore((s) => s.setSettingsOpen);

  const renderContent = () => {
    switch (activeView) {
      case "tabs": return <TabList />;
      case "files": return <FileTree />;
      case "search": return <GlobalSearch />;
      case "tools": return <ToolsPanel />;
      case "plugins": return <PluginPanel />;
      default: return <TabList />;
    }
  };

  return (
    <div style={{ display: "flex", height: "100%", background: "var(--bg-primary)" }}>
      {/* Icon bar */}
      <div
        style={{
          width: 44, display: "flex", flexDirection: "column", alignItems: "center",
          padding: "8px 0", gap: 2,
          borderRight: "1px solid var(--border)", flexShrink: 0,
        }}
      >
        {VIEWS.map(({ id, icon: Icon, label }) => (
          <button
            key={id}
            onClick={() => setActiveView(id)}
            title={label}
            style={{
              display: "flex", alignItems: "center", justifyContent: "center",
              width: 34, height: 34, borderRadius: 8,
              color: activeView === id ? "var(--accent)" : "var(--text-secondary)",
              background: activeView === id ? "var(--bg-hover)" : "transparent",
              cursor: "pointer",
              transition: "all 0.15s",
            }}
            onMouseEnter={(e) => { if (activeView !== id) e.currentTarget.style.background = "var(--bg-hover)"; }}
            onMouseLeave={(e) => { if (activeView !== id) e.currentTarget.style.background = "transparent"; }}
          >
            <Icon size={18} />
          </button>
        ))}
        <div style={{ flex: 1 }} />
        <button
          onClick={() => setSettingsOpen(true)}
          title="设置"
          style={{
            display: "flex", alignItems: "center", justifyContent: "center",
            width: 34, height: 34, borderRadius: 8,
            color: "var(--text-secondary)", cursor: "pointer",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.background = "var(--bg-hover)")}
          onMouseLeave={(e) => (e.currentTarget.style.background = "none")}
        >
          <Settings size={18} />
        </button>
      </div>

      {/* Content panel */}
      <div
        style={{
          flex: 1, overflow: "hidden", display: "flex", flexDirection: "column",
          minWidth: 0,
          background: "var(--bg-primary)",
        }}
      >
        {renderContent()}
      </div>
    </div>
  );
}
