import React, { memo, useState, useRef, useCallback } from "react";
import { X, Pin } from "lucide-react";
import type { Tab } from "@/types";

interface TabItemProps {
  tab: Tab;
  isActive: boolean;
  /** 回调统一按 tabId 传参：父级可以用 useCallback 提供稳定引用，配合 memo 跳过无关重渲染 */
  onSelect: (tabId: string) => void;
  onClose: (tabId: string) => void;
  onRename: (tabId: string, name: string) => void;
  onContextMenu: (e: React.MouseEvent, tabId: string) => void;
  /** 落点指示线相对本行的位置 */
  dropIndicator?: "above" | "below" | null;
  /** 拖拽排序：行在列表中的序号（写入 data-tab-index 供命中测试） */
  dataTabIndex?: number;
  /** 拖拽排序：在行上按下指针时触发（父级监听 window 的 pointermove/up 完成排序）；
   *  第二个参数为本行的 dataTabIndex */
  onRowPointerDown?: (e: React.PointerEvent, tabIndex: number) => void;
}

function TabItem({
  tab,
  isActive,
  onSelect,
  onClose,
  onRename,
  onContextMenu,
  dropIndicator,
  dataTabIndex,
  onRowPointerDown,
}: TabItemProps) {
  const [editing, setEditing] = useState(false);
  const [editValue, setEditValue] = useState(tab.name);
  const [hovered, setHovered] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDoubleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setEditing(true);
    setEditValue(tab.name);
    setTimeout(() => inputRef.current?.select(), 10);
  };

  const handleRename = () => {
    if (editValue.trim()) onRename(tab.id, editValue.trim());
    setEditing(false);
  };

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => onRowPointerDown?.(e, dataTabIndex ?? -1),
    [onRowPointerDown, dataTabIndex]
  );

  return (
    <div
      onClick={() => onSelect(tab.id)}
      onContextMenu={(e) => onContextMenu(e, tab.id)}
      onDoubleClick={handleDoubleClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      data-tab-index={dataTabIndex}
      onPointerDown={onRowPointerDown ? handlePointerDown : undefined}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 0,
        padding: "5px 6px 5px 0",
        cursor: "pointer",
        background: isActive ? "var(--bg-secondary)" : (hovered ? "var(--bg-secondary)" : "transparent"),
        borderLeft: isActive ? `3px solid ${tab.color || "var(--accent)"}` : "3px solid transparent",
        transition: "background 0.15s",
        position: "relative",
        minHeight: 30,
      }}
    >
      {/* 落点指示线：拖拽排序时显示在行的上/下边缘 */}
      {dropIndicator && (
        <div
          style={{
            position: "absolute",
            left: 6,
            right: 4,
            height: 2,
            borderRadius: 1,
            background: "var(--accent)",
            boxShadow: "0 0 4px var(--accent)",
            pointerEvents: "none",
            zIndex: 2,
            ...(dropIndicator === "above" ? { top: -1 } : { bottom: -1 }),
          }}
        />
      )}

      {/* Color dot - inline with name area */}
      <div style={{
        display: "flex",
        alignItems: "center",
        gap: 6,
        flex: 1,
        minWidth: 0, // critical for flex text truncation
        paddingLeft: 8,
      }}>
        {/* Icon: file */}
        <span style={{
          width: 8,
          height: 8,
          borderRadius: "50%",
          background: tab.color || (isActive ? "var(--accent)" : "var(--text-secondary)"),
          flexShrink: 0,
          opacity: tab.color ? 1 : 0.4,
        }} />

        {/* Tab name or edit input */}
        {editing ? (
          <input
            ref={inputRef}
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onBlur={handleRename}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleRename();
              if (e.key === "Escape") setEditing(false);
            }}
            style={{
              flex: 1,
              fontSize: 13,
              background: "var(--bg-primary)",
              border: "1px solid var(--accent)",
              borderRadius: 4,
              padding: "2px 6px",
              color: "var(--text-primary)",
              outline: "none",
              minWidth: 0,
              lineHeight: 1.4,
            }}
            onClick={(e) => e.stopPropagation()}
          />
        ) : (
          <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 1 }}>
            <span
              style={{
                fontSize: 13,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
                color: isActive ? "var(--text-primary)" : "var(--text-secondary)",
                lineHeight: 1.4,
              }}
              title={tab.name}
            >
              {tab.name}
            </span>
            {tab.filePath && (
              <span
                style={{
                  fontSize: 10,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                  color: "var(--text-secondary)",
                  opacity: 0.6,
                  lineHeight: 1.2,
                }}
                title={tab.filePath}
              >
                {tab.filePath}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Right side: pin + dirty dot + close button */}
      <div style={{
        display: "flex",
        alignItems: "center",
        gap: 4,
        flexShrink: 0,
        paddingLeft: 4,
        paddingRight: 2,
      }}>
        {/* Pinned indicator */}
        {tab.pinned && !editing && (
          <Pin size={11} style={{ color: "var(--accent)", flexShrink: 0 }} fill="var(--accent)" />
        )}

        {/* Dirty indicator */}
        {tab.dirty && !editing && (
          <span style={{
            width: 6,
            height: 6,
            borderRadius: "50%",
            background: "var(--warning)",
            flexShrink: 0,
          }} />
        )}

        {/* Close button - always visible for file tabs with filePath */}
        {(hovered || isActive || tab.filePath) && !editing && (
          <button
            onClick={(e) => { e.stopPropagation(); onClose(tab.id); }}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: 20,
              height: 20,
              borderRadius: 4,
              color: hovered ? "var(--text-primary)" : "var(--text-secondary)",
              cursor: "pointer",
              flexShrink: 0,
              background: "transparent",
              opacity: hovered || isActive ? 1 : 0.5,
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "var(--bg-hover)";
              e.currentTarget.style.color = "var(--text-primary)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "transparent";
              e.currentTarget.style.color = "var(--text-secondary)";
            }}
          >
            <X size={13} />
          </button>
        )}
      </div>
    </div>
  );
}

// memo：tab 对象引用仅在自身字段变化时更换，isActive/dropIndicator/dataTabIndex
// 为原始值，回调由父级用 useCallback 稳定——其它便签击键时本行直接跳过重渲染
export default memo(TabItem);
