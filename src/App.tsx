import React, { useEffect } from "react";
import MainLayout from "@/components/Layout/MainLayout";
import { useKeyboard } from "@/hooks/useKeyboard";
import { useAutoSave } from "@/hooks/useAutoSave";
import { useSettingsStore } from "@/store/settingsStore";
import { useTabStore } from "@/store/tabStore";

export default function App() {
  const loadSettings = useSettingsStore((s) => s.loadSettings);
  const theme = useSettingsStore((s) => s.theme);
  const hydrate = useTabStore((s) => s.hydrate);

  useEffect(() => {
    // 加载设置和便签数据
    loadSettings();
    hydrate(); // 恢复上次的便签
  }, []);

  // Apply theme: 默认 :root 是浅色，dark / system(dark) 才加 .dark
  useEffect(() => {
    const root = document.documentElement;

    const setDark = (isDark: boolean) => {
      root.classList.remove("dark");
      if (isDark) root.classList.add("dark");
    };

    if (theme === "dark") {
      setDark(true);
      return;
    }
    if (theme === "light") {
      setDark(false);
      return;
    }

    // theme === "system"：使用 matchMedia + Tauri 窗口 API 双保险
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const applyFromMq = () => setDark(mq.matches);
    applyFromMq();
    mq.addEventListener("change", applyFromMq);

    let unlisten: (() => void) | undefined;
    (async () => {
      try {
        const { getCurrentWindow } = await import("@tauri-apps/api/window");
        const win = getCurrentWindow();
        // 启动时直接读一次系统主题
        const current = await win.theme();
        if (current) setDark(current === "dark");
        // 监听 Tauri 抛出的系统主题变化
        const off = await win.onThemeChanged(({ payload }) => {
          setDark(payload === "dark");
        });
        unlisten = off;
      } catch {
        // 非 Tauri 环境，依赖 matchMedia 即可
      }
    })();

    return () => {
      mq.removeEventListener("change", applyFromMq);
      if (unlisten) unlisten();
    };
  }, [theme]);

  useKeyboard();
  useAutoSave();

  return <MainLayout />;
}
