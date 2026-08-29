import React from "react";
import { useTabStore } from "@/store/tabStore";
import { useEditorStore } from "@/store/editorStore";
import { getEncodingLabel } from "@/utils/encoding";

export default function StatusBar() {
  const activeTabId = useTabStore((s) => s.activeTabId);
  const tab = useTabStore((s) => s.tabs.find((t) => t.id === activeTabId));
  const cursorPos = useEditorStore((s) => s.cursorPositions[activeTabId || ""]);

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        height: 24,
        padding: "0 14px",
        fontSize: 11,
        background: "var(--glass-bg)",
        WebkitBackdropFilter: "var(--glass-blur)",
        backdropFilter: "var(--glass-blur)",
        borderTop: "0.5px solid var(--border)",
        color: "var(--text-secondary)",
        flexShrink: 0,
        fontVariantNumeric: "tabular-nums",
        zIndex: 10,
        position: "relative",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        {cursorPos && (
          <span style={{ opacity: 0.7 }}>行 {cursorPos.line}</span>
        )}
        {cursorPos && <span style={{ opacity: 0.3 }}>·</span>}
        {cursorPos && (
          <span style={{ opacity: 0.7 }}>列 {cursorPos.column}</span>
        )}
        {tab && <span style={{ opacity: 0.2 }}>·</span>}
        {tab && <span style={{ opacity: 0.7 }}>{tab.content.split("\n").length} 行</span>}
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        {tab && <span style={{ opacity: 0.6 }}>{getEncodingLabel(tab.encoding)}</span>}
        {tab && <span style={{ opacity: 0.2 }}>·</span>}
        {tab && <span style={{ opacity: 0.6 }}>{tab.lineEnding}</span>}
        {tab && <span style={{ opacity: 0.2 }}>·</span>}
        {tab && <span style={{ opacity: 0.6 }}>{tab.indentType === "tab" ? "Tab" : `${tab.indentSize} 空格`}</span>}
      </div>
    </div>
  );
}
