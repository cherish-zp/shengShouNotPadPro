import React, { useState, useRef, useEffect } from "react";
import { useEditorStore } from "@/store/editorStore";
import { useTabStore } from "@/store/tabStore";
import { FileText } from "lucide-react";

export default function QuickOpen() {
  const isOpen = useEditorStore((s) => s.quickOpenOpen);
  const setOpen = useEditorStore((s) => s.setQuickOpenOpen);
  const tabs = useTabStore((s) => s.tabs);
  const setActiveTab = useTabStore((s) => s.setActiveTab);
  const [query, setQuery] = useState("");
  const [selectedIdx, setSelectedIdx] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const filtered = query
    ? tabs.filter((t) => t.name.toLowerCase().includes(query.toLowerCase()))
    : tabs;

  useEffect(() => {
    if (isOpen) {
      setQuery("");
      setSelectedIdx(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSelect = (id: string) => {
    setActiveTab(id);
    setOpen(false);
  };

  return (
    <div
      style={{
        position: "fixed", inset: 0, zIndex: 1000,
        display: "flex", alignItems: "flex-start", justifyContent: "center",
        paddingTop: "12vh",
        background: "rgba(0,0,0,0.4)", backdropFilter: "blur(4px)",
        animation: "fadeIn 0.1s ease",
      }}
      onClick={() => setOpen(false)}
    >
      <div
        style={{
          width: 500, maxHeight: 400, background: "var(--bg-surface)",
          borderRadius: 12, border: "1px solid var(--border)",
          boxShadow: "0 16px 48px rgba(0,0,0,0.4)", overflow: "hidden",
          animation: "scaleIn 0.1s ease",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <input
          ref={inputRef}
          value={query}
          onChange={(e) => { setQuery(e.target.value); setSelectedIdx(0); }}
          onKeyDown={(e) => {
            if (e.key === "ArrowDown") { e.preventDefault(); setSelectedIdx((i) => Math.min(i + 1, filtered.length - 1)); }
            if (e.key === "ArrowUp") { e.preventDefault(); setSelectedIdx((i) => Math.max(i - 1, 0)); }
            if (e.key === "Enter" && filtered[selectedIdx]) handleSelect(filtered[selectedIdx].id);
            if (e.key === "Escape") setOpen(false);
          }}
          placeholder="输入文件名搜索..."
          style={{
            width: "100%", padding: "12px 16px", fontSize: 15,
            background: "transparent", border: "none",
            borderBottom: "1px solid var(--border)",
            color: "var(--text-primary)", outline: "none",
          }}
        />
        <div style={{ maxHeight: 340, overflowY: "auto" }}>
          {filtered.length === 0 ? (
            <div style={{ padding: 24, textAlign: "center", color: "var(--text-secondary)", fontSize: 13 }}>
              没有匹配的文件
            </div>
          ) : (
            filtered.map((tab, i) => (
              <button
                key={tab.id}
                onClick={() => handleSelect(tab.id)}
                style={{
                  display: "flex", alignItems: "center", gap: 10,
                  width: "100%", padding: "8px 16px", fontSize: 13,
                  background: i === selectedIdx ? "var(--bg-hover)" : "transparent",
                  color: "var(--text-primary)", cursor: "pointer", textAlign: "left",
                }}
                onMouseEnter={() => setSelectedIdx(i)}
              >
                <FileText size={14} style={{ color: "var(--text-secondary)", flexShrink: 0 }} />
                <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {tab.name}
                </span>
                {tab.dirty && <span style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--warning)" }} />}
                {tab.filePath && (
                  <span style={{ fontSize: 11, color: "var(--text-secondary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 200 }}>
                    {tab.filePath}
                  </span>
                )}
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
