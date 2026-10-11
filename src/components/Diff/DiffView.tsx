/**
 * DiffView 对外出口：React.lazy 按需加载本体（DiffViewImpl），
 * 仅在 diff 模式打开时才拉取 diff 库与本组件，减小首屏主 chunk。
 * MainLayout 保持静态 import 本文件即可，无需感知拆分。
 */
import { Suspense, lazy } from "react";

const DiffViewImpl = lazy(() => import("./DiffViewImpl"));

export default function DiffView() {
  return (
    <Suspense fallback={<div style={{ flex: 1, background: "var(--bg-primary)" }} />}>
      <DiffViewImpl />
    </Suspense>
  );
}
