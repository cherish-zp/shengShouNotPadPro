import React, { useState, useRef, useEffect, useMemo } from "react";
import { useEditorStore } from "@/store/editorStore";
import { useTabStore } from "@/store/tabStore";
import { useSearchStore } from "@/store/searchStore";
import { useSettingsStore } from "@/store/settingsStore";
import { createCommands, type Command } from "@/utils/commands";

export default function CommandPalette() {
  const isOpen = useEditorStore((s) => s.commandPaletteOpen);
  const setOpen = useEditorStore((s) => s.setCommandPaletteOpen);
  const [query, setQuery] = useState("");
  const [selectedIdx, setSelectedIdx] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const tabStore = useTabStore();
  const editorStore = useEditorStore();
  const searchStore = useSearchStore();
  const settingsStore = useSettingsStore();

  const commands = useMemo(() => createCommands({
    newTab: () => tabStore.addTab(),
    save: () => window.dispatchEvent(new CustomEvent("novaedit:save")),
    saveAs: () => window.dispatchEvent(new CustomEvent("novaedit:saveAs")),
    closeTab: () => { const id = tabStore.activeTabId; if (id) tabStore.closeTab(id); },
    find: () => searchStore.openSearch("find"),
    replace: () => searchStore.openSearch("replace"),
    globalSearch: () => searchStore.openSearch("global"),
    quickOpen: () => editorStore.setQuickOpenOpen(true),
    commandPalette: () => {},
    goToLine: () => editorStore.setGoToLineOpen(true),
    toggleSidebar: () => editorStore.toggleSidebar(),
    toggleTerminal: () => editorStore.toggleTerminal(),
    toggleWordWrap: () => settingsStore.updateSetting("wordWrap", !settingsStore.wordWrap),
    zoomIn: () => settingsStore.updateSetting("fontSize", Math.min(settingsStore.fontSize + 1, 32)),
    zoomOut: () => settingsStore.updateSetting("fontSize", Math.max(settingsStore.fontSize - 1, 8)),
    resetZoom: () => settingsStore.updateSetting("fontSize", 14),
    openSettings: () => editorStore.setSettingsOpen(true),
    openDiff: () => editorStore.setDiffViewOpen(true),
    openTools: () => editorStore.setActiveSidebarView("tools"),
    openPlugins: () => editorStore.setActiveSidebarView("plugins"),
    openFolder: () => {},
    zenMode: () => { editorStore.toggleSidebar(); },
  }), [tabStore, editorStore, searchStore, settingsStore]);

  const filtered = useMemo(() => {
    if (!query) return commands;
    const q = query.toLowerCase();
    return commands.filter((c) => c.label.toLowerCase().includes(q) || c.category.toLowerCase().includes(q));
  }, [commands, query]);

  useEffect(() => {
    if (isOpen) {
      setQuery("");
      setSelectedIdx(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const execute = (cmd: Command) => {
    setOpen(false);
    cmd.action();
  };

  return (
    <div
      style={{
        position: "fixed", inset: 0, zIndex: 1000,
        display: "flex", alignItems: "flex-start", justifyContent: "center",
        paddingTop: "10vh",
        background: "rgba(0,0,0,0.4)", backdropFilter: "blur(4px)",
        animation: "fadeIn 0.1s ease",
      }}
      onClick={() => setOpen(false)}
    >
      <div
        style={{
          width: 520, maxHeight: 420, background: "var(--bg-surface)",
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
            if (e.key === "Enter" && filtered[selectedIdx]) execute(filtered[selectedIdx]);
            if (e.key === "Escape") setOpen(false);
          }}
          placeholder="输入命令..."
          style={{
            width: "100%", padding: "12px 16px", fontSize: 15,
            background: "transparent", border: "none",
            borderBottom: "1px solid var(--border)",
            color: "var(--text-primary)", outline: "none",
          }}
        />
        <div style={{ maxHeight: 360, overflowY: "auto" }}>
          {filtered.length === 0 ? (
            <div style={{ padding: 24, textAlign: "center", color: "var(--text-secondary)", fontSize: 13 }}>
              没有匹配的命令
            </div>
          ) : (
            filtered.map((cmd, i) => (
              <button
                key={cmd.id}
                onClick={() => execute(cmd)}
                style={{
                  display: "flex", alignItems: "center", gap: 10,
                  width: "100%", padding: "8px 16px", fontSize: 13,
                  background: i === selectedIdx ? "var(--bg-hover)" : "transparent",
                  color: "var(--text-primary)", cursor: "pointer", textAlign: "left",
                }}
                onMouseEnter={() => setSelectedIdx(i)}
              >
                <span style={{ flex: 1 }}>{cmd.label}</span>
                <span style={{ fontSize: 11, color: "var(--text-secondary)", opacity: 0.6 }}>{cmd.category}</span>
                {cmd.shortcut && (
                  <span style={{
                    fontSize: 11, padding: "2px 6px", borderRadius: 4,
                    background: "var(--bg-primary)", color: "var(--text-secondary)",
                  }}>
                    {cmd.shortcut}
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
