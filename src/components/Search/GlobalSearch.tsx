import React, { useState } from "react";
import { Search, CaseSensitive, Regex } from "lucide-react";

export default function GlobalSearch() {
  const [query, setQuery] = useState("");
  const [caseSensitive, setCaseSensitive] = useState(false);
  const [useRegex, setUseRegex] = useState(false);

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <div style={{ padding: "8px 12px", borderBottom: "1px solid var(--border)" }}>
        <span style={{ fontSize: 12, fontWeight: 600, color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.05em", display: "block", marginBottom: 8 }}>
          全局搜索
        </span>
        <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="输入关键词搜索文件..."
            style={{
              flex: 1, padding: "6px 8px", fontSize: 13,
              background: "var(--bg-primary)", border: "1px solid var(--border)",
              borderRadius: 6, color: "var(--text-primary)", outline: "none",
            }}
          />
          <button onClick={() => setCaseSensitive(!caseSensitive)}
            style={{ padding: 4, borderRadius: 4, color: caseSensitive ? "var(--accent)" : "var(--text-secondary)", cursor: "pointer" }}
            title="区分大小写">
            <CaseSensitive size={14} />
          </button>
          <button onClick={() => setUseRegex(!useRegex)}
            style={{ padding: 4, borderRadius: 4, color: useRegex ? "var(--accent)" : "var(--text-secondary)", cursor: "pointer" }}
            title="正则表达式">
            <Regex size={14} />
          </button>
        </div>
      </div>
      <div style={{ flex: 1, overflowY: "auto", padding: 8, color: "var(--text-secondary)", fontSize: 12 }}>
        {!query && (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: 120, opacity: 0.5 }}>
            <Search size={24} style={{ marginBottom: 8 }} />
            <span>输入关键词搜索文件内容</span>
          </div>
        )}
      </div>
    </div>
  );
}
