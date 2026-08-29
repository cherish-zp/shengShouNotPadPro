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
 * 水晶侧边栏图标栏 — 毛玻璃底 + 精准对齐
 */
export function SidebarRail() {
  const activeView = useEditorStore((s) => s.activeSidebarView);
  const openSidebarView = useEditorStore((s) => s.openSidebarView);
  const setSettingsOpen = useEditorStore((s) => s.setSettingsOpen);

  const isActive = (id: string) =>
    activeView === id || (activeView === "tabs" && id === "files");

  return (
    <div
      style={{
        width: 52,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        padding: "14px 0",
        gap: 2,
        borderRight: "0.5px solid var(--border)",
        flexShrink: 0,
        background: "var(--glass-bg)",
        WebkitBackdropFilter: "var(--glass-blur)",
        backdropFilter: "var(--glass-blur)",
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
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: 36,
              height: 36,
              borderRadius: 9,
              color: active ? "var(--accent)" : "var(--text-secondary)",
              background: active ? "var(--accent-soft)" : "transparent",
              cursor: "pointer",
              transition: "all 180ms cubic-bezier(0.4, 0, 0.2, 1)",
              position: "relative",
            }}
            onMouseEnter={(e) => {
              if (!active) {
                e.currentTarget.style.background = "var(--bg-hover)";
                e.currentTarget.style.color = "var(--text-primary)";
              }
            }}
            onMouseLeave={(e) => {
              if (!active) {
                e.currentTarget.style.background = "transparent";
                e.currentTarget.style.color = "var(--text-secondary)";
              }
            }}
          >
            {active && (
              <span
                style={{
                  position: "absolute",
                  left: -8,
                  top: "50%",
                  transform: "translateY(-50%)",
                  width: 3,
                  height: 18,
                  borderRadius: 2,
                  background: "var(--accent)",
                }}
              />
            )}
            <Icon size={18} strokeWidth={1.8} />
          </button>
        );
      })}

      <div style={{ flex: 1 }} />

      <div
        style={{
          width: 32,
          height: 0.5,
          background: "var(--divider)",
          marginBottom: 6,
        }}
      />

      <button
        onClick={() => setSettingsOpen(true)}
        title="设置"
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          width: 36,
          height: 36,
          borderRadius: 9,
          color: "var(--text-secondary)",
          cursor: "pointer",
          transition: "all 180ms cubic-bezier(0.4, 0, 0.2, 1)",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = "var(--bg-hover)";
          e.currentTarget.style.color = "var(--text-primary)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = "transparent";
          e.currentTarget.style.color = "var(--text-secondary)";
        }}
      >
        <Settings size={18} strokeWidth={1.8} />
      </button>
    </div>
  );
}

/** 水晶侧边栏内容面板 */
export function SidebarContent() {
  const activeView = useEditorStore((s) => s.activeSidebarView);
  const view = activeView === "tabs" ? "files" : activeView;

  return (
    <div
      style={{
        flex: 1,
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
        minWidth: 0,
        background: "var(--bg-primary)",
        borderRight: "0.5px solid var(--border)",
      }}
    >
      {view === "files" ? (
        <FilePanel />
      ) : view === "search" ? (
        <GlobalSearch />
      ) : view === "tools" ? (
        <ToolsPanel />
      ) : view === "plugins" ? (
        <PluginPanel />
      ) : (
        <FilePanel />
      )}
    </div>
  );
}
