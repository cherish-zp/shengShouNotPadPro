/** 换行符类型（与 Tab.lineEnding / 后端 read_file 的 line_ending 一致） */
export type LineEnding = "LF" | "CRLF";

/**
 * 把任意混合换行（\r\n / 孤立 \r / \n）统一为目标的换行符。
 *
 * 背景：CodeMirror 的 doc.toString() 恒用 \n 连接行（DefaultSplit 会把
 * \r\n、\r 都拆掉），直接写盘会把 Windows 的 CRLF 文件静默转成 LF。
 * 所有保存写盘、切换换行符的地方都必须先经过本函数。
 */
export function applyLineEnding(text: string, lineEnding: LineEnding): string {
  // 先归一：\r\n 与孤立 \r（旧 Mac 风格）一律变 \n
  const lf = text.replace(/\r\n?/g, "\n");
  return lineEnding === "CRLF" ? lf.replace(/\n/g, "\r\n") : lf;
}
