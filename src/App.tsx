import React, { useEffect } from "react";
import MainLayout from "@/components/Layout/MainLayout";
import { useKeyboard } from "@/hooks/useKeyboard";
import { useAutoSave } from "@/hooks/useAutoSave";
import { useSettingsStore } from "@/store/settingsStore";
import { useTabStore } from "@/store/tabStore";
import { useEditorStore } from "@/store/editorStore";
import { detectLanguageFromExtension } from "@/utils/encoding";
import { classifyFileExtension } from "@/utils/quarantine";

export default function App() {
  const loadSettings = useSettingsStore((s) => s.loadSettings);
  const theme = useSettingsStore((s) => s.theme);
  const hydrate = useTabStore((s) => s.hydrate);
  const addTab = useTabStore((s) => s.addTab);
  const setOpenFolder = useEditorStore((s) => s.setOpenFolder);
  const openSidebarView = useEditorStore((s) => s.openSidebarView);

  useEffect(() => {
    // 加载设置和便签数据
    loadSettings();
    hydrate(); // 恢复上次的便签
  }, []);

  // 监听从 Finder / 右键打开方式 启动应用时传入的文件
  useEffect(() => {
    let unlistenFiles: (() => void) | undefined;
    let unlistenFolders: (() => void) | undefined;
    let cancelled = false;

    (async () => {
      try {
        const { listen } = await import("@tauri-apps/api/event");
        const { invoke } = await import("@tauri-apps/api/core");

        const offFiles = await listen<string[]>("opened-files", async (event) => {
          if (cancelled) return;
          const paths = event.payload;
          for (const path of paths) {
            const name = path.split(/[\\/]/).pop() || path;
            const ext = name.includes(".") ? name.split(".").pop() ?? "" : "";
            const language = detectLanguageFromExtension(ext);
            const safety = classifyFileExtension(name);
            try {
              // 清除隔离属性（虽然应用启动时已清一次，但文件可能是新的）
              if (safety !== "caution") {
                invoke("remove_quarantine", { path, recursive: false }).catch(() => {});
              }
              const result = await invoke<{ content: string; encoding: string }>(
                "read_file",
                { path, encoding: "UTF-8" }
              );
              addTab({
                name,
                filePath: path,
                content: result.content,
                encoding: result.encoding,
                language,
              });
            } catch {
              addTab({ name, filePath: path, content: "", language });
            }
          }
        });
        unlistenFiles = offFiles;

        const offFolders = await listen<string[]>("opened-folders", async (event) => {
          if (cancelled) return;
          const paths = event.payload;
          if (paths.length > 0) {
            setOpenFolder(paths[0]);
            openSidebarView("files");
          }
        });
        unlistenFolders = offFolders;
      } catch {
        // 非 Tauri 环境，忽略
      }
    })();

    return () => {
      cancelled = true;
      if (unlistenFiles) unlistenFiles();
      if (unlistenFolders) unlistenFolders();
    };
  }, [addTab, setOpenFolder, openSidebarView]);

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
