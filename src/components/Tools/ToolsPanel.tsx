import React, { useState } from "react";
import { useTabStore } from "@/store/tabStore";

const TOOLS = [
  { id: "json", label: "JSON 格式化" },
  { id: "base64", label: "Base64" },
  { id: "timestamp", label: "时间戳" },
  { id: "color", label: "颜色" },
  { id: "regex", label: "正则" },
];

// 把任何输入（#fff / fff / #ffffff / ffffff）规范化为 #rrggbb 小写
function normalizeHex(input: string): string {
  let s = (input || "").trim().toLowerCase();
  if (s.startsWith("#")) s = s.slice(1);
  if (/^[0-9a-f]{3}$/.test(s)) {
    s = s.split("").map((c) => c + c).join("");
  }
  if (!/^[0-9a-f]{6}$/.test(s)) return "#000000";
  return "#" + s;
}

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const h = normalizeHex(hex).slice(1);
  return {
    r: parseInt(h.slice(0, 2), 16),
    g: parseInt(h.slice(2, 4), 16),
    b: parseInt(h.slice(4, 6), 16),
  };
}

function rgbToHsl(r: number, g: number, b: number): { h: number; s: number; l: number } {
  const rn = r / 255, gn = g / 255, bn = b / 255;
  const max = Math.max(rn, gn, bn), min = Math.min(rn, gn, bn);
  let h = 0, s = 0;
  const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case rn: h = (gn - bn) / d + (gn < bn ? 6 : 0); break;
      case gn: h = (bn - rn) / d + 2; break;
      case bn: h = (rn - gn) / d + 4; break;
    }
    h /= 6;
  }
  return { h: Math.round(h * 360), s: Math.round(s * 100), l: Math.round(l * 100) };
}

export default function ToolsPanel() {
  const [activeTool, setActiveTool] = useState("json");
  const [jsonInput, setJsonInput] = useState("");
  const [jsonError, setJsonError] = useState("");
  const [b64Input, setB64Input] = useState("");
  const [tsInput, setTsInput] = useState("");
  const [colorHex, setColorHex] = useState("#2563EB");

  const addTab = useTabStore((s) => s.addTab);

  // 把结果输出到右侧编辑器（新建标签）
  const outputToEditor = (content: string, name: string, language: string = "plaintext") => {
    addTab({
      name,
      content,
      language,
      encoding: "UTF-8",
    });
  };

  const handleJsonFormat = (minify: boolean = false) => {
    try {
      const parsed = JSON.parse(jsonInput);
      const formatted = minify ? JSON.stringify(parsed) : JSON.stringify(parsed, null, 2);
      setJsonError("");
      outputToEditor(formatted, minify ? "压缩.json" : "格式化.json", "json");
    } catch (e) {
      setJsonError((e as Error).message);
    }
  };

  const handleJsonValidate = () => {
    try {
      JSON.parse(jsonInput);
      setJsonError("✓ 有效的 JSON");
    } catch (e) {
      setJsonError("✗ " + (e as Error).message);
    }
  };

  const handleBase64 = (encode: boolean) => {
    try {
      const result = encode
        ? btoa(unescape(encodeURIComponent(b64Input)))
        : decodeURIComponent(escape(atob(b64Input)));
      outputToEditor(result, encode ? "编码.txt" : "解码.txt");
    } catch {
      outputToEditor("解码失败：无效的 Base64 内容", "错误.txt");
    }
  };

  const handleTimestamp = () => {
    try {
      const d = new Date(parseInt(tsInput) * 1000);
      outputToEditor(
        `时间戳: ${tsInput}\n本地时间: ${d.toLocaleString("zh-CN")}\nISO 时间: ${d.toISOString()}\nUTC 时间: ${d.toUTCString()}`,
        "时间戳转换.txt"
      );
    } catch {
      // ignore
    }
  };

  const handleColorInfo = () => {
    const hex = normalizeHex(colorHex);
    const { r, g, b } = hexToRgb(hex);
    const { h, s, l } = rgbToHsl(r, g, b);
    outputToEditor(
      `HEX:  ${hex}\nRGB:  rgb(${r}, ${g}, ${b})\nRGBA: rgba(${r}, ${g}, ${b}, 1)\nHSL:  hsl(${h}, ${s}%, ${l}%)`,
      "颜色信息.txt"
    );
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <div style={{ padding: "8px 12px", borderBottom: "1px solid var(--border)" }}>
        <span style={{ fontSize: 12, fontWeight: 600, color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
          工具箱
        </span>
      </div>
      <div style={{ display: "flex", gap: 2, padding: "4px 8px", borderBottom: "1px solid var(--border)", flexWrap: "wrap" }}>
        {TOOLS.map((tool) => (
          <button
            key={tool.id}
            onClick={() => setActiveTool(tool.id)}
            style={{
              padding: "4px 10px", borderRadius: 6, fontSize: 11,
              background: activeTool === tool.id ? "var(--accent)" : "var(--bg-secondary)",
              color: activeTool === tool.id ? "#fff" : "var(--text-secondary)",
              cursor: "pointer",
            }}
          >
            {tool.label}
          </button>
        ))}
      </div>

      <div style={{ flex: 1, overflow: "auto", padding: 12, display: "flex", flexDirection: "column" }}>
        {activeTool === "json" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 8, flex: 1 }}>
            <div style={{ fontSize: 11, color: "var(--text-secondary)" }}>
              输入 JSON，结果将打开新标签显示
            </div>
            <textarea
              value={jsonInput}
              onChange={(e) => setJsonInput(e.target.value)}
              placeholder="粘贴 JSON 内容..."
              style={{ flex: 1, width: "100%", minHeight: 180, padding: 8, fontSize: 12, fontFamily: "monospace", background: "var(--bg-primary)", border: "1px solid var(--border)", borderRadius: 6, color: "var(--text-primary)", resize: "none" }}
            />
            <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
              <button
                onClick={() => handleJsonFormat(false)}
                style={{ padding: "6px 14px", borderRadius: 6, fontSize: 12, background: "var(--accent)", color: "#fff", cursor: "pointer", fontWeight: 500 }}
              >
                格式化
              </button>
              <button
                onClick={() => handleJsonFormat(true)}
                style={{ padding: "6px 14px", borderRadius: 6, fontSize: 12, background: "var(--bg-secondary)", color: "var(--text-primary)", cursor: "pointer", border: "1px solid var(--border)" }}
              >
                压缩
              </button>
              <button
                onClick={handleJsonValidate}
                style={{ padding: "6px 14px", borderRadius: 6, fontSize: 12, background: "var(--bg-secondary)", color: "var(--text-primary)", cursor: "pointer", border: "1px solid var(--border)" }}
              >
                验证
              </button>
            </div>
            {jsonError && (
              <div style={{
                fontSize: 12,
                color: jsonError.startsWith("✓") ? "var(--success)" : "var(--error)",
                padding: 8,
                background: "var(--bg-secondary)",
                borderRadius: 6,
                border: "1px solid var(--border)"
              }}>
                {jsonError}
              </div>
            )}
          </div>
        )}

        {activeTool === "base64" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 8, flex: 1 }}>
            <div style={{ fontSize: 11, color: "var(--text-secondary)" }}>
              输入文本，结果将打开新标签显示
            </div>
            <textarea
              value={b64Input}
              onChange={(e) => setB64Input(e.target.value)}
              placeholder="输入文本..."
              style={{ flex: 1, width: "100%", minHeight: 150, padding: 8, fontSize: 12, fontFamily: "monospace", background: "var(--bg-primary)", border: "1px solid var(--border)", borderRadius: 6, color: "var(--text-primary)", resize: "none" }}
            />
            <div style={{ display: "flex", gap: 4 }}>
              <button
                onClick={() => handleBase64(true)}
                style={{ padding: "6px 14px", borderRadius: 6, fontSize: 12, background: "var(--accent)", color: "#fff", cursor: "pointer", fontWeight: 500 }}
              >
                编码
              </button>
              <button
                onClick={() => handleBase64(false)}
                style={{ padding: "6px 14px", borderRadius: 6, fontSize: 12, background: "var(--bg-secondary)", color: "var(--text-primary)", cursor: "pointer", border: "1px solid var(--border)" }}
              >
                解码
              </button>
            </div>
          </div>
        )}

        {activeTool === "timestamp" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 10, fontSize: 12 }}>
            <div>
              当前时间戳: <span style={{ fontFamily: "monospace", color: "var(--accent)" }}>{Math.floor(Date.now() / 1000)}</span>
            </div>
            <input
              value={tsInput}
              onChange={(e) => setTsInput(e.target.value)}
              placeholder="输入时间戳..."
              style={{ padding: "6px 8px", background: "var(--bg-primary)", border: "1px solid var(--border)", borderRadius: 6, color: "var(--text-primary)", fontFamily: "monospace" }}
            />
            <button
              onClick={handleTimestamp}
              style={{ padding: "6px 14px", borderRadius: 6, fontSize: 12, background: "var(--accent)", color: "#fff", cursor: "pointer", alignSelf: "flex-start", fontWeight: 500 }}
            >
              转换为日期
            </button>
          </div>
        )}

        {activeTool === "color" && (() => {
          const hex = normalizeHex(colorHex);
          const { r, g, b } = hexToRgb(hex);
          const { h, s, l } = rgbToHsl(r, g, b);
          const copy = (text: string) => {
            navigator.clipboard?.writeText(text).catch(() => {});
          };
          const rowStyle: React.CSSProperties = {
            display: "flex", alignItems: "center", justifyContent: "space-between",
            padding: "6px 10px", borderRadius: 6,
            background: "var(--bg-secondary)", border: "1px solid var(--border)",
            fontSize: 12,
          };
          const codeStyle: React.CSSProperties = {
            fontFamily: "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace",
            color: "var(--text-primary)",
          };
          const copyBtn = (text: string) => (
            <button
              onClick={() => copy(text)}
              title="复制"
              style={{
                padding: "2px 8px", borderRadius: 4, fontSize: 11,
                background: "var(--bg-primary)", color: "var(--text-secondary)",
                border: "1px solid var(--border)", cursor: "pointer",
              }}
            >
              复制
            </button>
          );
          return (
            <div style={{ display: "flex", flexDirection: "column", gap: 10, fontSize: 12 }}>
              {/* 颜色预览块 + 选色器 */}
              <div
                style={{
                  position: "relative",
                  width: "100%", height: 90, borderRadius: 8,
                  background: hex, border: "1px solid var(--border)",
                  overflow: "hidden",
                }}
              >
                <input
                  type="color"
                  value={hex}
                  onChange={(e) => setColorHex(e.target.value)}
                  title="点击任意位置选取颜色"
                  style={{
                    position: "absolute", inset: 0,
                    width: "100%", height: "100%",
                    opacity: 0, cursor: "pointer", border: "none", padding: 0,
                  }}
                />
              </div>

              {/* HEX 手动输入 */}
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ color: "var(--text-secondary)", width: 36 }}>HEX</span>
                <input
                  value={colorHex}
                  onChange={(e) => setColorHex(e.target.value)}
                  onBlur={() => setColorHex(normalizeHex(colorHex))}
                  placeholder="#2563EB"
                  style={{
                    flex: 1, padding: "4px 8px",
                    background: "var(--bg-primary)", border: "1px solid var(--border)",
                    borderRadius: 6, color: "var(--text-primary)",
                    fontFamily: "ui-monospace, monospace", fontSize: 12,
                  }}
                />
                {copyBtn(hex)}
              </div>

              {/* RGB */}
              <div style={rowStyle}>
                <span style={codeStyle}>rgb({r}, {g}, {b})</span>
                {copyBtn(`rgb(${r}, ${g}, ${b})`)}
              </div>

              {/* HSL */}
              <div style={rowStyle}>
                <span style={codeStyle}>hsl({h}, {s}%, {l}%)</span>
                {copyBtn(`hsl(${h}, ${s}%, ${l}%)`)}
              </div>

              {/* RGBA */}
              <div style={rowStyle}>
                <span style={codeStyle}>rgba({r}, {g}, {b}, 1)</span>
                {copyBtn(`rgba(${r}, ${g}, ${b}, 1)`)}
              </div>

              <button
                onClick={handleColorInfo}
                style={{
                  padding: "6px 14px", borderRadius: 6, fontSize: 12,
                  background: "var(--accent)", color: "#fff",
                  cursor: "pointer", alignSelf: "flex-start", fontWeight: 500,
                }}
              >
                导出到新标签
              </button>
            </div>
          );
        })()}

        {activeTool === "regex" && (
          <div style={{ fontSize: 12, color: "var(--text-secondary)" }}>
            <p>正则表达式测试工具开发中...</p>
          </div>
        )}
      </div>
    </div>
  );
}
