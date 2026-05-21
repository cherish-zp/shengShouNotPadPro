import React, { useState } from "react";
import { Download, Trash2, ToggleLeft, ToggleRight } from "lucide-react";
import { usePluginStore } from "@/store/pluginStore";

export default function PluginPanel() {
  const { installed, available, install, uninstall, toggle } = usePluginStore();

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <div style={{ padding: "8px 12px", borderBottom: "1px solid var(--border)" }}>
        <span style={{ fontSize: 12, fontWeight: 600, color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
          插件
        </span>
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: 8 }}>
        {installed.length > 0 && (
          <div style={{ marginBottom: 12 }}>
            <span style={{ fontSize: 11, color: "var(--text-secondary)", padding: "4px 8px", display: "block", textTransform: "uppercase" }}>已安装</span>
            {installed.map((plugin) => (
              <div key={plugin.id} style={{
                display: "flex", alignItems: "center", gap: 8,
                padding: "8px", borderRadius: 8, marginBottom: 4,
                background: "var(--bg-surface)",
              }}>
                <span style={{ fontSize: 20 }}>{plugin.icon || "🧩"}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, color: "var(--text-primary)" }}>{plugin.name}</div>
                  <div style={{ fontSize: 11, color: "var(--text-secondary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{plugin.description}</div>
                </div>
                <button onClick={() => toggle(plugin.id)} title={plugin.enabled ? "已启用，点击禁用" : "已禁用，点击启用"}
                  style={{ padding: 4, color: plugin.enabled ? "var(--success)" : "var(--text-secondary)", cursor: "pointer" }}>
                  {plugin.enabled ? <ToggleRight size={20} /> : <ToggleLeft size={20} />}
                </button>
                <button onClick={() => uninstall(plugin.id)} title="卸载" style={{ padding: 4, color: "var(--text-secondary)", cursor: "pointer" }}>
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
        )}

        <div>
          <span style={{ fontSize: 11, color: "var(--text-secondary)", padding: "4px 8px", display: "block", textTransform: "uppercase" }}>可用插件</span>
          {available.map((plugin) => (
            <div key={plugin.id} style={{
              display: "flex", alignItems: "center", gap: 8,
              padding: "8px", borderRadius: 8, marginBottom: 4,
              background: "var(--bg-surface)",
            }}>
              <span style={{ fontSize: 20 }}>{plugin.icon || "🧩"}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, color: "var(--text-primary)" }}>{plugin.name}</div>
                <div style={{ fontSize: 11, color: "var(--text-secondary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{plugin.description}</div>
                <div style={{ fontSize: 10, color: "var(--text-secondary)", opacity: 0.6 }}>{plugin.author} · v{plugin.version}</div>
              </div>
              <button
                onClick={() => install(plugin)}
                style={{
                  display: "flex", alignItems: "center", gap: 4,
                  padding: "4px 10px", borderRadius: 6, fontSize: 11,
                  background: "var(--accent)", color: "var(--bg-primary)", cursor: "pointer",
                }}
              >
                <Download size={12} /> 安装
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
