import React, { useState } from "react";
import { useEditorStore } from "@/store/editorStore";
import Sidebar from "./Sidebar";
import StatusBar from "./StatusBar";
import EditorContainer from "@/components/Editor/EditorContainer";
import FindReplace from "@/components/Search/FindReplace";
import DiffView from "@/components/Diff/DiffView";
import CommandPalette from "@/components/CommandPalette/CommandPalette";
import QuickOpen from "@/components/Search/QuickOpen";
import GoToLine from "@/components/Search/GoToLine";
import SettingsPanel from "@/components/Settings/SettingsPanel";
import TerminalPanel from "@/components/Terminal/TerminalPanel";

export default function MainLayout() {
  const sidebarVisible = useEditorStore((s) => s.sidebarVisible);
  const terminalVisible = useEditorStore((s) => s.terminalVisible);
  const settingsOpen = useEditorStore((s) => s.settingsOpen);
  const commandPaletteOpen = useEditorStore((s) => s.commandPaletteOpen);
  const quickOpenOpen = useEditorStore((s) => s.quickOpenOpen);
  const goToLineOpen = useEditorStore((s) => s.goToLineOpen);
  const diffViewOpen = useEditorStore((s) => s.diffViewOpen);
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
    <div style={{ display: "flex", flexDirection: "column", width: "100vw", height: "100vh", overflow: "hidden" }}>
      <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
        {/* Sidebar */}
        {sidebarVisible && (
          <div
            style={{
              width: sidebarWidth, flexShrink: 0,
              borderRight: "1px solid var(--border)",
              display: "flex", overflow: "hidden",
            }}
          >
            <Sidebar />
          </div>
        )}

        {/* Resize handle */}
        {sidebarVisible && (
          <div
            onMouseDown={handleMouseDown}
            style={{
              width: 4, cursor: "col-resize", flexShrink: 0,
              background: isResizing ? "var(--accent)" : "transparent",
              transition: isResizing ? "none" : "background 0.2s",
            }}
            onMouseEnter={(e) => { if (!isResizing) e.currentTarget.style.background = "var(--border)"; }}
            onMouseLeave={(e) => { if (!isResizing) e.currentTarget.style.background = "transparent"; }}
          />
        )}

        {/* Main area */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", minWidth: 0 }}>
          {/* Search bar overlay */}
          <FindReplace />

          {/* Editor */}
          {diffViewOpen ? <DiffView /> : <EditorContainer />}

          {/* Terminal */}
          {terminalVisible && <TerminalPanel />}
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
