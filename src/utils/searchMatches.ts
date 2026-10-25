// 查找匹配的纯函数实现：从 FindReplace 组件抽出，供面板计数与
// CodeMirror 装饰高亮共用（同一份结果，两处消费）。

export interface SearchMatch {
  /** 文档内绝对起始位置 */
  from: number;
  /** 文档内绝对结束位置 */
  to: number;
  /** 行号（从 1 起） */
  line: number;
  /** 列号（从 1 起） */
  col: number;
}

export interface SearchOptions {
  caseSensitive?: boolean;
  useRegex?: boolean;
}

/** 在 content 中找出 query 的全部匹配（含行/列）；非法正则返回空数组 */
export function computeMatches(
  content: string,
  query: string,
  opts: SearchOptions = {}
): SearchMatch[] {
  if (!query) return [];
  const { caseSensitive = false, useRegex = false } = opts;
  const results: SearchMatch[] = [];

  try {
    const pattern = useRegex ? query : query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const re = new RegExp(pattern, caseSensitive ? "g" : "gi");

    let match: RegExpExecArray | null;
    while ((match = re.exec(content)) !== null) {
      if (match[0].length === 0) {
        re.lastIndex++; // 避免零长匹配死循环
        continue;
      }
      const from = match.index;
      const to = from + match[0].length;
      // 行号列号（从 1 起）：看匹配起点前方有多少换行
      const before = content.substring(0, from);
      const line = before.split("\n").length;
      const lastNewline = before.lastIndexOf("\n");
      const col = from - lastNewline;
      results.push({ from, to, line, col });
    }
  } catch {
    // 正则表达式错误：视为无结果
  }
  return results;
}
