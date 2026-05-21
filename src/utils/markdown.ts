/**
 * 轻量级 Markdown 渲染器（无外部依赖）。
 * 支持：标题、段落、加粗、斜体、删除线、行内代码、代码块（带语言标识）、
 * 链接、图片、无序/有序列表、任务列表、引用、表格、分割线、自动链接。
 * 所有 HTML 都会被转义，避免 XSS。
 */

const escapeHtml = (s: string): string =>
  s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

const escapeAttr = (s: string): string => escapeHtml(s);

// 行内元素解析（在已转义的文本上做替换）
function renderInline(text: string): string {
  let out = escapeHtml(text);

  // 行内代码 `code`
  out = out.replace(/`([^`\n]+?)`/g, (_, code) => `<code class="md-code-inline">${code}</code>`);

  // 图片 ![alt](src)
  out = out.replace(/!\[([^\]]*)\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g, (_, alt, src) => {
    return `<img alt="${escapeAttr(alt)}" src="${escapeAttr(src)}" class="md-img" />`;
  });

  // 链接 [text](url)
  out = out.replace(/\[([^\]]+)\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g, (_, txt, url) => {
    return `<a href="${escapeAttr(url)}" target="_blank" rel="noopener noreferrer">${txt}</a>`;
  });

  // 自动链接 <http://...>
  out = out.replace(/&lt;((https?:\/\/|mailto:)[^\s&]+)&gt;/g, (_, url) => {
    return `<a href="${escapeAttr(url)}" target="_blank" rel="noopener noreferrer">${url}</a>`;
  });

  // 加粗 **text** 或 __text__
  out = out.replace(/\*\*([^*\n]+?)\*\*/g, "<strong>$1</strong>");
  out = out.replace(/__([^_\n]+?)__/g, "<strong>$1</strong>");

  // 斜体 *text* 或 _text_
  out = out.replace(/(^|[^*])\*([^*\n]+?)\*(?!\*)/g, "$1<em>$2</em>");
  out = out.replace(/(^|[^_])_([^_\n]+?)_(?!_)/g, "$1<em>$2</em>");

  // 删除线 ~~text~~
  out = out.replace(/~~([^~\n]+?)~~/g, "<del>$1</del>");

  return out;
}

// 表格解析
function parseTable(lines: string[], startIdx: number): { html: string; nextIdx: number } | null {
  const header = lines[startIdx];
  const sep = lines[startIdx + 1];
  if (!header || !sep) return null;
  if (!/^\s*\|?(.+\|)+.*$/.test(header)) return null;
  if (!/^\s*\|?\s*:?-+:?\s*(\|\s*:?-+:?\s*)+\|?\s*$/.test(sep)) return null;

  const splitRow = (row: string) =>
    row
      .replace(/^\s*\|/, "")
      .replace(/\|\s*$/, "")
      .split("|")
      .map((c) => c.trim());

  const aligns = splitRow(sep).map((c) => {
    const l = c.startsWith(":");
    const r = c.endsWith(":");
    if (l && r) return "center";
    if (r) return "right";
    if (l) return "left";
    return "";
  });

  const headers = splitRow(header);
  const rows: string[][] = [];
  let i = startIdx + 2;
  while (i < lines.length && /^\s*\|?(.+\|)+.*$/.test(lines[i]) && lines[i].trim() !== "") {
    rows.push(splitRow(lines[i]));
    i++;
  }

  const thHtml = headers
    .map((h, idx) => {
      const a = aligns[idx];
      return `<th${a ? ` style="text-align:${a}"` : ""}>${renderInline(h)}</th>`;
    })
    .join("");

  const trHtml = rows
    .map(
      (r) =>
        `<tr>${r
          .map(
            (c, idx) =>
              `<td${aligns[idx] ? ` style="text-align:${aligns[idx]}"` : ""}>${renderInline(c)}</td>`
          )
          .join("")}</tr>`
    )
    .join("");

  return {
    html: `<table class="md-table"><thead><tr>${thHtml}</tr></thead><tbody>${trHtml}</tbody></table>`,
    nextIdx: i,
  };
}

export function renderMarkdown(src: string): string {
  // 规范化换行
  const text = src.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  const lines = text.split("\n");
  const out: string[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // 围栏代码块 ```lang
    const fence = line.match(/^\s*```(\S*)\s*$/);
    if (fence) {
      const lang = fence[1] || "";
      const codeLines: string[] = [];
      i++;
      while (i < lines.length && !/^\s*```\s*$/.test(lines[i])) {
        codeLines.push(lines[i]);
        i++;
      }
      i++; // 跳过收尾 ```
      const langClass = lang ? ` class="language-${escapeAttr(lang)}"` : "";
      out.push(
        `<pre class="md-pre"><code${langClass}>${escapeHtml(codeLines.join("\n"))}</code></pre>`
      );
      continue;
    }

    // 空行
    if (/^\s*$/.test(line)) {
      i++;
      continue;
    }

    // 标题 # 到 ######
    const heading = line.match(/^(#{1,6})\s+(.*?)\s*#*\s*$/);
    if (heading) {
      const level = heading[1].length;
      out.push(`<h${level} class="md-h${level}">${renderInline(heading[2])}</h${level}>`);
      i++;
      continue;
    }

    // 分割线
    if (/^\s*([-*_])\s*\1\s*\1[\s\-*_]*$/.test(line)) {
      out.push('<hr class="md-hr" />');
      i++;
      continue;
    }

    // 引用 >
    if (/^\s*>\s?/.test(line)) {
      const quoteLines: string[] = [];
      while (i < lines.length && /^\s*>\s?/.test(lines[i])) {
        quoteLines.push(lines[i].replace(/^\s*>\s?/, ""));
        i++;
      }
      out.push(`<blockquote class="md-quote">${renderMarkdown(quoteLines.join("\n"))}</blockquote>`);
      continue;
    }

    // 表格
    const tableResult = parseTable(lines, i);
    if (tableResult) {
      out.push(tableResult.html);
      i = tableResult.nextIdx;
      continue;
    }

    // 列表（无序、有序、任务）
    const ulMatch = line.match(/^(\s*)[-*+]\s+(.*)$/);
    const olMatch = line.match(/^(\s*)(\d+)\.\s+(.*)$/);
    if (ulMatch || olMatch) {
      const isOrdered = !!olMatch;
      const items: string[] = [];
      while (i < lines.length) {
        const cur = lines[i];
        const m = isOrdered
          ? cur.match(/^(\s*)(\d+)\.\s+(.*)$/)
          : cur.match(/^(\s*)[-*+]\s+(.*)$/);
        if (!m) break;
        let itemText = isOrdered ? m[3] : m[2];
        // 任务列表 [ ] / [x]
        const taskMatch = itemText.match(/^\[( |x|X)\]\s+(.*)$/);
        if (taskMatch) {
          const checked = taskMatch[1].toLowerCase() === "x";
          items.push(
            `<li class="md-task"><input type="checkbox" disabled${
              checked ? " checked" : ""
            }/> ${renderInline(taskMatch[2])}</li>`
          );
        } else {
          items.push(`<li>${renderInline(itemText)}</li>`);
        }
        i++;
      }
      out.push(
        isOrdered
          ? `<ol class="md-ol">${items.join("")}</ol>`
          : `<ul class="md-ul">${items.join("")}</ul>`
      );
      continue;
    }

    // 段落：把后续连续非空、非块级起始行合并为一个段落
    const paraLines: string[] = [line];
    i++;
    while (
      i < lines.length &&
      !/^\s*$/.test(lines[i]) &&
      !/^\s*```/.test(lines[i]) &&
      !/^(#{1,6})\s+/.test(lines[i]) &&
      !/^\s*>\s?/.test(lines[i]) &&
      !/^\s*[-*+]\s+/.test(lines[i]) &&
      !/^\s*\d+\.\s+/.test(lines[i]) &&
      !/^\s*([-*_])\s*\1\s*\1[\s\-*_]*$/.test(lines[i])
    ) {
      paraLines.push(lines[i]);
      i++;
    }
    out.push(`<p class="md-p">${renderInline(paraLines.join("\n"))}</p>`);
  }

  return out.join("\n");
}
