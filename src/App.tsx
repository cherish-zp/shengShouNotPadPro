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

  // Apply theme: 默认 :root 是冷白，只有 dark 需要加 class
  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove("dark");
    if (theme === "dark") {
      root.classList.add("dark");
    }
  }, [theme]);

  useKeyboard();
  useAutoSave();

  return <MainLayout />;
}
