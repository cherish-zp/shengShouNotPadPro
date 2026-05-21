import React, { useState, useRef, useEffect, useMemo } from "react";
import { X, ChevronUp, ChevronDown, Regex, CaseSensitive, Replace, ReplaceAll } from "lucide-react";
import { EditorSelection } from "@codemirror/state";
import { EditorView } from "@codemirror/view";
import { useSearchStore } from "@/store/searchStore";
import { useTabStore } from "@/store/tabStore";
import { useEditorStore } from "@/store/editorStore";

interface Match {
  from: number;
  to: number;
  line: number;
  col: number;
}

export default function FindReplace() {
  const { isOpen, mode, query, replaceQuery, caseSensitive, useRegex,
    closeSearch, setQuery, setReplaceQuery, toggleCaseSensitive, toggleRegex } = useSearchStore();
  const activeTabId = useTabStore((s) => s.activeTabId);
  const tabs = useTabStore((s) => s.tabs);
  const updateContent = useTabStore((s) => s.updateContent);
  const editorView = useEditorStore((s) => s.editorView);
  const inputRef = useRef<HTMLInputElement>(null);
  const [currentIndex, setCurrentIndex] = useState(0);

  const activeTab = tabs.find((t) => t.id === activeTabId);

  // 计算所有匹配项，使用绝对位置（from, to）
  const matches = useMemo<Match[]>(() => {
    if (!activeTab || !query) return [];
    const content = activeTab.content;
    const results: Match[] = [];

    try {
      const searchQuery = useRegex ? query : query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const re = new RegExp(searchQuery, caseSensitive ? "g" : "gi");

      // 用于行号计算
      let match;
      while ((match = re.exec(content)) !== null) {
        if (match[0].length === 0) {
          re.lastIndex++; // 避免空匹配死循环
          continue;
        }
        const from = match.index;
        const to = from + match[0].length;
        // 计算行号和列号
        const before = content.substring(0, from);
        const line = before.split("\n").length;
        const lastNewline = before.lastIndexOf("\n");
        const col = from - lastNewline;
        results.push({ from, to, line, col });
      }
    } catch {
      // 正则错误
    }
    return results;
  }, [query, caseSensitive, useRegex, activeTab?.content]);

  // 当搜索框打开时聚焦
  useEffect(() => {
    if (isOpen) setTimeout(() => inputRef.current?.focus(), 50);
  }, [isOpen]);

  // 重置 currentIndex 当 query 变化时
  useEffect(() => {
    setCurrentIndex(0);
  }, [query, caseSensitive, useRegex]);

  // 跳转到当前匹配并高亮选中
  const jumpToMatch = (idx: number) => {
    if (!editorView || matches.length === 0) return;
    const match = matches[idx];
    if (!match) return;

    editorView.dispatch({
      selection: EditorSelection.single(match.from, match.to),
      effects: EditorView.scrollIntoView(match.from, { y: "center" }),
    });
    editorView.focus();
  };

  // 当 matches 变化时自动跳转到第一个
  useEffect(() => {
    if (matches.length > 0) {
      jumpToMatch(0);
    } else if (editorView) {
      // 没有匹配时清除高亮
      const pos = editorView.state.selection.main.head;
      editorView.dispatch({
        selection: EditorSelection.single(pos),
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [matches]);

  const nextMatch = () => {
    if (matches.length === 0) return;
    const newIdx = (currentIndex + 1) % matches.length;
    setCurrentIndex(newIdx);
    jumpToMatch(newIdx);
  };

  const prevMatch = () => {
    if (matches.length === 0) return;
    const newIdx = currentIndex <= 0 ? matches.length - 1 : currentIndex - 1;
    setCurrentIndex(newIdx);
    jumpToMatch(newIdx);
  };

  const handleClose = () => {
    closeSearch();
    if (editorView) editorView.focus();
  };

  if (!isOpen || mode === "global") return null;

  const handleReplace = () => {
    if (!editorView || !activeTab || matches.length === 0) return;
    const match = matches[currentIndex];
    if (!match) return;

    editorView.dispatch({
      changes: { from: match.from, to: match.to, insert: replaceQuery },
      selection: EditorSelection.single(match.from + replaceQuery.length),
    });
    // 更新 tab 内容
    updateContent(activeTabId!, editorView.state.doc.toString());
  };

  const handleReplaceAll = () => {
    if (!editorView || !activeTab || matches.length === 0) return;
    // 从后往前替换，避免位置错位
    const changes = matches.map((m) => ({ from: m.from, to: m.to, insert: replaceQuery }));
    editorView.dispatch({ changes });
    updateContent(activeTabId!, editorView.state.doc.toString());
  };

  return (
    <div
      style={{
        display: "flex", flexDirection: "column", gap: 4, padding: "8px 12px",
        background: "var(--bg-secondary)", borderBottom: "1px solid var(--border)",
        animation: "slideDown 0.15s ease",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
        <input
          ref={inputRef}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              if (e.shiftKey) prevMatch();
              else nextMatch();
            }
            if (e.key === "Escape") {
              e.preventDefault();
              handleClose();
            }
          }}
          placeholder="搜索..."
          style={{
            flex: 1, padding: "4px 8px", fontSize: 13,
            background: "var(--bg-primary)", border: "1px solid var(--border)",
            borderRadius: 6, color: "var(--text-primary)", outline: "none",
          }}
        />
        <button
          onClick={toggleCaseSensitive}
          title="区分大小写"
          style={{
            padding: 4, borderRadius: 4,
            color: caseSensitive ? "var(--accent)" : "var(--text-secondary)",
            background: caseSensitive ? "var(--bg-hover)" : "transparent",
            cursor: "pointer"
          }}
        >
          <CaseSensitive size={16} />
        </button>
        <button
          onClick={toggleRegex}
          title="正则表达式"
          style={{
            padding: 4, borderRadius: 4,
            color: useRegex ? "var(--accent)" : "var(--text-secondary)",
            background: useRegex ? "var(--bg-hover)" : "transparent",
            cursor: "pointer"
          }}
        >
          <Regex size={16} />
        </button>
        <span style={{
          fontSize: 12,
          color: matches.length > 0 ? "var(--text-primary)" : "var(--text-secondary)",
          minWidth: 90,
          textAlign: "center",
          fontFamily: "monospace",
        }}>
          {query
            ? (matches.length > 0
                ? `${currentIndex + 1} / ${matches.length}`
                : "无结果")
            : ""}
        </span>
        <button onClick={prevMatch} title="上一个 (⇧⏎)"
          style={{ padding: 4, borderRadius: 4, color: "var(--text-secondary)", cursor: "pointer" }}>
          <ChevronUp size={16} />
        </button>
        <button onClick={nextMatch} title="下一个 (⏎)"
          style={{ padding: 4, borderRadius: 4, color: "var(--text-secondary)", cursor: "pointer" }}>
          <ChevronDown size={16} />
        </button>
        <button onClick={handleClose} title="关闭 (Esc)"
          style={{ padding: 4, borderRadius: 4, color: "var(--text-secondary)", cursor: "pointer" }}>
          <X size={16} />
        </button>
      </div>

      {mode === "replace" && (
        <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
          <input
            value={replaceQuery}
            onChange={(e) => setReplaceQuery(e.target.value)}
            placeholder="替换为..."
            style={{
              flex: 1, padding: "4px 8px", fontSize: 13,
              background: "var(--bg-primary)", border: "1px solid var(--border)",
              borderRadius: 6, color: "var(--text-primary)", outline: "none",
            }}
          />
          <button onClick={handleReplace} title="替换当前"
            style={{ padding: 4, borderRadius: 4, color: "var(--text-secondary)", cursor: "pointer" }}>
            <Replace size={16} />
          </button>
          <button onClick={handleReplaceAll} title="全部替换"
            style={{ padding: 4, borderRadius: 4, color: "var(--text-secondary)", cursor: "pointer" }}>
            <ReplaceAll size={16} />
          </button>
        </div>
      )}

      {matches.length > 0 && (
        <div style={{ fontSize: 11, color: "var(--text-secondary)" }}>
          当前位置: 第 {matches[currentIndex]?.line} 行, 第 {matches[currentIndex]?.col} 列
        </div>
      )}
    </div>
  );
}
