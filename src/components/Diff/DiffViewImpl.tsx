/**
 * DiffView 本体实现：由 DiffView.tsx 的 React.lazy 包装按需加载，
 * 使 diff 库与本组件不进入首屏主 chunk。
 */
import { useState, useMemo } from "react";
import { useTabStore } from "@/store/tabStore";
import { useEditorStore } from "@/store/editorStore";
import { diffLines } from "diff";

export default function DiffViewImpl() {
  const tabs = useTabStore((s) => s.tabs);
  const setDiffViewOpen = useEditorStore((s) => s.setDiffViewOpen);
  const [leftTabId, setLeftTabId] = useState(tabs[0]?.id || "");
  const [rightTabId, setRightTabId] = useState(tabs[1]?.id || "");

  const leftTab = tabs.find((t) => t.id === leftTabId);
  const rightTab = tabs.find((t) => t.id === rightTabId);

  const changes = useMemo(() => {
    if (!leftTab || !rightTab) return [];
    return diffLines(leftTab.content, rightTab.content);
  }, [leftTab?.content, rightTab?.content]);

  let leftLine = 0;
  let rightLine = 0;

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
      {/* 工具栏 */}
      <div style={{
        display: "flex", alignItems: "center", gap: 12, padding: "8px 12px",
        background: "var(--bg-secondary)", borderBottom: "1px solid var(--border)", flexShrink: 0,
      }}>
        <select
          value={leftTabId}
          onChange={(e) => setLeftTabId(e.target.value)}
          style={{ padding: "4px 8px", fontSize: 12, background: "var(--bg-primary)", border: "1px solid var(--border)", borderRadius: 6, color: "var(--text-primary)" }}
        >
          <option value="">选择文件...</option>
          {tabs.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
        </select>
        <span style={{ color: "var(--text-secondary)", fontSize: 13 }}>⟷</span>
        <select
          value={rightTabId}
          onChange={(e) => setRightTabId(e.target.value)}
          style={{ padding: "4px 8px", fontSize: 12, background: "var(--bg-primary)", border: "1px solid var(--border)", borderRadius: 6, color: "var(--text-primary)" }}
        >
          <option value="">选择文件...</option>
          {tabs.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
        </select>
        <div style={{ flex: 1 }} />
        <span style={{ fontSize: 12, color: "var(--text-secondary)" }}>
          {changes.filter((c) => c.added).length} 处新增 / {changes.filter((c) => c.removed).length} 处删除
        </span>
        <button
          onClick={() => setDiffViewOpen(false)}
          style={{ padding: "4px 12px", fontSize: 12, borderRadius: 6, background: "var(--bg-hover)", color: "var(--text-primary)", cursor: "pointer" }}
        >
          关闭对比
        </button>
      </div>

      {/* 对比内容 */}
      <div style={{ flex: 1, display: "flex", overflow: "auto", fontFamily: "monospace", fontSize: 13, lineHeight: 1.6 }}>
        {/* 左侧面板 */}
        <div style={{ flex: 1, borderRight: "1px solid var(--border)" }}>
          <div style={{ padding: "4px 12px", background: "var(--bg-surface)", borderBottom: "1px solid var(--border)", fontSize: 12, color: "var(--text-secondary)" }}>
            {leftTab?.name || "未选择"} (原始)
          </div>
          <div>
            {changes.map((change, i) => {
              const lines = change.value.split("\n").filter((_, idx, arr) => idx < arr.length - 1 || arr[arr.length - 1] !== "");
              return lines.map((line, j) => {
                if (change.added) {
                  rightLine++;
                  return null;
                }
                if (change.removed) {
                  leftLine++;
                  return (
                    <div key={`${i}-${j}`} className="diff-removed" style={{ padding: "0 12px", minHeight: 21, display: "flex" }}>
                      <span style={{ width: 40, textAlign: "right", paddingRight: 12, color: "var(--text-secondary)", opacity: 0.5, flexShrink: 0, userSelect: "none" }}>{leftLine}</span>
                      <span style={{ color: "var(--error)" }}>- {line}</span>
                    </div>
                  );
                }
                leftLine++;
                rightLine++;
                return (
                  <div key={`${i}-${j}`} className="diff-neutral" style={{ padding: "0 12px", minHeight: 21, display: "flex" }}>
                    <span style={{ width: 40, textAlign: "right", paddingRight: 12, color: "var(--text-secondary)", opacity: 0.5, flexShrink: 0, userSelect: "none" }}>{leftLine}</span>
                    <span>{line}</span>
                  </div>
                );
              });
            })}
          </div>
        </div>

        {/* 右侧面板 */}
        <div style={{ flex: 1 }}>
          <div style={{ padding: "4px 12px", background: "var(--bg-surface)", borderBottom: "1px solid var(--border)", fontSize: 12, color: "var(--text-secondary)" }}>
            {rightTab?.name || "未选择"} (修改后)
          </div>
          <div>
            {(() => {
              let rl = 0;
              return changes.map((change, i) => {
                const lines = change.value.split("\n").filter((_, idx, arr) => idx < arr.length - 1 || arr[arr.length - 1] !== "");
                return lines.map((line, j) => {
                  if (change.removed) return null;
                  rl++;
                  if (change.added) {
                    return (
                      <div key={`${i}-${j}`} className="diff-added" style={{ padding: "0 12px", minHeight: 21, display: "flex" }}>
                        <span style={{ width: 40, textAlign: "right", paddingRight: 12, color: "var(--text-secondary)", opacity: 0.5, flexShrink: 0, userSelect: "none" }}>{rl}</span>
                        <span style={{ color: "var(--success)" }}>+ {line}</span>
                      </div>
                    );
                  }
                  return (
                    <div key={`${i}-${j}`} className="diff-neutral" style={{ padding: "0 12px", minHeight: 21, display: "flex" }}>
                      <span style={{ width: 40, textAlign: "right", paddingRight: 12, color: "var(--text-secondary)", opacity: 0.5, flexShrink: 0, userSelect: "none" }}>{rl}</span>
                      <span>{line}</span>
                    </div>
                  );
                });
              });
            })()}
          </div>
        </div>
      </div>
    </div>
  );
}
