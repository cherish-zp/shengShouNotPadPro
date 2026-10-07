import React from "react";
import { FileText, Plus, Upload } from "lucide-react";
import { useTabStore } from "@/store/tabStore";
import { useEditorStore } from "@/store/editorStore";
import { useFileDrop } from "@/hooks/useFileDrop";
import CodeEditor from "./CodeEditor";
import MarkdownPreview from "./MarkdownPreview";

export default function EditorContainer() {
  const activeTabId = useTabStore((s) => s.activeTabId);
  const tabs = useTabStore((s) => s.tabs);
  const activeTab = useTabStore((s) => s.tabs.find((t) => t.id === s.activeTabId));
  const addTab = useTabStore((s) => s.addTab);
  const markdownPreviewVisible = useEditorStore((s) => s.markdownPreviewVisible);
  const { isDragging } = useFileDrop();

  const isMarkdown = activeTab?.language === "markdown";
  const showPreview = isMarkdown && markdownPreviewVisible;

  const dropOverlay = isDragging ? (
    <div
      style={{
        position: "absolute", inset: 0, zIndex: 50,
        display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center", gap: 12,
        background: "rgba(37, 99, 235, 0.12)",
        border: "2px dashed var(--accent)",
        borderRadius: 8,
        pointerEvents: "none",
        color: "var(--accent)",
      }}
    >
      <Upload size={36} />
      <div style={{ fontSize: 14, fontWeight: 600 }}>松开以打开文件</div>
      <div style={{ fontSize: 12, opacity: 0.8 }}>图片将插入当前便签，其他文件作为便签打开</div>
    </div>
  ) : null;

  if (!activeTabId || tabs.length === 0) {
    return (
      <div
        style={{
          position: "relative",
          flex: 1, display: "flex", flexDirection: "column",
          alignItems: "center", justifyContent: "center", gap: 24,
          background: "var(--bg-primary)", color: "var(--text-secondary)",
        }}
      >
        <FileText size={64} style={{ opacity: 0.2 }} />
        <div style={{ textAlign: "center" }}>
          <h2 style={{ fontSize: 20, fontWeight: 600, marginBottom: 8, color: "var(--text-primary)", opacity: 0.7 }}>圣手编辑器</h2>
          <p style={{ fontSize: 13, marginBottom: 24, opacity: 0.5 }}>妙手 · 轻量 · 极速</p>
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
          <span>拖入文件 — 自动打开为便签</span>
        </div>
        {dropOverlay}
      </div>
    );
  }

  return (
    <div style={{ position: "relative", flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
      {showPreview && activeTab ? (
        <MarkdownPreview content={activeTab.content} filePath={activeTab.filePath} />
      ) : (
        <CodeEditor tabId={activeTabId} />
      )}
      {dropOverlay}
    </div>
  );
}
