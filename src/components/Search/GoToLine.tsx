import React, { useState, useRef, useEffect } from "react";
import { useEditorStore } from "@/store/editorStore";

export default function GoToLine() {
  const isOpen = useEditorStore((s) => s.goToLineOpen);
  const setOpen = useEditorStore((s) => s.setGoToLineOpen);
  const [value, setValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setValue("");
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: "fixed", inset: 0, zIndex: 1000,
        display: "flex", alignItems: "flex-start", justifyContent: "center",
        paddingTop: "15vh",
        background: "rgba(0,0,0,0.3)", backdropFilter: "blur(2px)",
        animation: "fadeIn 0.1s ease",
      }}
      onClick={() => setOpen(false)}
    >
      <div
        style={{
          width: 300, background: "var(--bg-surface)",
          borderRadius: 10, border: "1px solid var(--border)",
          boxShadow: "0 8px 32px rgba(0,0,0,0.3)", overflow: "hidden",
          animation: "scaleIn 0.1s ease",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <input
          ref={inputRef}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              // Go to line - dispatch event
              window.dispatchEvent(new CustomEvent("novaedit:goToLine", { detail: { line: parseInt(value) } }));
              setOpen(false);
            }
            if (e.key === "Escape") setOpen(false);
          }}
          placeholder="输入行号..."
          style={{
            width: "100%", padding: "10px 14px", fontSize: 14,
            background: "transparent", border: "none",
            color: "var(--text-primary)", outline: "none",
          }}
        />
      </div>
    </div>
  );
}
