import React, { useState, useRef, useEffect } from "react";
import { ChevronDown } from "lucide-react";

interface DropdownOption {
  value: string;
  label: string;
}

interface DropdownProps {
  value: string;
  options: DropdownOption[];
  onChange: (value: string) => void;
  label?: string;
  width?: number;
}

export default function Dropdown({ value, options, onChange, label, width = 120 }: DropdownProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const selected = options.find((o) => o.value === value);

  return (
    <div ref={ref} style={{ position: "relative", width }}>
      {label && (
        <span style={{ fontSize: 11, color: "var(--text-secondary)", marginBottom: 2, display: "block" }}>{label}</span>
      )}
      <button
        onClick={() => setOpen(!open)}
        style={{
          display: "flex", alignItems: "center", justifyContent: "space-between", gap: 4,
          width: "100%", padding: "4px 8px", fontSize: 12,
          background: "var(--bg-primary)", border: "1px solid var(--border)",
          borderRadius: 6, color: "var(--text-primary)", cursor: "pointer",
        }}
      >
        <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {selected?.label || value}
        </span>
        <ChevronDown size={12} style={{ flexShrink: 0, transform: open ? "rotate(180deg)" : "none", transition: "0.15s" }} />
      </button>
      {open && (
        <div
          style={{
            position: "absolute", top: "100%", left: 0, right: 0, marginTop: 4,
            background: "var(--bg-surface)", border: "1px solid var(--border)",
            borderRadius: 8, boxShadow: "0 8px 24px rgba(0,0,0,0.3)",
            maxHeight: 240, overflowY: "auto", zIndex: 500,
            animation: "slideDown 0.1s ease",
          }}
        >
          {options.map((opt) => (
            <button
              key={opt.value}
              onClick={() => { onChange(opt.value); setOpen(false); }}
              style={{
                display: "block", width: "100%", padding: "6px 10px", fontSize: 12,
                textAlign: "left", color: opt.value === value ? "var(--accent)" : "var(--text-primary)",
                background: opt.value === value ? "var(--selection)" : "transparent",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "var(--bg-hover)")}
              onMouseLeave={(e) => (e.currentTarget.style.background = opt.value === value ? "var(--selection)" : "transparent")}
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
