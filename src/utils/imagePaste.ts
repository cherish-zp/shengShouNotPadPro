/**
 * 贴图功能的纯逻辑模块（设计文档：docs/superpowers/specs/2026-08-29-image-paste-design.md）。
 * 不依赖 Tauri / DOM，全部可单测；Tauri 调用 glue 在 imageBridge.ts / imagePasteFlow.ts。
 */

const IMAGE_MIME_EXT: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/jpg": "jpg",
  "image/gif": "gif",
  "image/webp": "webp",
  "image/svg+xml": "svg",
};

const IMAGE_EXT_SET = new Set(["png", "jpg", "jpeg", "gif", "webp", "svg"]);

/** MIME → 扩展名；非图片 MIME 返回 null */
export function imageExtFromMime(mime: string): string | null {
  return IMAGE_MIME_EXT[mime.toLowerCase()] ?? null;
}

/** 扩展名 → MIME；非图片扩展名返回 null */
export function imageMimeFromExt(ext: string): string | null {
  const e = ext.toLowerCase();
  if (e === "png") return "image/png";
  if (e === "jpg" || e === "jpeg") return "image/jpeg";
  if (e === "gif") return "image/gif";
  if (e === "webp") return "image/webp";
  if (e === "svg") return "image/svg+xml";
  return null;
}

/** 生成图片文件名：img-YYYYMMDD-HHmmss-<rand>.<ext>，纯 ASCII，无需 URL 编码 */
export function generateImageFileName(mime: string, now: Date, rand: string): string {
  const ext = imageExtFromMime(mime);
  if (!ext) throw new Error(`unsupported image mime: ${mime}`);
  const pad = (n: number) => String(n).padStart(2, "0");
  const y = now.getFullYear();
  const stamp = `${y}${pad(now.getMonth() + 1)}${pad(now.getDate())}-${pad(now.getHours())}${pad(
    now.getMinutes()
  )}${pad(now.getSeconds())}`;
  return `img-${stamp}-${rand}.${ext}`;
}

/** 生成 6 位小写字母数字随机段（文件名去重用） */
export function randomLinkId(len = 6): string {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  let out = "";
  for (let i = 0; i < len; i++) {
    out += chars[Math.floor(Math.random() * chars.length)];
  }
  return out;
}

const BASE64_CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";

/** Uint8Array → base64（不依赖 btoa/atob，Node 与 WebView 行为一致） */
export function bytesToBase64(bytes: Uint8Array): string {
  let out = "";
  for (let i = 0; i < bytes.length; i += 3) {
    const b0 = bytes[i];
    const b1 = bytes[i + 1];
    const b2 = bytes[i + 2];
    out += BASE64_CHARS[b0 >> 2];
    out += BASE64_CHARS[((b0 & 3) << 4) | ((b1 ?? 0) >> 4)];
    out += b1 === undefined ? "=" : BASE64_CHARS[((b1 & 15) << 2) | ((b2 ?? 0) >> 6)];
    out += b2 === undefined ? "=" : BASE64_CHARS[b2 & 63];
  }
  return out;
}

/**
 * 计算在 pos 处插入图片链接时应插入的文本：
 * 图片独占一行；与前文之间无空行时补一个空行；末尾换行方便继续输入。
 */
export function buildImageSnippet(doc: string, pos: number, link: string): string {
  const atStart = pos === 0;
  const prevChar = pos > 0 ? doc[pos - 1] : "";
  const atLineStart = atStart || prevChar === "\n";

  let leading = "";
  if (!atStart) {
    if (!atLineStart) {
      leading = "\n\n";
    } else {
      // 光标在行首：看上一行是否为空行
      const before = doc.slice(0, pos - 1);
      const lastLineEnd = before.lastIndexOf("\n");
      const prevLine = before.slice(lastLineEnd + 1);
      if (prevLine.trim() !== "") leading = "\n\n";
    }
  }
  return `${leading}![image](${link})\n`;
}

/** 取目录部分；纯文件名返回 ""，根目录返回 "/" */
export function dirname(p: string): string {
  const idx = p.lastIndexOf("/");
  if (idx === -1) return "";
  if (idx === 0) return "/";
  return p.slice(0, idx);
}

/** 路径拼接并清理多余/末尾斜杠 */
export function joinPath(...parts: string[]): string {
  const joined = parts.filter((p) => p !== "").join("/");
  return normalizeImagePath(joined);
}

/** 折叠多余斜杠，解析 ./ 与 ../（越界的 .. 保留/截断到根） */
export function normalizeImagePath(p: string): string {
  const isAbs = p.startsWith("/");
  const out: string[] = [];
  for (const seg of p.split("/")) {
    if (seg === "" || seg === ".") continue;
    if (seg === "..") {
      if (out.length > 0 && out[out.length - 1] !== "..") {
        out.pop();
      } else if (!isAbs) {
        out.push("..");
      }
    } else {
      out.push(seg);
    }
  }
  return (isAbs ? "/" : "") + out.join("/");
}

/**
 * 图片路径 → Markdown 链接安全形式：百分号编码空格/括号/百分号，
 * 保证链接内不含空白（Markdown 行内链接遇空格会截断）。
 */
export function encodeImagePathForMarkdown(p: string): string {
  return p
    .replace(/%/g, "%25")
    .replace(/ /g, "%20")
    .replace(/\(/g, "%28")
    .replace(/\)/g, "%29");
}

/** 链接路径 → 文件系统真实路径；非法百分号序列原样返回 */
export function decodeImagePath(p: string): string {
  try {
    return decodeURIComponent(p);
  } catch {
    return p;
  }
}

const EXTERNAL_SRC_RE = /^(https?:|data:|blob:|asset:)/i;

/**
 * 预览图片 src 解析：返回需要转成 asset URL 的本地绝对路径；
 * 外链/无需处理时返回 null。
 */
export function resolveImagePath(src: string, baseDir: string | null): string | null {
  if (!src) return null;
  if (EXTERNAL_SRC_RE.test(src)) return null;
  if (src.startsWith("/")) return decodeImagePath(normalizeImagePath(src));
  if (!baseDir) return null;
  return decodeImagePath(normalizeImagePath(joinPath(baseDir, src)));
}

export interface StagingMove {
  /** 暂存文件绝对路径（即文档里的链接原文） */
  from: string;
  /** 迁移目标：<文档目录>/assets/<文件名> */
  to: string;
  link: string;
  /** 替换后的相对链接 */
  newLink: string;
}

const MD_IMAGE_RE = /!\[[^\]]*\]\(([^)\s]+)\)/g;

/** 扫描文档中指向暂存目录的图片链接，生成迁移计划（同一链接只生成一次） */
export function extractStagingImageMoves(
  content: string,
  stagingRoot: string,
  assetsDir: string
): StagingMove[] {
  const root = stagingRoot.endsWith("/") ? stagingRoot.slice(0, -1) : stagingRoot;
  const moves: StagingMove[] = [];
  const seen = new Set<string>();
  let m: RegExpExecArray | null;
  MD_IMAGE_RE.lastIndex = 0;
  while ((m = MD_IMAGE_RE.exec(content))) {
    const link = m[1];
    // 文档里的链接经过 %20 编码（见 encodeImagePathForMarkdown），比对/迁移前先解码
    const realPath = decodeImagePath(link);
    if (!realPath.startsWith(root + "/")) continue;
    if (seen.has(link)) continue;
    seen.add(link);
    const fileName = realPath.slice(realPath.lastIndexOf("/") + 1);
    moves.push({
      from: realPath,
      to: joinPath(assetsDir, fileName),
      link,
      newLink: `assets/${fileName}`,
    });
  }
  return moves;
}

/** 把文档中的暂存绝对路径替换为 assets 相对路径（仅替换成功迁移的项） */
export function rewriteStagingLinks(
  content: string,
  moved: Array<{ link: string; newLink: string }>
): string {
  let out = content;
  for (const { link, newLink } of moved) {
    out = out.split(link).join(newLink);
  }
  return out;
}

/** 预览 HTML 后处理：把 <img src> 中的本地路径经 toUrl 转成可加载的 asset URL */
export function resolvePreviewImages(
  html: string,
  baseDir: string | null,
  toUrl: (absPath: string) => string
): string {
  return html.replace(/(<img\b[^>]*?\bsrc=")([^"]*)(")/g, (match, pre, src, post) => {
    const abs = resolveImagePath(src, baseDir);
    return abs ? `${pre}${toUrl(abs)}${post}` : match;
  });
}

const IMAGE_EXTS = IMAGE_EXT_SET;

/** 判断文件名是否为图片文件（拖拽分流用） */
export function isImageFilePath(name: string): boolean {
  const idx = name.lastIndexOf(".");
  if (idx <= 0 || idx === name.length - 1) return false;
  return IMAGE_EXTS.has(name.slice(idx + 1).toLowerCase());
}

/** 仅 Markdown / 纯文本支持贴图 */
export function isPasteSupported(language: string): boolean {
  return language === "markdown" || language === "plaintext";
}

/** 编辑器内联渲染的图片 src 解析结果 */
export type ImageSrcResolution =
  | { kind: "external"; src: string }
  | { kind: "local"; path: string }
  | { kind: "missing" };

/**
 * 内联渲染用：把文档里的图片链接解析为可显示的 src。
 * external → 直接作为 <img src>；local → 本地绝对路径（调用方转 asset URL）；
 * missing → 相对链接且无基准目录，无法显示。
 */
export function resolveImageDisplaySrc(link: string, baseDir: string | null): ImageSrcResolution {
  const decoded = decodeImagePath(link);
  if (/^(https?:|data:|blob:)/i.test(decoded)) return { kind: "external", src: decoded };
  if (decoded.startsWith("/")) return { kind: "local", path: normalizeImagePath(decoded) };
  if (!baseDir) return { kind: "missing" };
  return { kind: "local", path: normalizeImagePath(joinPath(baseDir, decoded)) };
}

export interface ImageRange {
  from: number;
  to: number;
  alt: string;
  link: string;
}

const MD_IMAGE_SCAN_RE = /!\[([^\]]*)\]\(([^)\s]+)\)/g;

/** 在一行文本内定位 Markdown 图片语法，返回相对 lineStart 的绝对区间 */
export function findImageRanges(lineText: string, lineStart: number): ImageRange[] {
  const ranges: ImageRange[] = [];
  let m: RegExpExecArray | null;
  MD_IMAGE_SCAN_RE.lastIndex = 0;
  while ((m = MD_IMAGE_SCAN_RE.exec(lineText))) {
    ranges.push({
      from: lineStart + m.index,
      to: lineStart + m.index + m[0].length,
      alt: m[1],
      link: m[2],
    });
  }
  return ranges;
}

/** base64 → data URL（本地图片显示用，绕开 asset 协议） */
export function dataUrlFromBase64(base64: string, mime: string): string {
  return `data:${mime};base64,${base64}`;
}

/**
 * 内联图片的基准目录：文档所在目录；草稿（无路径）返回 null。
 * 注意必须传目录而不是文件路径，否则相对链接会拼进 .txt 文件里（ENOTDIR）。
 */
export function baseDirOfFilePath(filePath?: string | null): string | null {
  return filePath ? dirname(filePath) : null;
}

const IMG_SRC_RE = /<img\b[^>]*?\bsrc="([^"]*)"/g;

/** 从渲染后的 HTML 中收集需要加载的本地图片绝对路径（保持出现顺序、去重） */
export function collectLocalImagePaths(html: string, baseDir: string | null): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  let m: RegExpExecArray | null;
  IMG_SRC_RE.lastIndex = 0;
  while ((m = IMG_SRC_RE.exec(html))) {
    const abs = resolveImagePath(m[1], baseDir);
    if (abs && !seen.has(abs)) {
      seen.add(abs);
      out.push(abs);
    }
  }
  return out;
}
