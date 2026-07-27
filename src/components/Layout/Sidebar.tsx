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

export default function Sidebar() {
  const activeView = useEditorStore((s) => s.activeSidebarView);
  const setActiveView = useEditorStore((s) => s.setActiveSidebarView);
  const setSettingsOpen = useEditorStore((s) => s.setSettingsOpen);

  const renderContent = () => {
    // 旧的 "tabs" 视图兼容：自动映射到 "files"
    const view = activeView === "tabs" ? "files" : activeView;
    switch (view) {
      case "files": return <FilePanel />;
      case "search": return <GlobalSearch />;
      case "tools": return <ToolsPanel />;
      case "plugins": return <PluginPanel />;
      default: return <FilePanel />;
    }
  };

  return (
    <div style={{ display: "flex", height: "100%", background: "var(--bg-primary)" }}>
      {/* Icon bar */}
      <div
        style={{
          width: 48, display: "flex", flexDirection: "column", alignItems: "center",
          padding: "10px 0", gap: 4,
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
              width: 36, height: 36, borderRadius: 10,
              color: activeView === id ? "var(--accent)" : "var(--text-secondary)",
              background: activeView === id ? "var(--selection)" : "transparent",
              cursor: "pointer",
              transition: "all 180ms cubic-bezier(0.4, 0, 0.2, 1)",
              boxShadow: activeView === id ? "var(--accent-glow)" : "none",
            }}
            onMouseEnter={(e) => { if (activeView !== id) { e.currentTarget.style.background = "var(--bg-hover)"; e.currentTarget.style.color = "var(--text-primary)"; } }}
            onMouseLeave={(e) => { if (activeView !== id) { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "var(--text-secondary)"; } }}
          >
            <Icon size={19} />
          </button>
        ))}
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
