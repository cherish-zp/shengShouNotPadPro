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
  available: [
    { id: "vim-mode", name: "Vim 模式", description: "在编辑器中使用 Vim 快捷键操作", author: "NovaEdit", version: "1.0.0", enabled: false, installed: false, icon: "⌨️" },
    { id: "emmet", name: "Emmet", description: "HTML/CSS 快速编写缩写扩展", author: "NovaEdit", version: "1.0.0", enabled: false, installed: false, icon: "⚡" },
    { id: "prettier", name: "Prettier", description: "代码自动格式化工具", author: "NovaEdit", version: "1.0.0", enabled: false, installed: false, icon: "✨" },
    { id: "color-picker", name: "颜色拾取器", description: "在代码中预览和选择颜色", author: "NovaEdit", version: "1.0.0", enabled: false, installed: false, icon: "🎨" },
    { id: "markdown-preview", name: "Markdown 预览", description: "实时预览 Markdown 文件", author: "NovaEdit", version: "1.0.0", enabled: false, installed: false, icon: "📝" },
    { id: "image-preview", name: "图片预览", description: "在编辑器中预览图片文件", author: "NovaEdit", version: "1.0.0", enabled: false, installed: false, icon: "🖼️" },
    { id: "word-count", name: "字数统计", description: "实时统计字符、单词、行数", author: "NovaEdit", version: "1.0.0", enabled: false, installed: false, icon: "📊" },
    { id: "git-lens", name: "Git 透视", description: "查看每行代码的 Git 提交信息", author: "NovaEdit", version: "1.0.0", enabled: false, installed: false, icon: "🔍" },
  ],

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
