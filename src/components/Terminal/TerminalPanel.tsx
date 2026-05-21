import React from "react";
import { X, Terminal } from "lucide-react";
import { useEditorStore } from "@/store/editorStore";

export default function TerminalPanel() {
  const toggleTerminal = useEditorStore((s) => s.toggleTerminal);

  return (
    <div style={{
      height: 200, borderTop: "1px solid var(--border)",
      background: "var(--bg-secondary)", display: "flex", flexDirection: "column",
      flexShrink: 0,
    }}>
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "4px 12px", borderBottom: "1px solid var(--border)",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "var(--text-secondary)" }}>
          <Terminal size={14} />
          <span>终端</span>
        </div>
        <button
          onClick={toggleTerminal}
          style={{ display: "flex", padding: 4, borderRadius: 4, color: "var(--text-secondary)", cursor: "pointer" }}
          onMouseEnter={(e) => (e.currentTarget.style.background = "var(--bg-hover)")}
          onMouseLeave={(e) => (e.currentTarget.style.background = "none")}
        >
          <X size={14} />
        </button>
      </div>
      <div style={{
        flex: 1, display: "flex", alignItems: "center", justifyContent: "center",
        color: "var(--text-secondary)", fontSize: 13, opacity: 0.5,
      }}>
        终端功能开发中...
      </div>
    </div>
  );
}
