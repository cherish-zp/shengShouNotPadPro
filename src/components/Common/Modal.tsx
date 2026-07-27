import React, { useEffect } from "react";
import { X } from "lucide-react";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  width?: string;
  maxWidth?: string;
  showClose?: boolean;
}

export default function Modal({ isOpen, onClose, title, children, width, maxWidth = "600px", showClose = true }: ModalProps) {
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: "fixed", inset: 0, zIndex: 1000,
        display: "flex", alignItems: "flex-start", justifyContent: "center",
        paddingTop: "12vh",
        background: "rgba(0,0,0,0.55)", backdropFilter: "blur(8px) saturate(1.1)",
        animation: "fadeIn 180ms cubic-bezier(0.4, 0, 0.2, 1)",
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: "var(--bg-surface)", borderRadius: 16,
          border: "1px solid var(--border)",
          boxShadow: "var(--shadow-xl), 0 0 0 1px rgba(255,255,255,0.03)",
          width: width || "100%", maxWidth,
          animation: "scaleIn 200ms cubic-bezier(0.34, 1.56, 0.64, 1)",
          overflow: "hidden",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {(title || showClose) && (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 20px", borderBottom: "1px solid var(--border)" }}>
            {title && <span style={{ fontWeight: 600, fontSize: 15, letterSpacing: "-0.01em" }}>{title}</span>}
            {showClose && (
              <button onClick={onClose} style={{ padding: 5, borderRadius: 8, display: "flex", color: "var(--text-secondary)", transition: "all 150ms" }}
                onMouseEnter={(e) => { e.currentTarget.style.background = "var(--bg-hover)"; e.currentTarget.style.color = "var(--text-primary)"; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = "none"; e.currentTarget.style.color = "var(--text-secondary)"; }}
              >
                <X size={16} />
              </button>
            )}
          </div>
        )}
        <div style={{ padding: 20 }}>{children}</div>
      </div>
    </div>
  );
}
