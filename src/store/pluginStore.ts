import { create } from "zustand";
import type { Plugin } from "@/types";

interface PluginStore {
  installed: Plugin[];
  available: Plugin[];
  install: (plugin: Plugin) => void;
  uninstall: (id: string) => void;
  toggle: (id: string) => void;
}

export const usePluginStore = create<PluginStore>((set) => ({
  installed: [],
  // 插件系统目前仅为骨架：无任何内置/可安装插件。
  // 之前的 8 个硬编码假插件（author "NovaEdit"、无实际实现）已删除，
  // 避免向用户展示不存在的功能；未来接入真实插件机制时再填充。
  available: [],

  install: (plugin) =>
    set((state) => ({
      installed: [...state.installed, { ...plugin, installed: true }],
      available: state.available.filter((p) => p.id !== plugin.id),
    })),

  uninstall: (id) =>
    set((state) => {
      const plugin = state.installed.find((p) => p.id === id);
      if (!plugin) return state;
      return {
        installed: state.installed.filter((p) => p.id !== id),
        available: [...state.available, { ...plugin, installed: false, enabled: false }],
      };
    }),

  toggle: (id) =>
    set((state) => ({
      installed: state.installed.map((p) =>
        p.id === id ? { ...p, enabled: !p.enabled } : p
      ),
    })),
}));
