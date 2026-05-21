import React from "react";
import { Save, Minus, Plus } from "lucide-react";
import Dropdown from "@/components/Common/Dropdown";
import { useTabStore } from "@/store/tabStore";
import { useSettingsStore } from "@/store/settingsStore";
import { ENCODING_LIST, LANGUAGE_LIST } from "@/utils/encoding";
import { MIN_FONT_SIZE, MAX_FONT_SIZE } from "@/hooks/useKeyboard";
import { useTauri } from "@/hooks/useTauri";

interface EditorToolbarProps {
  tabId: string;
}

export default function EditorToolbar({ tabId }: EditorToolbarProps) {
  const tab = useTabStore((s) => s.tabs.find((t) => t.id === tabId));
  const setTabEncoding = useTabStore((s) => s.setTabEncoding);
  const setTabLanguage = useTabStore((s) => s.setTabLanguage);
  const setTabLineEnding = useTabStore((s) => s.setTabLineEnding);
  const setTabIndent = useTabStore((s) => s.setTabIndent);
  const updateContent = useTabStore((s) => s.updateContent);
  const markClean = useTabStore((s) => s.markClean);
  const { fontSize, updateSetting } = useSettingsStore();
  const { readFile } = useTauri();

  if (!tab) return null;

  const handleSave = () => {
    window.dispatchEvent(new CustomEvent("novaedit:save"));
  };

  // 切换编码时重新用新编码读取文件
  const handleEncodingChange = async (newEncoding: string) => {
    setTabEncoding(tabId, newEncoding);

    // 如果标签有文件路径，用新编码重新读取
    if (tab.filePath) {
      try {
        const result = await readFile(tab.filePath, newEncoding);
        updateContent(tabId, result.content);
        markClean(tabId);
      } catch (err) {
        console.error("用新编码读取文件失败:", err);
      }
    }
  };

  // 生成字体大小选项
  const fontSizeOptions = [];
  for (let i = MIN_FONT_SIZE; i <= MAX_FONT_SIZE; i++) {
    fontSizeOptions.push({ value: String(i), label: `${i}px` });
  }

  return (
    <div
      style={{
        display: "flex", alignItems: "center", gap: 8, padding: "4px 12px",
        background: "var(--bg-secondary)", borderBottom: "1px solid var(--border)",
        fontSize: 12, flexShrink: 0,
      }}
    >
      <Dropdown
        value={tab.encoding}
        options={ENCODING_LIST.map((e) => ({ value: e.name, label: e.label }))}
        onChange={handleEncodingChange}
        width={110}
      />
      <Dropdown
        value={tab.language}
        options={LANGUAGE_LIST.map((l) => ({ value: l.id, label: l.name }))}
        onChange={(v) => setTabLanguage(tabId, v)}
        width={120}
      />
      <Dropdown
        value={tab.lineEnding}
        options={[
          { value: "LF", label: "LF (Mac)" },
          { value: "CRLF", label: "CRLF (Win)" },
        ]}
        onChange={(v) => setTabLineEnding(tabId, v as "LF" | "CRLF")}
        width={100}
      />
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
        width={90}
      />

      {/* 分隔线 */}
      <div style={{ width: 1, height: 16, background: "var(--border)", flexShrink: 0 }} />

      {/* 字体大小控制 */}
      <button
        onClick={() => updateSetting("fontSize", Math.max(fontSize - 1, MIN_FONT_SIZE))}
        title="缩小字体 (⌘-)"
        style={{
          display: "flex", alignItems: "center", justifyContent: "center",
          width: 22, height: 22, borderRadius: 4,
          color: "var(--text-secondary)", cursor: "pointer",
        }}
        onMouseEnter={(e) => (e.currentTarget.style.background = "var(--bg-hover)")}
        onMouseLeave={(e) => (e.currentTarget.style.background = "none")}
      >
        <Minus size={13} />
      </button>
      <Dropdown
        value={String(fontSize)}
        options={fontSizeOptions}
        onChange={(v) => updateSetting("fontSize", parseInt(v))}
        width={70}
      />
      <button
        onClick={() => updateSetting("fontSize", Math.min(fontSize + 1, MAX_FONT_SIZE))}
        title="放大字体 (⌘+)"
        style={{
          display: "flex", alignItems: "center", justifyContent: "center",
          width: 22, height: 22, borderRadius: 4,
          color: "var(--text-secondary)", cursor: "pointer",
        }}
        onMouseEnter={(e) => (e.currentTarget.style.background = "var(--bg-hover)")}
        onMouseLeave={(e) => (e.currentTarget.style.background = "none")}
      >
        <Plus size={13} />
      </button>

      <div style={{ flex: 1 }} />

      {tab.dirty && (
        <span style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--warning)", flexShrink: 0 }} title="未保存" />
      )}
      <button
        onClick={handleSave}
        title="保存 (⌘S)"
        style={{
          display: "flex", alignItems: "center", gap: 4, padding: "4px 8px",
          borderRadius: 6, fontSize: 12, color: "var(--text-secondary)",
          cursor: "pointer",
        }}
        onMouseEnter={(e) => (e.currentTarget.style.background = "var(--bg-hover)")}
        onMouseLeave={(e) => (e.currentTarget.style.background = "none")}
      >
        <Save size={14} />
      </button>
    </div>
  );
}
