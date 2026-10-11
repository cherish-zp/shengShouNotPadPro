import React from "react";

interface BackgroundLayerProps {
  /** 已由 backgroundToCssUrl 转换好的图片 URL（绝对路径 → asset url；空字符串表示无背景图） */
  url: string;
  /** 遮罩强度 0-1，压暗图片保证前景文字可读 */
  dim: number;
  /** 图片模糊半径 0-30px */
  blur: number;
}

/**
 * 编辑器图片背景层 — fixed 全屏，位于所有内容之下（zIndex: -1）。
 * 三层结构：
 * 1. 底色层：var(--bg-primary)，防止 html/body 全透明时露出白色 canvas
 * 2. 图片层：cover + center，可选 blur（blur > 0 时 scale(1.06) 藏住模糊边缘）
 * 3. 遮罩层：rgba(0,0,0,dim) 全屏压暗
 */
export default function BackgroundLayer({ url, dim, blur }: BackgroundLayerProps) {
  if (!url) return null;

  const hasBlur = blur > 0;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: -1,
        pointerEvents: "none",
        overflow: "hidden",
        background: "var(--bg-primary)",
      }}
    >
      {/* 图片层 */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          backgroundImage: `url("${url}")`,
          backgroundSize: "cover",
          backgroundPosition: "center",
          filter: `blur(${blur}px)`,
          transform: hasBlur ? "scale(1.06)" : undefined,
        }}
      />
      {/* 遮罩层 */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: `rgba(0, 0, 0, ${dim})`,
        }}
      />
    </div>
  );
}
