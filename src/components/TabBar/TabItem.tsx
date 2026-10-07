import React, { useState, useRef } from "react";
import { X, Pin } from "lucide-react";
import type { Tab, TabColor } from "@/types";

interface TabItemProps {
  tab: Tab;
  isActive: boolean;
  onSelect: () => void;
  onClose: () => void;
  onRename: (name: string) => void;
  onContextMenu: (e: React.MouseEvent) => void;
  /** 拖拽排序（可选；搜索过滤时应禁用）。未传 onDragStart 时不开启拖拽 */
  dragDisabled?: boolean;
  /** 落点指示线相对本行的位置 */
  dropIndicator?: "above" | "below" | null;
  onDragStart?: (e: React.DragEvent) => void;
  onDragOver?: (e: React.DragEvent) => void;
  onDragLeave?: (e: React.DragEvent) => void;
  onDrop?: (e: React.DragEvent) => void;
  onDragEnd?: () => void;
}

export default function TabItem({
  tab,
  isActive,
  onSelect,
  onClose,
  onRename,
  onContextMenu,
  dragDisabled,
  dropIndicator,
  onDragStart,
  onDragOver,
  onDragLeave,
  onDrop,
  onDragEnd,
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
    if (editValue.trim()) onRename(editValue.trim());
    setEditing(false);
  };

  const draggable = !editing && !dragDisabled && typeof onDragStart === "function";

  return (
    <div
      onClick={onSelect}
      onContextMenu={onContextMenu}
      onDoubleClick={handleDoubleClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      draggable={draggable}
      onDragStart={draggable ? onDragStart : undefined}
      onDragOver={draggable ? onDragOver : undefined}
      onDragLeave={draggable ? onDragLeave : undefined}
      onDrop={draggable ? onDrop : undefined}
      onDragEnd={draggable ? onDragEnd : undefined}
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
            onClick={(e) => { e.stopPropagation(); onClose(); }}
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
