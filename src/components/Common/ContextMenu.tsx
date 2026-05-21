import React, { useEffect, useRef } from "react";
import { createPortal } from "react-dom";

export interface ContextMenuItem {
  label: string;
  icon?: React.ReactNode;
  shortcut?: string;
  action: () => void;
  divider?: boolean;
  disabled?: boolean;
  danger?: boolean;
}

interface ContextMenuProps {
  x: number;
  y: number;
  items: ContextMenuItem[];
  onClose: () => void;
}

export default function ContextMenu({ x, y, items, onClose }: ContextMenuProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Delay adding the close listener by one frame so the right-click
    // that opened the menu doesn't immediately close it
    const id = requestAnimationFrame(() => {
      const handler = (e: MouseEvent) => {
        if (ref.current && !ref.current.contains(e.target as Node)) {
          onClose();
        }
      };
      const keyHandler = (e: KeyboardEvent) => {
        if (e.key === "Escape") onClose();
      };
      document.addEventListener("mousedown", handler);
      document.addEventListener("keydown", keyHandler);

      // Store cleanup on the ref so we can remove later
      (ref.current as any).__cleanup = () => {
        document.removeEventListener("mousedown", handler);
        document.removeEventListener("keydown", keyHandler);
      };
    });

    return () => {
      cancelAnimationFrame(id);
      const cleanup = (ref.current as any)?.__cleanup;
      if (cleanup) cleanup();
    };
  }, [onClose]);

  // Adjust position to stay in viewport
  const menuWidth = 200;
  const menuHeight = items.length * 34;
  const adjustedX = x + menuWidth > window.innerWidth ? x - menuWidth : x;
  const adjustedY = y + menuHeight > window.innerHeight ? y - menuHeight : y;

  const menu = (
    <div
      ref={ref}
      style={{
        position: "fixed",
        left: Math.max(4, adjustedX),
        top: Math.max(4, adjustedY),
        zIndex: 9999,
        background: "var(--bg-surface)",
        borderRadius: 8,
        border: "1px solid var(--border)",
        boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
        minWidth: 180,
        maxWidth: 280,
        padding: "4px 0",
        animation: "scaleIn 0.08s ease",
        overflow: "hidden",
      }}
    >
      {items.map((item, i) => {
        if (item.divider) {
          return <div key={i} style={{ height: 1, background: "var(--border)", margin: "4px 8px" }} />;
        }
        return (
          <button
            key={i}
            onClick={() => {
              if (!item.disabled) {
                item.action();
                onClose();
              }
            }}
            disabled={item.disabled}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              width: "100%",
              padding: "7px 12px",
              fontSize: 13,
              color: item.danger ? "var(--error)" : item.disabled ? "var(--text-secondary)" : "var(--text-primary)",
              opacity: item.disabled ? 0.5 : 1,
              cursor: item.disabled ? "default" : "pointer",
              textAlign: "left",
              background: "none",
              border: "none",
              transition: "background 0.1s",
            }}
            onMouseEnter={(e) => {
              if (!item.disabled) e.currentTarget.style.background = "var(--bg-hover)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "none";
            }}
          >
            {item.icon && (
              <span style={{ width: 16, display: "flex", justifyContent: "center", flexShrink: 0 }}>
                {item.icon}
              </span>
            )}
            <span style={{ flex: 1 }}>{item.label}</span>
            {item.shortcut && (
              <span style={{ fontSize: 11, color: "var(--text-secondary)", marginLeft: 16, flexShrink: 0 }}>
                {item.shortcut}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );

  // Render via portal to escape overflow:hidden containers
  return createPortal(menu, document.body);
}
