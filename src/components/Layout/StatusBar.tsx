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
        height: 24, padding: "0 12px", fontSize: 11,
        background: "var(--bg-secondary)", borderTop: "1px solid var(--border)",
        color: "var(--text-secondary)", flexShrink: 0,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        {cursorPos && (
          <span>行 {cursorPos.line}, 列 {cursorPos.column}</span>
        )}
        {tab && <span style={{ opacity: 0.6 }}>|</span>}
        {tab && <span>{tab.content.split("\n").length} 行</span>}
        {tab && <span style={{ opacity: 0.6 }}>|</span>}
        {tab && <span>{tab.content.length} 字符</span>}
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        {tab && <span>{getEncodingLabel(tab.encoding)}</span>}
        {tab && <span>{tab.lineEnding}</span>}
        {tab && <span>{tab.indentType === "tab" ? "制表符" : `${tab.indentSize} 空格`}</span>}
      </div>
    </div>
  );
}
