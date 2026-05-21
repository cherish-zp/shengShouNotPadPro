import type { EncodingInfo } from "@/types";

export const ENCODING_LIST: EncodingInfo[] = [
  { name: "UTF-8", label: "UTF-8", description: "统一码 (UTF-8)" },
  { name: "UTF-16LE", label: "UTF-16 LE", description: "统一码 (UTF-16 小端)" },
  { name: "UTF-16BE", label: "UTF-16 BE", description: "统一码 (UTF-16 大端)" },
  { name: "GBK", label: "GBK", description: "中文简体 (GBK/GB2312)" },
  { name: "GB18030", label: "GB18030", description: "中文 (GB18030)" },
  { name: "Shift_JIS", label: "Shift JIS", description: "日文 (Shift JIS)" },
  { name: "EUC-KR", label: "EUC-KR", description: "韩文 (EUC-KR)" },
  { name: "Big5", label: "Big5", description: "繁体中文 (Big5)" },
  { name: "Latin-1", label: "Latin-1", description: "西欧 (ISO-8859-1)" },
  { name: "Windows-1252", label: "Windows-1252", description: "西欧 (Windows)" },
  { name: "ASCII", label: "ASCII", description: "美式 ASCII" },
];

export function getEncodingLabel(name: string): string {
  const enc = ENCODING_LIST.find((e) => e.name === name);
  return enc ? enc.label : name;
}

export const LANGUAGE_LIST = [
  { id: "plaintext", name: "纯文本" },
  { id: "javascript", name: "JavaScript" },
  { id: "typescript", name: "TypeScript" },
  { id: "python", name: "Python" },
  { id: "rust", name: "Rust" },
  { id: "go", name: "Go" },
  { id: "java", name: "Java" },
  { id: "cpp", name: "C/C++" },
  { id: "html", name: "HTML" },
  { id: "css", name: "CSS" },
  { id: "json", name: "JSON" },
  { id: "yaml", name: "YAML" },
  { id: "xml", name: "XML" },
  { id: "sql", name: "SQL" },
  { id: "markdown", name: "Markdown" },
  { id: "shell", name: "Shell 脚本" },
  { id: "swift", name: "Swift" },
];

export function detectLanguageFromExtension(ext: string): string {
  const map: Record<string, string> = {
    js: "javascript", jsx: "javascript", mjs: "javascript",
    ts: "typescript", tsx: "typescript",
    py: "python",
    rs: "rust",
    go: "go",
    java: "java",
    c: "cpp", cpp: "cpp", cc: "cpp", h: "cpp", hpp: "cpp",
    html: "html", htm: "html",
    css: "css", scss: "css", less: "css",
    json: "json",
    yaml: "yaml", yml: "yaml",
    xml: "xml",
    sql: "sql",
    md: "markdown", markdown: "markdown",
    sh: "shell", bash: "shell", zsh: "shell",
    swift: "swift",
  };
  return map[ext.toLowerCase()] || "plaintext";
}
