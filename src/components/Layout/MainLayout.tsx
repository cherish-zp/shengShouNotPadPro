import React, { useState } from "react";
import { useEditorStore } from "@/store/editorStore";
import { useTabStore } from "@/store/tabStore";
import { SidebarRail, SidebarContent } from "./Sidebar";
import StatusBar from "./StatusBar";
import EditorContainer from "@/components/Editor/EditorContainer";
import EditorToolbar from "@/components/Editor/EditorToolbar";
import FindReplace from "@/components/Search/FindReplace";
import DiffView from "@/components/Diff/DiffView";
import CommandPalette from "@/components/CommandPalette/CommandPalette";
import QuickOpen from "@/components/Search/QuickOpen";
import GoToLine from "@/components/Search/GoToLine";
import SettingsPanel from "@/components/Settings/SettingsPanel";

export default function MainLayout() {
  const sidebarVisible = useEditorStore((s) => s.sidebarVisible);
  const settingsOpen = useEditorStore((s) => s.settingsOpen);
  const commandPaletteOpen = useEditorStore((s) => s.commandPaletteOpen);
  const quickOpenOpen = useEditorStore((s) => s.quickOpenOpen);
  const goToLineOpen = useEditorStore((s) => s.goToLineOpen);
  const diffViewOpen = useEditorStore((s) => s.diffViewOpen);
  const activeTabId = useTabStore((s) => s.activeTabId);
  const [sidebarWidth, setSidebarWidth] = useState(300);
  const [isResizing, setIsResizing] = useState(false);

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
    const startX = e.clientX;
    const startWidth = sidebarWidth;

    const onMouseMove = (e: MouseEvent) => {
      const diff = e.clientX - startX;
      setSidebarWidth(Math.max(220, Math.min(600, startWidth + diff)));
    };

    const onMouseUp = () => {
      setIsResizing(false);
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseup", onMouseUp);
    };

    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseup", onMouseUp);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", width: "100vw", height: "100vh", overflow: "hidden", background: "var(--bg-primary)" }}>
      <div style={{ display: "flex", flex: 1, overflow: "hidden", position: "relative" }}>
        {/* 固定左侧图标栏：始终可见 */}
        <SidebarRail />

        {/* 侧边栏内容面板：可折叠（⌘B） */}
        {sidebarVisible && (
          <div
            style={{
              width: sidebarWidth, flexShrink: 0,
              display: "flex", overflow: "hidden",
              animation: "slideInLeft 250ms cubic-bezier(0.4, 0, 0.2, 1)",
            }}
          >
            <SidebarContent />
          </div>
        )}

        {/* Resize handle */}
        {sidebarVisible && (
          <div
            onMouseDown={handleMouseDown}
            style={{
              width: 4, cursor: "col-resize", flexShrink: 0,
              background: isResizing ? "var(--accent)" : "transparent",
              transition: isResizing ? "none" : "background 0.2s ease",
              borderRadius: 2,
              zIndex: 20,
            }}
            onMouseEnter={(e) => { if (!isResizing) e.currentTarget.style.background = "var(--border-strong)"; }}
            onMouseLeave={(e) => { if (!isResizing) e.currentTarget.style.background = "transparent"; }}
          />
        )}

        {/* Main area */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", minWidth: 0 }}>
          {/* Search bar overlay */}
          <FindReplace />

          {/* 顶部工具栏 */}
          <EditorToolbar tabId={activeTabId ?? undefined} />

          {/* 主体：编辑器 / Diff */}
          {diffViewOpen ? <DiffView /> : <EditorContainer />}
        </div>
      </div>

      {/* Status bar */}
      <StatusBar />

      {/* Modals */}
      {commandPaletteOpen && <CommandPalette />}
      {quickOpenOpen && <QuickOpen />}
      {goToLineOpen && <GoToLine />}
      {settingsOpen && <SettingsPanel />}
    </div>
  );
}
