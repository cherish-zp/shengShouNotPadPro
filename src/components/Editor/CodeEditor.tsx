import React, { useRef, useEffect } from "react";
import { EditorView, keymap, lineNumbers, highlightActiveLineGutter, highlightSpecialChars, drawSelection, highlightActiveLine } from "@codemirror/view";
import { EditorState, type Extension, Compartment } from "@codemirror/state";
import { defaultKeymap, history, historyKeymap, indentLess } from "@codemirror/commands";
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
import { middleButtonRectSelection } from "@/utils/cm/rectSelection";
import { searchHighlightExtension } from "@/utils/cm/searchHighlight";
import { smartTab } from "@/utils/cm/tabIndent";
import { inlineImages } from "@/utils/cm/imageWidgets";
import { insertImageBytes } from "@/utils/imagePasteFlow";
import { baseDirOfFilePath, isPasteSupported } from "@/utils/imagePaste";

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

// 语法高亮颜色全部走 index.css 末尾的 --hl-* token（:root 浅色 / .dark 深色两套），
// 替换原先 26 个硬编码浅色 hex（暗色模式下对比度不达标）
const novaHighlight = HighlightStyle.define([
  { tag: tags.keyword, color: "var(--hl-keyword)" },
  { tag: tags.operator, color: "var(--hl-operator)" },
  { tag: tags.special(tags.variableName), color: "var(--hl-special)" },
  { tag: tags.typeName, color: "var(--hl-type)" },
  { tag: tags.atom, color: "var(--hl-atom)" },
  { tag: tags.number, color: "var(--hl-number)" },
  { tag: tags.bool, color: "var(--hl-bool)" },
  { tag: tags.definition(tags.variableName), color: "var(--hl-definition)" },
  { tag: tags.string, color: "var(--hl-string)" },
  { tag: tags.special(tags.string), color: "var(--hl-string)" },
  { tag: tags.comment, color: "var(--hl-comment)", fontStyle: "italic" },
  { tag: tags.variableName, color: "var(--hl-variable)" },
  { tag: tags.tagName, color: "var(--hl-tag)" },
  { tag: tags.bracket, color: "var(--hl-bracket)" },
  { tag: tags.meta, color: "var(--hl-meta)" },
  { tag: tags.link, color: "var(--hl-link)", textDecoration: "underline" },
  { tag: tags.heading, color: "var(--hl-heading)", fontWeight: "bold" },
  { tag: tags.emphasis, fontStyle: "italic" },
  { tag: tags.strong, fontWeight: "bold" },
  { tag: tags.className, color: "var(--hl-class)" },
  { tag: tags.propertyName, color: "var(--hl-property)" },
  { tag: tags.function(tags.variableName), color: "var(--hl-function)" },
  { tag: tags.regexp, color: "var(--hl-regexp)" },
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
      background: "var(--hl-search-match)",
      borderRadius: "2px",
    },
    ".cm-searchMatch.cm-searchMatch-selected": {
      background: "var(--hl-search-match-selected)",
    },
  });
}

// 与 tab 无关的静态扩展：模块级组装一次（语言包均为静态 import），
// 编辑器重建时直接复用同一组实例，避免重复构建
const staticBaseExtensions: Extension[] = [
  foldGutter(),
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
  searchHighlightExtension,
  middleButtonRectSelection(),
  keymap.of([
    ...closeBracketsKeymap,
    ...defaultKeymap,
    ...searchKeymap,
    ...historyKeymap,
    ...foldKeymap,
    ...completionKeymap,
    ...lintKeymap,
    // Tab：无选区在光标处插入缩进空格（不再整行右移），有选区缩进所选行
    { key: "Tab", run: smartTab, shift: indentLess },
  ]),
  themeCompartment.of(makeTheme()),
];

export default function CodeEditor({ tabId }: CodeEditorProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  const isComposingRef = useRef(false);
  // 上次写入 store 的光标位置：用于跳过重复值，避免每事务触发订阅者重渲染
  const lastCursorRef = useRef<{ line: number; column: number } | null>(null);
  // 内容防抖同步：pending 保存最近一次事务的全文，定时器 200ms 后写入 store
  const pendingContentRef = useRef<string | null>(null);
  const syncTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
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
    lastCursorRef.current = null;

    // 把防抖中的待写内容写入 store；卸载 / 失焦 / 组合结束前必须调用，防止丢字
    const flushContentSync = () => {
      if (syncTimerRef.current) {
        clearTimeout(syncTimerRef.current);
        syncTimerRef.current = null;
      }
      if (pendingContentRef.current !== null) {
        const content = pendingContentRef.current;
        pendingContentRef.current = null;
        updateContent(tabId, content);
      }
    };

    const extensions: Extension[] = [
      ...staticBaseExtensions,
      ...(showLineNumbers ? [lineNumbers()] : []),
      EditorView.updateListener.of((update) => {
        if (update.docChanged) {
          // 全量内容同步改为 200ms 防抖；IME 组合期间只暂存不排程，
          // 由 compositionend / blur / destroy 统一 flush
          pendingContentRef.current = update.state.doc.toString();
          if (!isComposingRef.current) {
            if (syncTimerRef.current) clearTimeout(syncTimerRef.current);
            syncTimerRef.current = setTimeout(flushContentSync, 200);
          }
        }
        // 光标位置：仅在选择或文档变化的事务里计算，且行列真正变化才写
        // store——避免每个事务都新建对象导致 StatusBar 等订阅者重渲染
        if (update.selectionSet || update.docChanged) {
          const pos = update.state.selection.main.head;
          const line = update.state.doc.lineAt(pos);
          const next = { line: line.number, column: pos - line.from + 1 };
          const last = lastCursorRef.current;
          if (!last || last.line !== next.line || last.column !== next.column) {
            lastCursorRef.current = next;
            updateCursor(tabId, next);
          }
        }
      }),
      // 监听 IME 组合事件
      EditorView.domEventHandlers({
        compositionstart: () => {
          isComposingRef.current = true;
        },
        compositionend: () => {
          isComposingRef.current = false;
          // 组合结束后立即同步一次完整内容（flush 防抖中的待写内容）
          if (viewRef.current) {
            pendingContentRef.current = viewRef.current.state.doc.toString();
          }
          flushContentSync();
        },
        blur: () => {
          // 失焦前落库，防止 200ms 窗口内的编辑丢失
          flushContentSync();
        },
        // 剪贴板贴图：仅当剪贴板里有图片且没有可用文本时接管，否则放行默认粘贴
        paste: (event, view) => {
          const dt = (event as ClipboardEvent).clipboardData;
          if (!dt) return false;
          let imageFile: File | null = null;
          let imageMime = "";
          for (const item of Array.from(dt.items)) {
            if (item.kind === "file" && item.type.startsWith("image/")) {
              const f = item.getAsFile();
              if (f) {
                imageFile = f;
                imageMime = item.type;
                break;
              }
            }
          }
          if (!imageFile) return false;
          if (dt.getData("text/plain").trim() !== "") return false;
          const tabState = useTabStore.getState().tabs.find((t) => t.id === tabId);
          if (!tabState) return false;
          event.preventDefault();
          void (async () => {
            const bytes = new Uint8Array(await imageFile!.arrayBuffer());
            await insertImageBytes(view, bytes, imageMime, {
              tabId: tabState.id,
              language: tabState.language,
              filePath: tabState.filePath,
            });
          })();
          return true;
        },
      }),
      languageCompartment.of(getLanguageExtension(tab.language) || []),
      wordWrapCompartment.of(wordWrap ? EditorView.lineWrapping : []),
      // Markdown/纯文本便签：把 ![](...) 渲染成内联图片
      ...(isPasteSupported(tab.language)
        ? [
            inlineImages(() => {
              const current = useTabStore.getState().tabs.find((t) => t.id === tabId);
              return baseDirOfFilePath(current?.filePath);
            }),
          ]
        : []),
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
      // 卸载/重建前 flush 防抖中的待写内容，防止丢字
      flushContentSync();
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
