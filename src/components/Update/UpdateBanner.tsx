import React, { useState } from "react";
import { ArrowDownToLine, RefreshCw, X } from "lucide-react";
import { useUpdateStore } from "@/store/updateStore";
import { classifyUpdateError } from "@/utils/updateLogic";

/**
 * 底部悬浮更新横幅：
 * available（发现新版本）/ downloading（下载进度）/ ready（待重启）/ error（手动检查失败）四态；
 * idle / up-to-date / checking 不渲染（静默检查的错误也不进这里）。
 */
export default function UpdateBanner() {
  const phase = useUpdateStore((s) => s.phase);
  const version = useUpdateStore((s) => s.version);
  const notes = useUpdateStore((s) => s.notes);
  const progress = useUpdateStore((s) => s.progress);
  const error = useUpdateStore((s) => s.error);
  const downloadAndInstall = useUpdateStore((s) => s.downloadAndInstall);
  const restartToUpdate = useUpdateStore((s) => s.restartToUpdate);
  const ignoreCurrentVersion = useUpdateStore((s) => s.ignoreCurrentVersion);
  const dismissError = useUpdateStore((s) => s.dismissError);

  const [notesOpen, setNotesOpen] = useState(false);

  if (phase !== "available" && phase !== "downloading" && phase !== "ready" && phase !== "error") {
    return null;
  }

  // 主按钮（accent 风格，与 EditorContainer 的「新建便签」一致）
  const primaryBtn: React.CSSProperties = {
    display: "flex",
    alignItems: "center",
    gap: 6,
    padding: "6px 14px",
    borderRadius: 8,
    background: "var(--accent)",
    color: "var(--bg-primary)",
    border: "none",
    fontSize: 13,
    fontWeight: 500,
    cursor: "pointer",
    whiteSpace: "nowrap",
    transition: "all 0.15s",
  };
  // 次按钮（描边幽灵风格）
  const ghostBtn: React.CSSProperties = {
    display: "flex",
    alignItems: "center",
    gap: 4,
    padding: "6px 10px",
    borderRadius: 8,
    background: "transparent",
    color: "var(--text-secondary)",
    border: "1px solid var(--border)",
    fontSize: 12,
    cursor: "pointer",
    whiteSpace: "nowrap",
    transition: "all 0.15s",
  };

  const onEnterPrimary = (e: React.MouseEvent<HTMLButtonElement>) =>
    (e.currentTarget.style.background = "var(--accent-hover)");
  const onLeavePrimary = (e: React.MouseEvent<HTMLButtonElement>) =>
    (e.currentTarget.style.background = "var(--accent)");

  const container: React.CSSProperties = {
    position: "fixed",
    bottom: 20,
    left: "50%",
    transform: "translateX(-50%)",
    zIndex: 900, // 低于设置弹窗（1000）
    width: "min(92%, 560px)",
    display: "flex",
    alignItems: "center",
    gap: 12,
    padding: "12px 14px",
    borderRadius: 12,
    background: "var(--bg-primary)",
    border: "1px solid var(--border)",
    boxShadow: "0 8px 28px rgba(0, 0, 0, 0.18)",
  };

  // —— 错误态：文案 + 关闭（只有手动检查的错误会进到这）——
  if (phase === "error") {
    return (
      <div style={container}>
        <span style={{ fontSize: 13, color: "var(--error, #ff3b30)", flex: 1, minWidth: 0 }}>
          检查更新失败：{classifyUpdateError(error)}
        </span>
        <button
          onClick={dismissError}
          title="关闭"
          style={{ ...ghostBtn, padding: 6, border: "none" }}
          onMouseEnter={(e) => (e.currentTarget.style.color = "var(--text-primary)")}
          onMouseLeave={(e) => (e.currentTarget.style.color = "var(--text-secondary)")}
        >
          <X size={14} />
        </button>
      </div>
    );
  }

  // —— 发现新版本：标题 + 更新说明（可折叠、限高滚动）+ 立即更新 / 忽略此版本 ——
  if (phase === "available") {
    return (
      <div style={{ ...container, flexDirection: "column", alignItems: "stretch", gap: 8 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span
            style={{
              width: 32,
              height: 32,
              borderRadius: "50%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
              background: "var(--accent-soft, var(--bg-hover))",
              color: "var(--accent)",
            }}
          >
            <ArrowDownToLine size={16} />
          </span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)" }}>
              发现新版本 v{version}
            </div>
            {notes && (
              <button
                onClick={() => setNotesOpen((v) => !v)}
                style={{
                  marginTop: 2,
                  background: "none",
                  border: "none",
                  padding: 0,
                  fontSize: 12,
                  color: "var(--text-secondary)",
                  cursor: "pointer",
                }}
              >
                {notesOpen ? "收起更新说明 ▲" : "查看更新说明 ▼"}
              </button>
            )}
          </div>
          <button
            onClick={() => void downloadAndInstall()}
            style={primaryBtn}
            onMouseEnter={onEnterPrimary}
            onMouseLeave={onLeavePrimary}
          >
            立即更新
          </button>
          <button onClick={ignoreCurrentVersion} style={ghostBtn} title="这个版本不再提示">
            忽略此版本
          </button>
        </div>
        {notes && notesOpen && (
          <div
            style={{
              maxHeight: 120,
              overflowY: "auto",
              padding: "8px 10px",
              borderRadius: 8,
              background: "var(--bg-hover)",
              fontSize: 12,
              lineHeight: 1.6,
              color: "var(--text-secondary)",
              whiteSpace: "pre-wrap",
              wordBreak: "break-word",
            }}
          >
            {notes}
          </div>
        )}
      </div>
    );
  }

  // —— 下载中：进度条 + 百分比 ——
  if (phase === "downloading") {
    return (
      <div style={{ ...container, flexDirection: "column", alignItems: "stretch", gap: 8 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)" }}>
            正在下载更新…
          </span>
          <span style={{ fontSize: 12, color: "var(--text-secondary)", fontFamily: "monospace" }}>
            下载中 {progress}%
          </span>
        </div>
        <div
          style={{
            height: 6,
            borderRadius: 999,
            background: "var(--bg-hover)",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              height: "100%",
              width: `${progress}%`,
              borderRadius: 999,
              background: "var(--accent)",
              transition: "width 0.2s ease",
            }}
          />
        </div>
      </div>
    );
  }

  // —— 更新就绪：重启并更新 ——
  return (
    <div style={container}>
      <span
        style={{
          width: 28,
          height: 28,
          borderRadius: "50%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
          background: "var(--accent-soft, var(--bg-hover))",
          color: "var(--success)",
        }}
      >
        <RefreshCw size={14} />
      </span>
      <span style={{ flex: 1, minWidth: 0, fontSize: 13, fontWeight: 600, color: "var(--text-primary)" }}>
        更新已就绪，重启后生效
      </span>
      <button
        onClick={() => void restartToUpdate()}
        style={primaryBtn}
        onMouseEnter={onEnterPrimary}
        onMouseLeave={onLeavePrimary}
      >
        重启并更新
      </button>
    </div>
  );
}
