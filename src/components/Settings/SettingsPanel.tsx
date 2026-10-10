import React, { useEffect, useState } from "react";
import Modal from "@/components/Common/Modal";
import { useEditorStore } from "@/store/editorStore";
import { useSettingsStore } from "@/store/settingsStore";
import { useUpdateStore } from "@/store/updateStore";
import { ACCENT_PRESETS } from "@/utils/themes";
import { isTauriEnvironment } from "@/utils/updateLogic";

type SettingsTab = "general" | "editor" | "theme" | "keybindings" | "about";

const TABS: { id: SettingsTab; label: string }[] = [
  { id: "general", label: "通用" },
  { id: "editor", label: "编辑器" },
  { id: "theme", label: "外观" },
  { id: "keybindings", label: "快捷键" },
  { id: "about", label: "关于与更新" },
];

export default function SettingsPanel() {
  const isOpen = useEditorStore((s) => s.settingsOpen);
  const setOpen = useEditorStore((s) => s.setSettingsOpen);
  const settings = useSettingsStore();
  const [activeTab, setActiveTab] = useState<SettingsTab>("general");

  if (!isOpen) return null;

  return (
    <Modal isOpen={isOpen} onClose={() => setOpen(false)} title="设置" width="700px">
      <div style={{ display: "flex", gap: 16, minHeight: 400 }}>
        <div style={{ width: 120, display: "flex", flexDirection: "column", gap: 2, flexShrink: 0 }}>
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                padding: "8px 12px", borderRadius: 8, fontSize: 13, textAlign: "left",
                background: activeTab === tab.id ? "var(--bg-hover)" : "transparent",
                color: activeTab === tab.id ? "var(--text-primary)" : "var(--text-secondary)",
                cursor: "pointer",
              }}
              onMouseEnter={(e) => { if (activeTab !== tab.id) e.currentTarget.style.background = "var(--bg-surface)"; }}
              onMouseLeave={(e) => { if (activeTab !== tab.id) e.currentTarget.style.background = "transparent"; }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 16 }}>
          {activeTab === "general" && (
            <>
              <SettingRow label="自动保存">
                <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
                  <input type="checkbox" checked={settings.autoSave} onChange={(e) => settings.updateSetting("autoSave", e.target.checked)} />
                  <span style={{ fontSize: 13 }}>启用</span>
                </label>
              </SettingRow>
              <SettingRow label="自动保存间隔">
                <input
                  type="range" min={5000} max={120000} step={5000}
                  value={settings.autoSaveInterval}
                  onChange={(e) => settings.updateSetting("autoSaveInterval", parseInt(e.target.value))}
                  style={{ width: 200 }}
                />
                <span style={{ fontSize: 12, color: "var(--text-secondary)", minWidth: 50 }}>
                  {settings.autoSaveInterval / 1000}秒
                </span>
              </SettingRow>
            </>
          )}

          {activeTab === "editor" && (
            <>
              <SettingRow label="字体大小">
                <input type="range" min={8} max={32} step={1} value={settings.fontSize}
                  onChange={(e) => settings.updateSetting("fontSize", parseInt(e.target.value))} style={{ width: 200 }} />
                <span style={{ fontSize: 12, color: "var(--text-secondary)", minWidth: 30 }}>{settings.fontSize}px</span>
              </SettingRow>
              <SettingRow label="行高">
                <input type="range" min={1} max={2.5} step={0.1} value={settings.lineHeight}
                  onChange={(e) => settings.updateSetting("lineHeight", parseFloat(e.target.value))} style={{ width: 200 }} />
                <span style={{ fontSize: 12, color: "var(--text-secondary)", minWidth: 30 }}>{settings.lineHeight}</span>
              </SettingRow>
              <SettingRow label="缩进大小">
                <select value={settings.tabSize}
                  onChange={(e) => settings.updateSetting("tabSize", parseInt(e.target.value))}
                  style={{ padding: "4px 8px", background: "var(--bg-primary)", border: "1px solid var(--border)", borderRadius: 6, color: "var(--text-primary)" }}>
                  <option value={2}>2 空格</option>
                  <option value={4}>4 空格</option>
                  <option value={8}>8 空格</option>
                </select>
              </SettingRow>
              <SettingRow label="自动换行">
                <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
                  <input type="checkbox" checked={settings.wordWrap} onChange={(e) => settings.updateSetting("wordWrap", e.target.checked)} />
                  <span style={{ fontSize: 13 }}>启用</span>
                </label>
              </SettingRow>
              <SettingRow label="显示行号">
                <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
                  <input type="checkbox" checked={settings.showLineNumbers} onChange={(e) => settings.updateSetting("showLineNumbers", e.target.checked)} />
                  <span style={{ fontSize: 13 }}>启用</span>
                </label>
              </SettingRow>
            </>
          )}

          {activeTab === "theme" && (
            <>
              <SettingRow label="主题模式">
                <div style={{ display: "flex", gap: 8 }}>
                  {(["dark", "light", "system"] as const).map((t) => (
                    <button key={t} onClick={() => settings.updateSetting("theme", t)}
                      style={{
                        padding: "6px 16px", borderRadius: 8, fontSize: 13,
                        background: settings.theme === t ? "var(--accent)" : "var(--bg-hover)",
                        color: settings.theme === t ? "var(--bg-primary)" : "var(--text-primary)",
                        cursor: "pointer",
                      }}>
                      {{ dark: "深色", light: "浅色", system: "跟随系统" }[t]}
                    </button>
                  ))}
                </div>
              </SettingRow>
              <SettingRow label="强调色">
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", maxWidth: 280 }}>
                  {ACCENT_PRESETS.map((preset) => {
                    const isSelected = settings.accentColor.toLowerCase() === preset.color.toLowerCase();
                    const isLight = preset.color.toLowerCase() === "#ffffff";
                    // 亮白用径向高光 + 外辉光，做出"自发光"质感
                    const background = isLight
                      ? "radial-gradient(circle at 35% 30%, #ffffff 0%, #f8fafc 45%, #e2e8f0 100%)"
                      : preset.color;
                    const baseBoxShadow = isLight
                      ? "0 0 8px 2px rgba(255,255,255,0.95), inset 0 0 6px rgba(255,255,255,0.9), 0 0 0 1px rgba(0,0,0,0.06)"
                      : "none";
                    const selectedBoxShadow = isLight
                      ? `0 0 0 2px var(--bg-primary), 0 0 0 4px ${preset.color}, 0 0 12px 4px rgba(255,255,255,0.95), inset 0 0 6px rgba(255,255,255,0.95)`
                      : `0 0 0 2px var(--bg-primary), 0 0 0 4px ${preset.color}`;
                    return (
                      <button
                        key={preset.color}
                        onClick={() => settings.updateSetting("accentColor", preset.color)}
                        title={preset.name}
                        style={{
                          width: 28, height: 28, borderRadius: "50%",
                          background, cursor: "pointer",
                          border: isSelected
                            ? "2px solid var(--text-primary)"
                            : "2px solid transparent",
                          boxShadow: isSelected ? selectedBoxShadow : baseBoxShadow,
                          transition: "all 0.15s",
                        }}
                      />
                    );
                  })}
                </div>
              </SettingRow>
              <SettingRow label="窗口透明度">
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <input
                    type="range" min={0.3} max={1} step={0.05}
                    value={settings.windowOpacity}
                    onChange={(e) => settings.updateSetting("windowOpacity", parseFloat(e.target.value))}
                    style={{ width: 200 }}
                  />
                  <span style={{ fontSize: 12, color: "var(--text-secondary)", minWidth: 36 }}>
                    {Math.round(settings.windowOpacity * 100)}%
                  </span>
                </div>
              </SettingRow>
            </>
          )}

          {activeTab === "about" && <AboutTab />}

          {activeTab === "keybindings" && (
            <div style={{ fontSize: 12, color: "var(--text-secondary)" }}>
              {[
                ["新建便签", "⌘N"], ["保存", "⌘S"], ["关闭便签", "⌘W"],
                ["查找", "⌘F"], ["替换", "⌘H"], ["全局搜索", "⌘⇧F"],
                ["快速打开", "⌘P"], ["命令面板", "⌘⇧P"], ["跳转到行", "⌘G"],
                ["切换侧边栏", "⌘B"],
                ["放大", "⌘+"], ["缩小", "⌘-"], ["重置缩放", "⌘0"],
              ].map(([label, keys]) => (
                <div key={label} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px solid var(--border)" }}>
                  <span>{label}</span>
                  <span style={{ padding: "2px 8px", borderRadius: 4, background: "var(--bg-hover)", fontFamily: "monospace" }}>{keys}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}

function SettingRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
      <span style={{ fontSize: 13, color: "var(--text-primary)" }}>{label}</span>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>{children}</div>
    </div>
  );
}

/** 「关于与更新」tab：当前版本、更新状态与操作、版权信息 */
function AboutTab() {
  const phase = useUpdateStore((s) => s.phase);
  const version = useUpdateStore((s) => s.version);
  const progress = useUpdateStore((s) => s.progress);
  const error = useUpdateStore((s) => s.error);
  const checkNow = useUpdateStore((s) => s.checkNow);
  const downloadAndInstall = useUpdateStore((s) => s.downloadAndInstall);
  const restartToUpdate = useUpdateStore((s) => s.restartToUpdate);
  const ignoreCurrentVersion = useUpdateStore((s) => s.ignoreCurrentVersion);
  // 当前应用版本：Tauri 环境动态读取，兜底与 tauri.conf.json 一致
  const [appVersion, setAppVersion] = useState("0.2.0");

  useEffect(() => {
    if (!isTauriEnvironment()) return;
    import("@tauri-apps/api/app")
      .then((m) => m.getVersion())
      .then((v) => {
        if (v) setAppVersion(v);
      })
      .catch(() => {});
  }, []);

  // 各 phase 对应的中文状态文案
  const statusText =
    phase === "checking"
      ? "检查中…"
      : phase === "up-to-date"
        ? "已是最新版本"
        : phase === "available"
          ? `发现新版本 v${version}`
          : phase === "downloading"
            ? `下载中 ${progress}%`
            : phase === "ready"
              ? "更新已就绪，待重启"
              : phase === "error"
                ? "出错"
                : "未检查";

  const btn: React.CSSProperties = {
    padding: "6px 14px",
    borderRadius: 8,
    fontSize: 13,
    cursor: "pointer",
    border: "1px solid var(--border)",
    background: "var(--bg-hover)",
    color: "var(--text-primary)",
    transition: "all 0.15s",
  };
  const primaryBtn: React.CSSProperties = {
    ...btn,
    border: "none",
    background: "var(--accent)",
    color: "var(--bg-primary)",
  };
  const hoverPrimary = (e: React.MouseEvent<HTMLButtonElement>) =>
    (e.currentTarget.style.background = "var(--accent-hover)");
  const leavePrimary = (e: React.MouseEvent<HTMLButtonElement>) =>
    (e.currentTarget.style.background = "var(--accent)");

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <SettingRow label="当前版本">
        <span style={{ fontSize: 13, color: "var(--text-secondary)" }}>v{appVersion}</span>
      </SettingRow>
      <SettingRow label="更新状态">
        <span style={{ fontSize: 13, color: "var(--text-secondary)" }}>{statusText}</span>
      </SettingRow>
      {phase === "error" && error && (
        <div style={{ fontSize: 12, color: "var(--error, #ff3b30)", wordBreak: "break-all" }}>
          {error}
        </div>
      )}
      <SettingRow label="操作">
        <div style={{ display: "flex", gap: 8 }}>
          {phase === "available" && (
            <>
              <button
                onClick={() => void downloadAndInstall()}
                style={primaryBtn}
                onMouseEnter={hoverPrimary}
                onMouseLeave={leavePrimary}
              >
                立即更新
              </button>
              <button onClick={ignoreCurrentVersion} style={btn} title="这个版本不再提示">
                忽略此版本
              </button>
            </>
          )}
          {phase === "ready" && (
            <button
              onClick={() => void restartToUpdate()}
              style={primaryBtn}
              onMouseEnter={hoverPrimary}
              onMouseLeave={leavePrimary}
            >
              重启并更新
            </button>
          )}
          <button
            disabled={phase === "checking" || phase === "downloading"}
            onClick={() => void checkNow()}
            style={{
              ...btn,
              opacity: phase === "checking" || phase === "downloading" ? 0.5 : 1,
              cursor: phase === "checking" || phase === "downloading" ? "not-allowed" : "pointer",
            }}
          >
            {phase === "checking" ? "检查中…" : "检查更新"}
          </button>
        </div>
      </SettingRow>
      <div style={{ fontSize: 12, color: "var(--text-secondary)", opacity: 0.7 }}>
        启动后与每小时会自动静默检查更新（失败不打扰）。
      </div>
      <div style={{ marginTop: "auto", paddingTop: 12, fontSize: 12, color: "var(--text-secondary)" }}>
        © 2026 圣手编辑器
      </div>
    </div>
  );
}
