import React, { lazy, Suspense, useState, useRef, useEffect } from "react";
import { useEditorStore } from "@/store/editorStore";
import { useTabStore } from "@/store/tabStore";
import { useSettingsStore } from "@/store/settingsStore";
import { backgroundToCssUrl } from "@/utils/background";
import { SidebarRail, SidebarContent } from "./Sidebar";
import StatusBar from "./StatusBar";
import BackgroundLayer from "./BackgroundLayer";
import EditorContainer from "@/components/Editor/EditorContainer";
import EditorToolbar from "@/components/Editor/EditorToolbar";
import FindReplace from "@/components/Search/FindReplace";
import DiffView from "@/components/Diff/DiffView";
import CommandPalette from "@/components/CommandPalette/CommandPalette";
import QuickOpen from "@/components/Search/QuickOpen";
import GoToLine from "@/components/Search/GoToLine";
// SettingsPanel 较重（含关于/更新检查等），lazy 分包避免进主 chunk；
// 打开设置时才加载，加载期间由下方 Suspense fallback 显示占位卡片
const SettingsPanel = lazy(() => import("@/components/Settings/SettingsPanel"));

export default function MainLayout() {
  const sidebarVisible = useEditorStore((s) => s.sidebarVisible);
  const settingsOpen = useEditorStore((s) => s.settingsOpen);
  const commandPaletteOpen = useEditorStore((s) => s.commandPaletteOpen);
  const quickOpenOpen = useEditorStore((s) => s.quickOpenOpen);
  const goToLineOpen = useEditorStore((s) => s.goToLineOpen);
  const diffViewOpen = useEditorStore((s) => s.diffViewOpen);
  const activeTabId = useTabStore((s) => s.activeTabId);
  const skin = useSettingsStore((s) => s.skin);
  const backgroundImage = useSettingsStore((s) => s.backgroundImage);
  const backgroundDim = useSettingsStore((s) => s.backgroundDim);
  const backgroundBlur = useSettingsStore((s) => s.backgroundBlur);
  const hasImage = !!backgroundImage;
  const [panelWidth, setPanelWidth] = useState(300);
  const [isResizing, setIsResizing] = useState(false);
  // 拖拽侧边栏：mousemove 高频触发，用 rAF 节流为每帧最多一次 setState
  const resizeRafRef = useRef<number | null>(null);
  const pendingWidthRef = useRef<number | null>(null);

  // 卸载时取消未执行的 rAF，避免对已卸载组件 setState
  useEffect(() => {
    return () => {
      if (resizeRafRef.current !== null) cancelAnimationFrame(resizeRafRef.current);
    };
  }, []);

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
    const startX = e.clientX;
    const startWidth = panelWidth;

    const onMouseMove = (e: MouseEvent) => {
      const diff = e.clientX - startX;
      pendingWidthRef.current = Math.max(220, Math.min(600, startWidth + diff));
      if (resizeRafRef.current === null) {
        resizeRafRef.current = requestAnimationFrame(() => {
          resizeRafRef.current = null;
          if (pendingWidthRef.current !== null) {
            setPanelWidth(pendingWidthRef.current);
            pendingWidthRef.current = null;
          }
        });
      }
    };

    const onMouseUp = () => {
      // 松手时把最后一帧之后累积的宽度落掉，避免停在中间值
      if (resizeRafRef.current !== null) {
        cancelAnimationFrame(resizeRafRef.current);
        resizeRafRef.current = null;
      }
      if (pendingWidthRef.current !== null) {
        setPanelWidth(pendingWidthRef.current);
        pendingWidthRef.current = null;
      }
      setIsResizing(false);
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseup", onMouseUp);
    };

    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseup", onMouseUp);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", width: "100vw", height: "100vh", overflow: "hidden", background: hasImage ? "transparent" : skin === "pink" ? "linear-gradient(168deg, #FFF7FA 0%, #FFE9F2 55%, #FFDFEA 100%)" : "var(--bg-primary)" }}>
      {/* 图片背景层：fixed 全屏，位于内容之下，仅设置了背景图时渲染 */}
      {hasImage && (
        <BackgroundLayer url={backgroundToCssUrl(backgroundImage)} dim={backgroundDim} blur={backgroundBlur} />
      )}
      <div style={{ display: "flex", flex: 1, overflow: "hidden", position: "relative" }}>
        {/* 固定左侧图标栏：始终可见 */}
        <SidebarRail />

        {/* 侧边栏内容面板：可折叠（⌘B） */}
        {sidebarVisible && (
          <div
            style={{
              width: panelWidth, flexShrink: 0,
              display: "flex", overflow: "hidden",
              animation: "slideInLeft 250ms cubic-bezier(0.4, 0, 0.2, 1)",
            }}
          >
            <SidebarContent />
          </div>
        )}

        {/* Resize handle */}
        {sidebarVisible && (
          <div
            onMouseDown={handleMouseDown}
            style={{
              width: 4, cursor: "col-resize", flexShrink: 0,
              background: isResizing ? "var(--accent)" : "transparent",
              transition: isResizing ? "none" : "background 0.2s ease",
              borderRadius: 2,
              zIndex: 20,
            }}
            onMouseEnter={(e) => { if (!isResizing) e.currentTarget.style.background = "var(--border-strong)"; }}
            onMouseLeave={(e) => { if (!isResizing) e.currentTarget.style.background = "transparent"; }}
          />
        )}

        {/* Main area */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", minWidth: 0 }}>
          {/* Search bar overlay */}
          <FindReplace />

          {/* 顶部工具栏 */}
          <EditorToolbar tabId={activeTabId ?? undefined} />

          {/* 主体：编辑器 / Diff */}
          {diffViewOpen ? <DiffView /> : <EditorContainer />}
        </div>
      </div>

      {/* Status bar */}
      <StatusBar />

      {/* Modals */}
      {commandPaletteOpen && <CommandPalette />}
      {quickOpenOpen && <QuickOpen />}
      {goToLineOpen && <GoToLine />}
      {settingsOpen && (
        <Suspense
          fallback={
            // 占位卡片：对齐 SettingsPanel 弹窗的位置与尺寸，只用主题变量随主题走；
            // 不放遮罩层，避免与真实面板自带的 Modal 遮罩叠加闪屏
            <div style={{ position: "fixed", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <div style={{ width: 640, height: 480, background: "var(--bg-surface)", borderRadius: 16 }} />
            </div>
          }
        >
          <SettingsPanel />
        </Suspense>
      )}
    </div>
  );
}
