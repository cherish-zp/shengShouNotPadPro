import React, { useState, useRef, useEffect, useMemo } from "react";
import { X, ChevronUp, ChevronDown, Regex, CaseSensitive, Replace, ReplaceAll } from "lucide-react";
import { EditorSelection } from "@codemirror/state";
import { useSearchStore } from "@/store/searchStore";
import { useTabStore } from "@/store/tabStore";
import { useEditorStore } from "@/store/editorStore";
import { computeMatches } from "@/utils/searchMatches";
import { setSearchMatches } from "@/utils/cm/searchHighlight";

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

  // 内容变化走 200ms 防抖：击键时不立刻全量正则扫描；
  // 搜索词 / 开关变化仍即时（用当前已防抖的内容立即重算）
  const activeContent = activeTab?.content ?? "";
  const [debouncedContent, setDebouncedContent] = useState(activeContent);
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedContent(activeContent), 200);
    return () => clearTimeout(timer);
  }, [activeContent]);

  // 计算所有匹配项（纯函数，位置为文档内绝对偏移）
  const matches = useMemo(() => {
    if (!activeTab || !query) return [];
    return computeMatches(debouncedContent, query, { caseSensitive, useRegex });
    // 依赖用 activeTabId 而非 activeTab：内容更新会替换 tab 对象引用，
    // 依赖对象本身会让防抖失效（内容重算只由 debouncedContent 驱动）
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, caseSensitive, useRegex, debouncedContent, activeTabId]);

  // 当搜索框打开时聚焦
  useEffect(() => {
    if (isOpen) setTimeout(() => inputRef.current?.focus(), 50);
  }, [isOpen]);

  // 重置 currentIndex 当 query 变化时
  useEffect(() => {
    setCurrentIndex(0);
  }, [query, caseSensitive, useRegex]);

  // 匹配结果收缩时把计数拉回有效范围
  useEffect(() => {
    if (matches.length === 0) {
      if (currentIndex !== 0) setCurrentIndex(0);
    } else if (currentIndex >= matches.length) {
      setCurrentIndex(0);
    }
  }, [matches, currentIndex]);

  // 查询高亮：只推装饰（标记全部匹配 + 当前三项加深），
  // 不改编辑器选区、不移动光标、不抢焦点（v0.2.2 用户反馈）
  useEffect(() => {
    if (!editorView) return;
    setSearchMatches(
      editorView,
      matches.map((m, i) => ({ from: m.from, to: m.to, selected: i === currentIndex }))
    );
  }, [matches, currentIndex, editorView]);

  // 面板卸载（关闭搜索）时清掉编辑器里的查询高亮
  const editorViewRef = useRef(editorView);
  editorViewRef.current = editorView;
  useEffect(() => () => {
    if (editorViewRef.current) setSearchMatches(editorViewRef.current, []);
  }, []);

  const nextMatch = () => {
    if (matches.length === 0) return;
    setCurrentIndex((currentIndex + 1) % matches.length);
  };

  const prevMatch = () => {
    if (matches.length === 0) return;
    setCurrentIndex(currentIndex <= 0 ? matches.length - 1 : currentIndex - 1);
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
