export interface Tab {
  id: string;
  name: string;
  kind?: "file";
  filePath?: string;
  content: string;
  language: string;
  encoding: string;
  lineEnding: "LF" | "CRLF";
  indentSize: number;
  indentType: "spaces" | "tab";
  dirty: boolean;
  color?: string;
  /** 置顶：钉在列表置顶区（数组前段），pinnedAt 用于区内排序（最近置顶在最上） */
  pinned?: boolean;
  pinnedAt?: number;
  createdAt: number;
}

export type TabColor =
  | "#f38ba8"
  | "#fab387"
  | "#f9e2af"
  | "#a6e3a1"
  | "#89dceb"
  | "#89b4fa"
  | "#cba6f7"
  | "#f5c2e7";

export const TAB_COLORS: TabColor[] = [
  "#f38ba8",
  "#fab387",
  "#f9e2af",
  "#a6e3a1",
  "#89dceb",
  "#89b4fa",
  "#cba6f7",
  "#f5c2e7",
];

export interface FileTreeNode {
  name: string;
  path: string;
  isDir: boolean;
  children?: FileTreeNode[];
  expanded?: boolean;
  gitStatus?: string;
}

export interface SearchMatch {
  line: number;
  col: number;
  text: string;
  length: number;
}

export interface FileSearchResult {
  filePath: string;
  fileName: string;
  matches: SearchMatch[];
}

export interface EncodingInfo {
  name: string;
  label: string;
  description: string;
}

export interface Plugin {
  id: string;
  name: string;
  description: string;
  author: string;
  version: string;
  enabled: boolean;
  installed: boolean;
  icon?: string;
}

export interface Command {
  id: string;
  label: string;
  shortcut?: string;
  action: () => void;
  category: string;
  icon?: string;
}

export type SkinId = "default" | "pink";

export interface AppSettings {
  theme: "dark" | "light" | "system";
  skin: SkinId;
  backgroundImage: string;
  backgroundDim: number;
  backgroundBlur: number;
  fontSize: number;
  fontFamily: string;
  lineHeight: number;
  tabSize: number;
  wordWrap: boolean;
  autoSave: boolean;
  autoSaveInterval: number;
  showLineNumbers: boolean;
  accentColor: string;
  sidebarWidth: number;
  windowOpacity: number;
}
