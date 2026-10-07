import React, { useState } from "react";
import { Plus, Search } from "lucide-react";
import { useTabStore } from "@/store/tabStore";
import TabItem from "./TabItem";
import TabContextMenu from "./TabContextMenu";
import type { TabColor } from "@/types";

export default function TabList() {
  const tabs = useTabStore((s) => s.tabs);
  const activeTabId = useTabStore((s) => s.activeTabId);
  const addTab = useTabStore((s) => s.addTab);
  const closeTab = useTabStore((s) => s.closeTab);
  const setActiveTab = useTabStore((s) => s.setActiveTab);
  const renameTab = useTabStore((s) => s.renameTab);
  const setTabColor = useTabStore((s) => s.setTabColor);
  const closeOthers = useTabStore((s) => s.closeOthers);
  const closeAll = useTabStore((s) => s.closeAll);

  const [filter, setFilter] = useState("");
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; tabId: string } | null>(null);
  const [showSearch, setShowSearch] = useState(false);

  const filtered = filter
    ? tabs.filter((t) => t.name.toLowerCase().includes(filter.toLowerCase()))
    : tabs;

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      {/* Header */}
      <div style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "10px 10px 8px 12px",
        borderBottom: "1px solid var(--border)",
        flexShrink: 0,
      }}>
        <span style={{
          fontSize: 11,
          fontWeight: 700,
          color: "var(--text-secondary)",
          textTransform: "uppercase",
          letterSpacing: "0.08em",
        }}>
          便签
        </span>
        <div style={{ display: "flex", gap: 2 }}>
          <button
            onClick={() => setShowSearch(!showSearch)}
            title="搜索便签"
            style={{
              display: "flex", alignItems: "center", justifyContent: "center",
              width: 26, height: 26, borderRadius: 6,
              color: showSearch ? "var(--accent)" : "var(--text-secondary)",
              background: showSearch ? "var(--bg-hover)" : "transparent",
              cursor: "pointer",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = "var(--bg-hover)")}
            onMouseLeave={(e) => {
              if (!showSearch) e.currentTarget.style.background = "transparent";
            }}
          >
            <Search size={13} />
          </button>
          <button
            onClick={() => addTab()}
            title="新建便签 (⌘N)"
            style={{
              display: "flex", alignItems: "center", justifyContent: "center",
              width: 26, height: 26, borderRadius: 6,
              color: "var(--text-secondary)",
              background: "transparent",
              cursor: "pointer",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = "var(--bg-hover)")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
          >
            <Plus size={14} />
          </button>
        </div>
      </div>

      {/* Search filter */}
      {showSearch && (
        <div style={{ padding: "6px 10px", borderBottom: "1px solid var(--border)", flexShrink: 0 }}>
          <input
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="搜索便签..."
            autoFocus
            style={{
              width: "100%",
              padding: "5px 8px",
              fontSize: 12,
              background: "var(--bg-primary)",
              border: "1px solid var(--border)",
              borderRadius: 6,
              color: "var(--text-primary)",
              outline: "none",
            }}
          />
        </div>
      )}

      {/* Tab list */}
      <div style={{ flex: 1, overflowY: "auto", overflowX: "hidden" }}>
        {filtered.length === 0 ? (
          <div style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            height: 120,
            color: "var(--text-secondary)",
            fontSize: 12,
            opacity: 0.5,
            gap: 8,
          }}>
            <span>{filter ? "没有匹配的便签" : "⌘N 新建便签"}</span>
          </div>
        ) : (
          filtered.map((tab) => (
            <TabItem
              key={tab.id}
              tab={tab}
              isActive={tab.id === activeTabId}
              onSelect={() => setActiveTab(tab.id)}
              onClose={() => closeTab(tab.id)}
              onRename={(name) => renameTab(tab.id, name)}
              onContextMenu={(e) => {
                e.preventDefault();
                setContextMenu({ x: e.clientX, y: e.clientY, tabId: tab.id });
              }}
            />
          ))
        )}
      </div>

      {/* Context menu */}
      {contextMenu && (
        <TabContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          tabId={contextMenu.tabId}
          hasFilePath={!!tabs.find((t) => t.id === contextMenu.tabId)?.filePath}
          pinned={!!tabs.find((t) => t.id === contextMenu.tabId)?.pinned}
          onClose={() => setContextMenu(null)}
          onRename={() => {}}
          onTogglePin={() => {}}
          onSetColor={(color: TabColor | undefined) => setTabColor(contextMenu.tabId, color)}
          onCloseTab={() => closeTab(contextMenu.tabId)}
          onCloseOthers={() => closeOthers(contextMenu.tabId)}
          onCloseAll={() => closeAll()}
          onCopyPath={() => {
            const tab = tabs.find((t) => t.id === contextMenu.tabId);
            if (tab?.filePath) navigator.clipboard.writeText(tab.filePath);
          }}
          onReveal={() => {
            const tab = tabs.find((t) => t.id === contextMenu.tabId);
            if (tab?.filePath) {
              import("@tauri-apps/api/core").then(({ invoke }) => {
                invoke("reveal_in_finder", { path: tab.filePath });
              }).catch(() => {});
            }
          }}
          onSave={() => {
            window.dispatchEvent(new CustomEvent("novaedit:save"));
          }}
        />
      )}
    </div>
  );
}
