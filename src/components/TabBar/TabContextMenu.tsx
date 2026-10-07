import React from "react";
import ContextMenu, { type ContextMenuItem } from "@/components/Common/ContextMenu";
import { TAB_COLORS, type TabColor } from "@/types";
import { Pencil, Copy, FolderOpen, X, Pin, PinOff, Save } from "lucide-react";

interface TabContextMenuProps {
  x: number;
  y: number;
  tabId: string;
  hasFilePath: boolean;
  pinned: boolean;
  onClose: () => void;
  onRename: () => void;
  onTogglePin: () => void;
  onSetColor: (color: TabColor | undefined) => void;
  onCloseTab: () => void;
  onCloseOthers: () => void;
  onCloseAll: () => void;
  onCopyPath: () => void;
  onReveal: () => void;
  onSave: () => void;
}

export default function TabContextMenu({
  x, y, tabId, hasFilePath, pinned, onClose, onRename, onTogglePin, onSetColor, onCloseTab, onCloseOthers, onCloseAll, onCopyPath, onReveal, onSave,
}: TabContextMenuProps) {
  const items: ContextMenuItem[] = [
    { label: "重命名", icon: <Pencil size={14} />, shortcut: "双击", action: onRename },
    { label: "保存", icon: <Save size={14} />, shortcut: "⌘S", action: onSave },
    { label: "", action: () => {}, divider: true },
    ...([
      { color: "#f38ba8" as TabColor, name: "🔴 红色" },
      { color: "#fab387" as TabColor, name: "🟠 橙色" },
      { color: "#f9e2af" as TabColor, name: "🟡 黄色" },
      { color: "#a6e3a1" as TabColor, name: "🟢 绿色" },
      { color: "#89dceb" as TabColor, name: "🔵 青色" },
      { color: "#89b4fa" as TabColor, name: "💙 蓝色" },
      { color: "#cba6f7" as TabColor, name: "🟣 紫色" },
      { color: "#f5c2e7" as TabColor, name: "🩷 粉色" },
    ].map(({ color, name }) => ({
      label: name,
      action: () => onSetColor(color),
    }))),
    { label: "取消颜色", action: () => onSetColor(undefined) },
    { label: "", action: () => {}, divider: true },
  ];

  // 只在有文件路径时显示这些选项
  if (hasFilePath) {
    items.push(
      { label: "复制路径", icon: <Copy size={14} />, action: onCopyPath },
      { label: "在 Finder 中显示", icon: <FolderOpen size={14} />, action: onReveal },
      { label: "", action: () => {}, divider: true },
    );
  }

  items.push(
    { label: pinned ? "取消置顶" : "置顶", icon: pinned ? <PinOff size={14} /> : <Pin size={14} />, action: onTogglePin },
    { label: "", action: () => {}, divider: true },
    { label: "关闭", icon: <X size={14} />, shortcut: "⌘W", action: onCloseTab },
    { label: "关闭其他", action: onCloseOthers },
    { label: "关闭所有", action: onCloseAll },
  );

  return <ContextMenu x={x} y={y} items={items} onClose={onClose} />;
}
