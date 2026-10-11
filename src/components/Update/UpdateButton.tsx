import React from "react";
import { ArrowDownToLine, RefreshCw } from "lucide-react";
import { useUpdateStore } from "@/store/updateStore";

/**
 * 窗口右上角的「检查更新」圆形图标按钮（Codex 风格，直径 30px）。
 * 点击一律触发 checkNow()；checking / downloading / ready 期间禁用。
 *
 * 状态 → 图标 / 配色 / 提示文案：
 *   idle / up-to-date  ghost（bg-hover 底 + text-secondary 图标）「检查更新」
 *   checking           RefreshCw 旋转「正在检查…」
 *   available          accent 实心 + 白色图标 + pulse「发现新版本，点击查看」
 *   downloading        RefreshCw 旋转「下载中 x%」
 *   ready              accent 实心 + pulse「重启以完成更新」
 *   error              ghost + error 色图标「检查失败，点击重试」
 *
 * 动画 keyframes 通过内嵌 <style> 定义（先例：MarkdownPreview.tsx）。
 */
export default function UpdateButton() {
  const phase = useUpdateStore((s) => s.phase);
  const progress = useUpdateStore((s) => s.progress);
  const checkNow = useUpdateStore((s) => s.checkNow);

  const disabled = phase === "checking" || phase === "downloading" || phase === "ready";
  const solid = phase === "available" || phase === "ready";
  const errored = phase === "error";
  const spinning = phase === "checking" || phase === "downloading";
  const Icon = spinning || phase === "ready" ? RefreshCw : ArrowDownToLine;

  const title =
    phase === "checking"
      ? "正在检查…"
      : phase === "available"
        ? "发现新版本，点击查看"
        : phase === "downloading"
          ? progress > 0
            ? `下载中 ${Math.round(progress)}%`
            : "下载中…"
          : phase === "ready"
            ? "重启以完成更新"
            : errored
              ? "检查失败，点击重试"
              : "检查更新";

  const iconColor = solid ? "#fff" : errored ? "var(--error, #ff3b30)" : "var(--text-secondary)";

  const buttonStyle: React.CSSProperties = {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    width: 30,
    height: 30,
    borderRadius: "50%",
    border: "none",
    padding: 0,
    flexShrink: 0,
    cursor: disabled ? "default" : "pointer",
    transition: "all 0.15s",
    background: solid ? "var(--accent)" : "var(--bg-hover)",
    color: iconColor,
    animation: solid ? "ss-update-pulse 1.6s ease-in-out infinite" : undefined,
  };

  return (
    <button
      onClick={() => {
        if (!disabled) void checkNow();
      }}
      title={title}
      aria-label={title}
      disabled={disabled}
      style={buttonStyle}
      onMouseEnter={(e) => {
        if (disabled) return;
        if (solid) e.currentTarget.style.background = "var(--accent-hover)";
        else e.currentTarget.style.color = "var(--text-primary)";
      }}
      onMouseLeave={(e) => {
        if (solid) e.currentTarget.style.background = "var(--accent)";
        else e.currentTarget.style.color = iconColor;
      }}
    >
      <style>{`
        @keyframes ss-update-spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes ss-update-pulse { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.1); } }
      `}</style>
      <Icon
        size={14}
        style={spinning ? { animation: "ss-update-spin 1s linear infinite" } : undefined}
      />
    </button>
  );
}
