import React, { useEffect, useRef, useState } from "react";
import { Plus, Eye, EyeOff, Save, Settings2, WrapText, Minus, Square, X } from "lucide-react";
import Dropdown from "@/components/Common/Dropdown";
import UpdateButton from "@/components/Update/UpdateButton";
import { useTabStore } from "@/store/tabStore";
import { useSettingsStore } from "@/store/settingsStore";
import { useEditorStore } from "@/store/editorStore";
import { ENCODING_LIST, LANGUAGE_LIST } from "@/utils/encoding";
import { MIN_FONT_SIZE, MAX_FONT_SIZE } from "@/hooks/useKeyboard";
import { useTauri } from "@/hooks/useTauri";
import { resolveTitleText } from "@/utils/titleText";

// 自绘顶栏（v0.2.2 后：原生标题栏与工具栏合并为一行，编辑区净增一整行高度）：
// macOS 用 Overlay 标题栏（系统红绿灯浮在顶栏左上，预留 78px 不可点区），
// Windows 由 lib.rs 关掉装饰条、右侧自绘最小化/最大化/关闭。
// 顶栏空白处可拖动窗口（data-tauri-drag-region），双击最大化。

const IS_MAC = typeof navigator !== "undefined" && navigator.userAgent.includes("Mac");
const IS_TAURI = typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;

async function winAction(action: "minimize" | "toggleMaximize" | "close") {
  try {
    const { getCurrentWindow } = await import("@tauri-apps/api/window");
    const win = getCurrentWindow();
    if (action === "minimize") await win.minimize();
    else if (action === "toggleMaximize") await win.toggleMaximize();
    else await win.close();
  } catch {
    // 非 Tauri 环境静默
  }
}

/** Windows 自绘窗口控制（macOS 走系统红绿灯，不渲染） */
function WindowControls() {
  if (IS_MAC || !IS_TAURI) return null;
  const btn = (icon: React.ReactNode, action: "minimize" | "toggleMaximize" | "close", title: string, isClose = false) => (
    <button
      key={action}
      title={title}
      onClick={() => void winAction(action)}
      style={{
        display: "flex", alignItems: "center", justifyContent: "center",
        width: 44, height: "100%", color: "var(--text-secondary)",
        background: "transparent", cursor: "default", flexShrink: 0,
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = isClose ? "#e81123" : "var(--bg-hover)";
        if (isClose) e.currentTarget.style.color = "#fff";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = "transparent";
        if (isClose) e.currentTarget.style.color = "var(--text-secondary)";
      }}
    >
      {icon}
    </button>
  );
  return (
    <div style={{ display: "flex", height: "100%", flexShrink: 0 }}>
      {btn(<Minus size={14} />, "minimize", "最小化")}
      {btn(<Square size={12} />, "toggleMaximize", "最大化 / 还原")}
      {btn(<X size={16} />, "close", "关闭", true)}
    </div>
  );
}

const rowStyle: React.CSSProperties = { display: "flex", alignItems: "center", gap: 8, padding: "3px 0" };
const captionStyle: React.CSSProperties = {
  fontSize: 10.5, color: "var(--text-tertiary)", letterSpacing: "0.04em",
  margin: "6px 0 2px", display: "flex", alignItems: "center", gap: 6,
};
const groupDivider: React.CSSProperties = { flex: 1, height: 1, background: "var(--divider)" };

/** ⚙ 面板·当前标签组：编码/语言/换行符/缩进（含切换编码的重读/转码逻辑，自 EditorToolbar 原样迁移） */
function TabSettingsSection() {
  const tabId = useTabStore((s) => s.activeTabId);
  const tab = useTabStore((s) => (s.activeTabId ? s.tabs.find((t) => t.id === s.activeTabId) : undefined));
  const setTabEncoding = useTabStore((s) => s.setTabEncoding);
  const setTabLanguage = useTabStore((s) => s.setTabLanguage);
  const setTabLineEnding = useTabStore((s) => s.setTabLineEnding);
  const setTabIndent = useTabStore((s) => s.setTabIndent);
  const updateContent = useTabStore((s) => s.updateContent);
  const markClean = useTabStore((s) => s.markClean);
  const { readFile, transcodeText } = useTauri();

  // 切换编码时：
  // - 有文件路径：用新编码重新读取文件
  // - 无文件路径（工具箱输出、未保存的新标签）：把现有文本按旧编码回写字节，再用新编码解码
  const handleEncodingChange = async (newEncoding: string) => {
    if (!tab || !tabId) return;
    const oldEncoding = tab.encoding || "UTF-8";
    if (oldEncoding === newEncoding) return;

    setTabEncoding(tabId, newEncoding);

    if (tab.filePath) {
      try {
        const result = await readFile(tab.filePath, newEncoding);
        updateContent(tabId, result.content);
        markClean(tabId);
      } catch (err) {
        console.error("用新编码读取文件失败:", err);
      }
      return;
    }

    // 无文件路径：转码当前文本
    if (!tab.content) return;
    try {
      const transcoded = await transcodeText(tab.content, oldEncoding, newEncoding);
      updateContent(tabId, transcoded);
    } catch (err) {
      console.error("转码失败:", err);
    }
  };

  if (!tab || !tabId) return null;
  return (
    <>
      <div style={captionStyle}>当前标签<span style={groupDivider} /></div>
      <div style={rowStyle}>
        <span style={{ flex: 1, fontSize: 12, color: "var(--text-secondary)" }}>编码</span>
        <Dropdown
          value={tab.encoding}
          options={ENCODING_LIST.map((e) => ({ value: e.name, label: e.label }))}
          onChange={(v) => void handleEncodingChange(v)}
          width={130}
        />
      </div>
      <div style={rowStyle}>
        <span style={{ flex: 1, fontSize: 12, color: "var(--text-secondary)" }}>语言</span>
        <Dropdown
          value={tab.language}
          options={LANGUAGE_LIST.map((l) => ({ value: l.id, label: l.name }))}
          onChange={(v) => setTabLanguage(tabId, v)}
          width={130}
        />
      </div>
      <div style={rowStyle}>
        <span style={{ flex: 1, fontSize: 12, color: "var(--text-secondary)" }}>换行符</span>
        <Dropdown
          value={tab.lineEnding}
          options={[
            { value: "LF", label: "LF (Mac)" },
            { value: "CRLF", label: "CRLF (Win)" },
          ]}
          onChange={(v) => setTabLineEnding(tabId, v as "LF" | "CRLF")}
          width={130}
        />
      </div>
      <div style={rowStyle}>
        <span style={{ flex: 1, fontSize: 12, color: "var(--text-secondary)" }}>缩进</span>
        <Dropdown
          value={`${tab.indentType === "tab" ? "Tab" : tab.indentSize}`}
          options={[
            { value: "Tab", label: "制表符" },
            { value: "2", label: "2 空格" },
            { value: "4", label: "4 空格" },
            { value: "8", label: "8 空格" },
          ]}
          onChange={(v) => {
            if (v === "Tab") setTabIndent(tabId, 4, "tab");
            else setTabIndent(tabId, parseInt(v), "spaces");
          }}
          width={130}
        />
      </div>
    </>
  );
}

export default function TitleBar() {
  // 标量 selector：击键（content 更新）不会触发顶栏重渲染
  const title = useTabStore((s) => resolveTitleText(s.tabs, s.activeTabId));
  const dirty = useTabStore((s) => s.tabs.find((t) => t.id === s.activeTabId)?.dirty ?? false);
  const isMarkdown = useTabStore((s) => s.tabs.find((t) => t.id === s.activeTabId)?.language === "markdown");
  const addTab = useTabStore((s) => s.addTab);
  const markdownPreviewVisible = useEditorStore((s) => s.markdownPreviewVisible);
  const toggleMarkdownPreview = useEditorStore((s) => s.toggleMarkdownPreview);
  const fontSize = useSettingsStore((s) => s.fontSize);
  const wordWrap = useSettingsStore((s) => s.wordWrap);
  const updateSetting = useSettingsStore((s) => s.updateSetting);

  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // 点面板外关闭（与 Dropdown 同款模式）
  useEffect(() => {
    if (!menuOpen) return;
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [menuOpen]);

  const handleSave = () => {
    window.dispatchEvent(new CustomEvent("novaedit:save"));
  };

  const iconBtn = (icon: React.ReactNode, onClick: () => void, btnTitle: string, extra?: React.CSSProperties) => (
    <button
      onClick={onClick}
      title={btnTitle}
      style={{
        display: "flex", alignItems: "center", justifyContent: "center",
        width: 26, height: 26, borderRadius: 6,
        color: "var(--text-secondary)", background: "transparent",
        cursor: "pointer", flexShrink: 0, ...extra,
      }}
      onMouseEnter={(e) => (e.currentTarget.style.background = "var(--bg-hover)")}
      onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
    >
      {icon}
    </button>
  );

  const fontSizeOptions = [];
  for (let i = MIN_FONT_SIZE; i <= MAX_FONT_SIZE; i++) {
    fontSizeOptions.push({ value: String(i), label: `${i}px` });
  }

  return (
    <div
      data-tauri-drag-region=""
      style={{
        display: "flex", alignItems: "center", height: 40, flexShrink: 0,
        paddingLeft: IS_MAC ? 0 : 12, paddingRight: IS_MAC ? 8 : 0,
        background: "var(--glass-bg)",
        WebkitBackdropFilter: "var(--glass-blur)",
        backdropFilter: "var(--glass-blur)",
        borderBottom: "0.5px solid var(--border)",
        position: "relative", zIndex: 100, userSelect: "none",
      }}
    >
      {/* macOS 红绿灯保留区（不可放可点元素） */}
      {IS_MAC && <div data-tauri-drag-region="" style={{ width: 78, flexShrink: 0 }} />}

      {/* 标题：当前标签名 / 应用名 */}
      <span
        data-tauri-drag-region=""
        title={title}
        style={{
          maxWidth: "40%", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
          fontSize: 12.5, fontWeight: 600, letterSpacing: "-0.01em",
          color: "var(--text-primary)", flexShrink: 1,
        }}
      >
        {title}
      </span>

      {/* 中间纯拖拽区 */}
      <div data-tauri-drag-region="" style={{ flex: 1 }} />

      {/* 右侧动作区 */}
      <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
        {iconBtn(<Plus size={15} style={{ color: "var(--accent)" }} />, () => addTab(), "新建便签 (⌘N)")}

        {isMarkdown && (
          <button
            onClick={toggleMarkdownPreview}
            title={markdownPreviewVisible ? "返回编辑模式" : "切换到预览模式"}
            style={{
              display: "flex", alignItems: "center", gap: 4, padding: "4px 8px",
              borderRadius: 6, fontSize: 12, flexShrink: 0,
              color: markdownPreviewVisible ? "var(--accent)" : "var(--text-secondary)",
              background: markdownPreviewVisible ? "var(--bg-hover)" : "transparent",
              cursor: "pointer",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = "var(--bg-hover)")}
            onMouseLeave={(e) => (e.currentTarget.style.background = markdownPreviewVisible ? "var(--bg-hover)" : "transparent")}
          >
            {markdownPreviewVisible ? <EyeOff size={14} /> : <Eye size={14} />}
            <span style={{ fontSize: 11 }}>{markdownPreviewVisible ? "编辑" : "预览"}</span>
          </button>
        )}

        <div style={{ display: "flex", alignItems: "center", gap: 4, flexShrink: 0 }}>
          {dirty && (
            <span style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--warning)", flexShrink: 0 }} title="未保存" />
          )}
          {iconBtn(<Save size={15} />, handleSave, "保存 (⌘S)")}
        </div>

        <UpdateButton />

        {/* ⚙ 折叠面板：低频设置（当前标签 + 全局） */}
        <div ref={menuRef} style={{ position: "relative", flexShrink: 0 }}>
          {iconBtn(
            <Settings2 size={15} />,
            () => setMenuOpen((v) => !v),
            "编辑设置",
            menuOpen ? { color: "var(--accent)", background: "var(--bg-hover)" } : undefined
          )}
          {menuOpen && (
            <div
              style={{
                position: "absolute", top: "100%", right: 0, marginTop: 6,
                width: 300, padding: "8px 14px 12px",
                background: "var(--glass-bg-strong)",
                WebkitBackdropFilter: "var(--glass-blur)",
                backdropFilter: "var(--glass-blur)",
                border: "0.5px solid var(--border-strong)",
                borderRadius: 10, boxShadow: "var(--shadow-lg)",
                zIndex: 500, animation: "slideDown 0.12s ease",
              }}
            >
              <TabSettingsSection />

              <div style={captionStyle}>全局<span style={groupDivider} /></div>
              <div style={rowStyle}>
                <span style={{ flex: 1, fontSize: 12, color: "var(--text-secondary)" }}>字号</span>
                {iconBtn(<Minus size={12} />, () => updateSetting("fontSize", Math.max(fontSize - 1, MIN_FONT_SIZE)), "缩小字体 (⌘-)")}
                <Dropdown
                  value={String(fontSize)}
                  options={fontSizeOptions}
                  onChange={(v) => updateSetting("fontSize", parseInt(v))}
                  width={68}
                />
                {iconBtn(<Plus size={12} />, () => updateSetting("fontSize", Math.min(fontSize + 1, MAX_FONT_SIZE)), "放大字体 (⌘+)")}
              </div>
              <div style={rowStyle}>
                <span style={{ flex: 1, fontSize: 12, color: "var(--text-secondary)" }}>自动换行</span>
                <button
                  onClick={() => updateSetting("wordWrap", !wordWrap)}
                  title={wordWrap ? "已开启自动换行（点击关闭）" : "已关闭自动换行（点击开启）"}
                  style={{
                    display: "flex", alignItems: "center", justifyContent: "center",
                    width: 28, height: 24, borderRadius: 4,
                    color: wordWrap ? "var(--accent)" : "var(--text-secondary)",
                    background: wordWrap ? "var(--bg-hover)" : "transparent",
                    cursor: "pointer",
                  }}
                >
                  <WrapText size={14} />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <WindowControls />
    </div>
  );
}
