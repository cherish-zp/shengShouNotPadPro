import React from "react";
import { FileText, Plus } from "lucide-react";
import { useTabStore } from "@/store/tabStore";
import EditorToolbar from "./EditorToolbar";
import CodeEditor from "./CodeEditor";

export default function EditorContainer() {
  const activeTabId = useTabStore((s) => s.activeTabId);
  const tabs = useTabStore((s) => s.tabs);
  const addTab = useTabStore((s) => s.addTab);

  if (!activeTabId || tabs.length === 0) {
    return (
      <div
        style={{
          flex: 1, display: "flex", flexDirection: "column",
          alignItems: "center", justifyContent: "center", gap: 24,
          background: "var(--bg-primary)", color: "var(--text-secondary)",
        }}
      >
        <FileText size={64} style={{ opacity: 0.2 }} />
        <div style={{ textAlign: "center" }}>
          <h2 style={{ fontSize: 20, fontWeight: 600, marginBottom: 8, color: "var(--text-primary)", opacity: 0.7 }}>NovaEdit</h2>
          <p style={{ fontSize: 13, marginBottom: 24, opacity: 0.5 }}>轻量 · 极速 · 便签编辑器</p>
        </div>
        <button
          onClick={() => addTab()}
          style={{
            display: "flex", alignItems: "center", gap: 8,
            padding: "10px 20px", borderRadius: 8,
            background: "var(--accent)", color: "var(--bg-primary)",
            fontSize: 14, fontWeight: 500,
            cursor: "pointer",
            transition: "all 0.2s",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.background = "var(--accent-hover)")}
          onMouseLeave={(e) => (e.currentTarget.style.background = "var(--accent)")}
        >
          <Plus size={16} /> 新建便签
        </button>
        <div style={{ marginTop: 32, display: "flex", flexDirection: "column", gap: 6, fontSize: 12, opacity: 0.4 }}>
          <span>⌘ N — 新建便签</span>
          <span>⌘ S — 保存文件</span>
          <span>⌘ P — 快速打开</span>
          <span>⌘ ⇧ P — 命令面板</span>
          <span>⌘ B — 切换侧边栏</span>
        </div>
      </div>
    );
  }

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
      <EditorToolbar tabId={activeTabId} />
      <CodeEditor tabId={activeTabId} />
    </div>
  );
}
