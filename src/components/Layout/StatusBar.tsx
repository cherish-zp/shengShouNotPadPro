import React from "react";
import { useTabStore, getTabLineCount } from "@/store/tabStore";
import { useEditorStore } from "@/store/editorStore";
import { getEncodingLabel } from "@/utils/encoding";
import {
  formatFileSize,
  formatFileSizeTooltip,
} from "@/utils/fileSize";
import { useFileSize } from "@/hooks/useFileSize";

export default function StatusBar() {
  const activeTabId = useTabStore((s) => s.activeTabId);
  const tab = useTabStore((s) => s.tabs.find((t) => t.id === activeTabId));
  const cursorPos = useEditorStore((s) => s.cursorPositions[activeTabId || ""]);

  // tab id / 路径 / dirty 状态任一变化时重新获取文件大小
  // （保存、重置、重命名、另存/打开都会改变这些字段）
  const size = useFileSize(
    tab?.filePath,
    `${tab?.id ?? ""}:${tab?.filePath ?? ""}:${tab?.dirty ? 1 : 0}`
  );
  const sizeLabel = formatFileSize(size);
  const sizeTooltip = formatFileSizeTooltip(size);

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
        {tab && (
          <span style={{ opacity: 0.7 }}>
            {(getTabLineCount?.(tab.id) ?? tab.content.split("\n").length)} 行
          </span>
        )}
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        {tab?.filePath && sizeLabel && (
          <span
            style={{ opacity: 0.6 }}
            title={sizeTooltip ?? undefined}
          >
            {sizeLabel}
          </span>
        )}
        {tab?.filePath && sizeLabel && <span style={{ opacity: 0.2 }}>·</span>}
        {tab && <span style={{ opacity: 0.6 }}>{getEncodingLabel(tab.encoding)}</span>}
        {tab && <span style={{ opacity: 0.2 }}>·</span>}
        {tab && <span style={{ opacity: 0.6 }}>{tab.lineEnding}</span>}
        {tab && <span style={{ opacity: 0.2 }}>·</span>}
        {tab && <span style={{ opacity: 0.6 }}>{tab.indentType === "tab" ? "Tab" : `${tab.indentSize} 空格`}</span>}
      </div>
    </div>
  );
}
