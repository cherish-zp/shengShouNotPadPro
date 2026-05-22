import React, { useRef, useEffect } from "react";
import { EditorView, keymap, lineNumbers, highlightActiveLineGutter, highlightSpecialChars, drawSelection, highlightActiveLine, rectangularSelection, crosshairCursor } from "@codemirror/view";
import { EditorState, type Extension, Compartment } from "@codemirror/state";
import { defaultKeymap, history, historyKeymap, indentWithTab } from "@codemirror/commands";
import { syntaxHighlighting, indentOnInput, bracketMatching, foldGutter, foldKeymap, HighlightStyle } from "@codemirror/language";
import { searchKeymap, highlightSelectionMatches } from "@codemirror/search";
import { autocompletion, completionKeymap, closeBrackets, closeBracketsKeymap } from "@codemirror/autocomplete";
import { lintKeymap } from "@codemirror/lint";
import { tags } from "@lezer/highlight";
import { javascript } from "@codemirror/lang-javascript";
import { python } from "@codemirror/lang-python";
import { rust } from "@codemirror/lang-rust";
import { html } from "@codemirror/lang-html";
import { css } from "@codemirror/lang-css";
import { json } from "@codemirror/lang-json";
import { sql } from "@codemirror/lang-sql";
import { markdown } from "@codemirror/lang-markdown";
import { xml } from "@codemirror/lang-xml";
import { java } from "@codemirror/lang-java";
import { cpp } from "@codemirror/lang-cpp";
import { go } from "@codemirror/lang-go";
import { useTabStore } from "@/store/tabStore";
import { useSettingsStore } from "@/store/settingsStore";
import { useEditorStore } from "@/store/editorStore";

interface CodeEditorProps {
  tabId: string;
}

function getLanguageExtension(lang: string): Extension | null {
  switch (lang) {
    case "javascript": case "typescript": return javascript({ jsx: true, typescript: lang === "typescript" });
    case "python": return python();
    case "rust": return rust();
    case "html": return html();
    case "css": return css();
    case "json": return json();
    case "sql": return sql();
    case "markdown": return markdown();
    case "xml": return xml();
    case "java": return java();
    case "cpp": return cpp();
    case "go": return go();
    default: return null;
  }
}

const novaHighlight = HighlightStyle.define([
  { tag: tags.keyword, color: "#7c3aed" },
  { tag: tags.operator, color: "#0ea5e9" },
  { tag: tags.special(tags.variableName), color: "#ef4444" },
  { tag: tags.typeName, color: "#eab308" },
  { tag: tags.atom, color: "#f97316" },
  { tag: tags.number, color: "#f97316" },
  { tag: tags.bool, color: "#f97316" },
  { tag: tags.definition(tags.variableName), color: "#3b82f6" },
  { tag: tags.string, color: "#22c55e" },
  { tag: tags.special(tags.string), color: "#22c55e" },
  { tag: tags.comment, color: "#9ca3af", fontStyle: "italic" },
  { tag: tags.variableName, color: "#374151" },
  { tag: tags.tagName, color: "#ef4444" },
  { tag: tags.bracket, color: "#6b7280" },
  { tag: tags.meta, color: "#eab308" },
  { tag: tags.link, color: "#3b82f6", textDecoration: "underline" },
  { tag: tags.heading, color: "#ef4444", fontWeight: "bold" },
  { tag: tags.emphasis, fontStyle: "italic" },
  { tag: tags.strong, fontWeight: "bold" },
  { tag: tags.className, color: "#eab308" },
  { tag: tags.propertyName, color: "#3b82f6" },
  { tag: tags.function(tags.variableName), color: "#0ea5e9" },
  { tag: tags.regexp, color: "#ef4444" },
]);

// Compartments for dynamic reconfiguration
const themeCompartment = new Compartment();
const languageCompartment = new Compartment();
const wordWrapCompartment = new Compartment();

function makeTheme() {
  // 使用 inherit，让字体大小等从父容器 CSS 继承
  return EditorView.theme({
    "&": {
      fontSize: "inherit",
      fontFamily: "inherit",
      lineHeight: "inherit",
      height: "100%",
    },
    ".cm-scroller": {
      fontFamily: "inherit",
      fontSize: "inherit",
      lineHeight: "inherit",
    },
    ".cm-content": {
      caretColor: "var(--accent)",
      padding: "8px 0",
      fontSize: "inherit",
      fontFamily: "inherit",
    },
    ".cm-cursor, .cm-dropCursor": {
      borderLeftColor: "var(--accent)",
      borderLeftWidth: "2px",
    },
    ".cm-activeLine": {
      background: "var(--selection)",
    },
    ".cm-gutters": {
      background: "var(--gutter-bg)",
      borderRight: "1px solid var(--border)",
      color: "var(--text-secondary)",
      fontSize: "inherit",
    },
    ".cm-activeLineGutter": {
      background: "transparent",
      color: "var(--text-primary)",
    },
    ".cm-selectionBackground": {
      background: "var(--selection) !important",
    },
    "&.cm-focused .cm-selectionBackground": {
      background: "var(--selection) !important",
    },
    ".cm-matchingBracket": {
      background: "var(--selection)",
      outline: "1px solid var(--accent)",
    },
    ".cm-foldGutter .cm-gutterElement": {
      color: "var(--text-secondary)",
      cursor: "pointer",
    },
    ".cm-tooltip": {
      background: "var(--bg-surface)",
      border: "1px solid var(--border)",
      borderRadius: "8px",
      boxShadow: "0 8px 24px rgba(0,0,0,0.2)",
    },
    ".cm-tooltip-autocomplete > ul > li": {
      padding: "4px 8px",
    },
    ".cm-tooltip-autocomplete > ul > li[aria-selected]": {
      background: "var(--accent)",
      color: "var(--bg-primary)",
    },
    ".cm-searchMatch": {
      background: "rgba(250, 179, 135, 0.3)",
      borderRadius: "2px",
    },
    ".cm-searchMatch.cm-searchMatch-selected": {
      background: "rgba(250, 179, 135, 0.5)",
    },
  });
}

export default function CodeEditor({ tabId }: CodeEditorProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  const isComposingRef = useRef(false);
  const tab = useTabStore((s) => s.tabs.find((t) => t.id === tabId));
  const updateContent = useTabStore((s) => s.updateContent);
  const { fontSize, fontFamily, lineHeight, wordWrap, showLineNumbers } = useSettingsStore();
  const updateCursor = useEditorStore((s) => s.updateCursor);
  const setEditorView = useEditorStore((s) => s.setEditorView);

  // 创建编辑器 - 只在 tabId 或语言变化时重建
  useEffect(() => {
    if (!containerRef.current || !tab) return;

    if (viewRef.current) {
      viewRef.current.destroy();
    }

    const extensions: Extension[] = [
      foldGutter(),
      ...(showLineNumbers ? [lineNumbers()] : []),
      highlightSpecialChars(),
      history(),
      drawSelection(),
      EditorState.allowMultipleSelections.of(true),
      indentOnInput(),
      syntaxHighlighting(novaHighlight),
      bracketMatching(),
      closeBrackets(),
      autocompletion(),
      highlightActiveLine(),
      highlightActiveLineGutter(),
      highlightSelectionMatches(),
      rectangularSelection(),
      crosshairCursor(),
      keymap.of([
        ...closeBracketsKeymap,
        ...defaultKeymap,
        ...searchKeymap,
        ...historyKeymap,
        ...foldKeymap,
        ...completionKeymap,
        ...lintKeymap,
        indentWithTab,
      ]),
      EditorView.updateListener.of((update) => {
        if (update.docChanged && !isComposingRef.current) {
          // IME 组合期间不向上同步内容，避免外部回写打断输入会话
          updateContent(tabId, update.state.doc.toString());
        }
        const pos = update.state.selection.main.head;
        const line = update.state.doc.lineAt(pos);
        updateCursor(tabId, {
          line: line.number,
          column: pos - line.from + 1,
        });
      }),
      // 监听 IME 组合事件
      EditorView.domEventHandlers({
        compositionstart: () => {
          isComposingRef.current = true;
        },
        compositionend: () => {
          isComposingRef.current = false;
          // 组合结束后同步一次完整内容
          if (viewRef.current) {
            updateContent(tabId, viewRef.current.state.doc.toString());
          }
        },
      }),
      themeCompartment.of(makeTheme()),
      languageCompartment.of(getLanguageExtension(tab.language) || []),
      wordWrapCompartment.of(wordWrap ? EditorView.lineWrapping : []),
    ];

    const state = EditorState.create({
      doc: tab.content,
      extensions,
    });

    const view = new EditorView({
      state,
      parent: containerRef.current,
    });

    viewRef.current = view;
    setEditorView(view);

    return () => {
      view.destroy();
      viewRef.current = null;
      setEditorView(null);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tabId, tab?.language, showLineNumbers]);

  // 自动换行变化时
  useEffect(() => {
    if (!viewRef.current) return;
    viewRef.current.dispatch({
      effects: wordWrapCompartment.reconfigure(wordWrap ? EditorView.lineWrapping : []),
    });
  }, [wordWrap]);

  // 切换标签时更新内容
  useEffect(() => {
    if (!viewRef.current || !tab) return;
    // IME 组合期间不外部回写，避免破坏正在进行的拼写会话
    if (isComposingRef.current) return;
    const currentContent = viewRef.current.state.doc.toString();
    if (currentContent !== tab.content) {
      viewRef.current.dispatch({
        changes: {
          from: 0,
          to: currentContent.length,
          insert: tab.content,
        },
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tabId]);

  if (!tab) return null;

  // 关键：通过外层 div 的 inline style 设置字体大小，CodeMirror 用 inherit 继承
  return (
    <div
      ref={containerRef}
      style={{
        flex: 1,
        overflow: "hidden",
        background: "var(--bg-primary)",
        fontSize: `${fontSize}px`,
        fontFamily: fontFamily,
        lineHeight: lineHeight,
      }}
    />
  );
}
