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
        display: "flex", alignItems: "center", justifyContent: "space-between",
        height: 26, padding: "0 14px", fontSize: 11,
        background: "var(--bg-secondary)", borderTop: "1px solid var(--border)",
        color: "var(--text-secondary)", flexShrink: 0,
        letterSpacing: "0.02em",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
        {cursorPos && (
          <span style={{ opacity: 0.8 }}>行 {cursorPos.line}, 列 {cursorPos.column}</span>
        )}
        {tab && <span style={{ opacity: 0.25 }}>|</span>}
        {tab && <span style={{ opacity: 0.8 }}>{tab.content.split("\n").length} 行</span>}
        {tab && <span style={{ opacity: 0.25 }}>|</span>}
        {tab && <span style={{ opacity: 0.8 }}>{tab.content.length} 字符</span>}
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
        {tab && <span style={{ opacity: 0.7 }}>{getEncodingLabel(tab.encoding)}</span>}
        {tab && <span style={{ opacity: 0.25 }}>|</span>}
        {tab && <span style={{ opacity: 0.7 }}>{tab.lineEnding}</span>}
        {tab && <span style={{ opacity: 0.25 }}>|</span>}
        {tab && <span style={{ opacity: 0.7 }}>{tab.indentType === "tab" ? "制表符" : `${tab.indentSize} 空格`}</span>}
      </div>
    </div>
  );
}
