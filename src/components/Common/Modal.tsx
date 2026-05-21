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
        paddingTop: "15vh",
        background: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)",
        animation: "fadeIn 0.15s ease",
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: "var(--bg-surface)", borderRadius: 12,
          border: "1px solid var(--border)",
          boxShadow: "0 16px 48px rgba(0,0,0,0.4)",
          width: width || "100%", maxWidth,
          animation: "scaleIn 0.15s ease",
          overflow: "hidden",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {(title || showClose) && (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 16px", borderBottom: "1px solid var(--border)" }}>
            {title && <span style={{ fontWeight: 600, fontSize: 14 }}>{title}</span>}
            {showClose && (
              <button onClick={onClose} style={{ padding: 4, borderRadius: 4, display: "flex", color: "var(--text-secondary)" }}
                onMouseEnter={(e) => (e.currentTarget.style.background = "var(--bg-hover)")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "none")}
              >
                <X size={16} />
              </button>
            )}
          </div>
        )}
        <div style={{ padding: 16 }}>{children}</div>
      </div>
    </div>
  );
}
