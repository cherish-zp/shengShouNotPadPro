import { EditorView, ViewPlugin } from "@codemirror/view";
import { EditorSelection, type Extension } from "@codemirror/state";

export interface RectRange {
  line: number;
  anchor: number;
  head: number;
}

interface DocLike {
  lines: number;
  line(n: number): { from: number; to: number; length: number; text: string; number: number };
}

/**
 * 判断鼠标事件是否应该触发矩形选区。
 *
 * 触发条件（满足任意一条）：
 * 1. Alt 键被按下
 * 2. 中键正被按下（buttons 第 2 位 = 4）
 * 3. mousedown 事件且按下的是中键（button === 1）
 */
export function shouldTriggerRectSelection(event: MouseEvent): boolean {
  if (event.altKey) return true;
  if ((event.buttons & 4) !== 0) return true;
  if (event.type === "mousedown" && event.button === 1) return true;
  return false;
}

/**
 * 根据水平像素位置和字符宽度，计算对应的列号（0-based）。
 * 用于鼠标在行文本右侧/左侧时，用像素位置估算列数，保证多行对齐。
 */
export function colFromXPosition(xOffset: number, charWidth: number): number {
  if (xOffset <= 0 || charWidth <= 0) return 0;
  return Math.round(xOffset / charWidth);
}

/**
 * 计算矩形选区覆盖的所有行的选区范围。
 *
 * @param doc        文档对象（需提供 lines 数量和 line() 方法）
 * @param startLine  起始行（1-based）
 * @param startCol   起始列（0-based 字符偏移）
 * @param endLine    结束行（1-based）
 * @param endCol     结束列（0-based 字符偏移）
 *
 * @returns  每行一个 RectRange。anchor 对应 startCol，head 对应 endCol（保留方向）。
 *           列位置会被截断到对应行的实际长度范围内。
 *           返回数组按行号升序排列。
 */
export function computeRectSelectionRanges(
  doc: DocLike,
  startLine: number,
  startCol: number,
  endLine: number,
  endCol: number
): RectRange[] {
  if (startLine < 1 || endLine < 1 || startLine > doc.lines || endLine > doc.lines) {
    return [];
  }

  const fromLine = Math.min(startLine, endLine);
  const toLine = Math.max(startLine, endLine);

  const ranges: RectRange[] = [];
  for (let ln = fromLine; ln <= toLine; ln++) {
    const line = doc.line(ln);
    const anchorOffset = Math.min(Math.max(0, startCol), line.length);
    const headOffset = Math.min(Math.max(0, endCol), line.length);
    const anchor = line.from + anchorOffset;
    const head = line.from + headOffset;
    ranges.push({ line: ln, anchor, head });
  }

  return ranges;
}

/**
 * CodeMirror 6 扩展：按住鼠标中键（滚轮）拖动触发纵向矩形选区（多光标）。
 *
 * 完全自主的 ViewPlugin 实现：在捕获阶段监听中键 mousedown，
 * 手动计算矩形选区并 dispatch 到 EditorState。
 *
 * 使用方式：作为扩展加入 EditorState.extensions。
 */
export function middleButtonRectSelection(): Extension {
  return ViewPlugin.fromClass(
    class {
      private view: EditorView;
      private active: boolean = false;
      private startLine = 0;
      private startCol = 0;

      private onMouseDown: (e: MouseEvent) => void;
      private onMouseMove: (e: MouseEvent) => void;
      private onMouseUp: (e: MouseEvent) => void;
      private onAuxClick: (e: MouseEvent) => void;

      constructor(view: EditorView) {
        this.view = view;

        this.onMouseDown = (e: MouseEvent) => {
          if (e.button !== 1) return;
          // 只处理在编辑区内容上的中键
          if (!this.isInContent(e.target as Node)) return;

          e.preventDefault();
          e.stopPropagation();

          const pos = this.eventToPos(e);
          if (!pos) return;

          this.active = true;
          this.startLine = pos.line;
          this.startCol = pos.col;

          // 初始：单个光标
          const lineInfo = view.state.doc.line(pos.line);
          const offset = Math.min(pos.col, lineInfo.length);
          view.dispatch({
            selection: EditorSelection.cursor(lineInfo.from + offset),
          });
        };

        this.onMouseMove = (e: MouseEvent) => {
          if (!this.active) return;
          e.preventDefault();

          const cur = this.eventToPos(e);
          if (!cur) return;

          const ranges = computeRectSelectionRanges(
            view.state.doc as any,
            this.startLine,
            this.startCol,
            cur.line,
            cur.col
          );

          if (ranges.length === 0) return;

          const selRanges = ranges.map((r) =>
            EditorSelection.range(r.anchor, r.head)
          );
          // 主选区放在当前行
          const mainIndex = ranges.findIndex((r) => r.line === cur.line);

          view.dispatch({
            selection: EditorSelection.create(
              selRanges,
              mainIndex >= 0 ? mainIndex : selRanges.length - 1
            ),
          });
        };

        this.onMouseUp = (e: MouseEvent) => {
          if (e.button !== 1 || !this.active) return;
          this.active = false;
        };

        this.onAuxClick = (e: MouseEvent) => {
          // 阻止中键单击的默认行为（如粘贴等）
          if (e.button === 1) {
            e.preventDefault();
            e.stopPropagation();
          }
        };

        // 捕获阶段绑定，确保先于 CodeMirror 内置处理
        view.dom.addEventListener("mousedown", this.onMouseDown, true);
        window.addEventListener("mousemove", this.onMouseMove, true);
        window.addEventListener("mouseup", this.onMouseUp, true);
        view.dom.addEventListener("auxclick", this.onAuxClick, true);
      }

      destroy() {
        this.view.dom.removeEventListener("mousedown", this.onMouseDown, true);
        window.removeEventListener("mousemove", this.onMouseMove, true);
        window.removeEventListener("mouseup", this.onMouseUp, true);
        this.view.dom.removeEventListener("auxclick", this.onAuxClick, true);
      }

      private isInContent(node: Node | null): boolean {
        if (!node) return false;
        return this.view.contentDOM.contains(node);
      }

      private eventToPos(e: MouseEvent): { line: number; col: number } | null {
        const view = this.view;
        // 用 posAtCoords 获取行号和大致位置
        const result = view.posAtCoords({
          x: e.clientX,
          y: e.clientY,
        }) as number | { pos: number; inside: boolean } | null;
        if (result == null) return null;

        const pos = typeof result === "number" ? result : result.pos;
        const line = view.state.doc.lineAt(pos);

        // 关键修复：用像素位置计算列，而不是用字符位置
        // 这样当鼠标在行尾右侧时，列数会跟随 X 坐标继续增加，
        // 保证多行垂直对齐（短行虽然会被截断，但列参考是一致的）
        const charWidth = this.getCharWidth();
        const contentRect = view.contentDOM.getBoundingClientRect();
        const xOffset = e.clientX - contentRect.left + view.scrollDOM.scrollLeft;
        const pixelCol = colFromXPosition(xOffset, charWidth);

        // 如果 posAtCoords 算出的列在行内，用它（更准确）；
        // 如果在行尾或外面，用像素计算的列（保证对齐）
        const posCol = pos - line.from;
        const col = posCol < line.length ? posCol : pixelCol;

        return { line: line.number, col };
      }

      private _charWidth: number = 0;
      private getCharWidth(): number {
        if (this._charWidth > 0) return this._charWidth;
        const view = this.view;
        // 用 CodeMirror 的 defaultCharacterWidth 或自己测量
        const cw = (view as any).defaultCharacterWidth;
        if (cw && cw > 0) {
          this._charWidth = cw;
          return cw;
        }
        // fallback：测量一个字符的宽度
        const dom = view.contentDOM;
        const style = window.getComputedStyle(dom);
        const span = document.createElement("span");
        span.style.fontFamily = style.fontFamily;
        span.style.fontSize = style.fontSize;
        span.style.visibility = "hidden";
        span.style.position = "absolute";
        span.textContent = "x";
        document.body.appendChild(span);
        const w = span.getBoundingClientRect().width;
        document.body.removeChild(span);
        this._charWidth = w || 8;
        return this._charWidth;
      }
    }
  );
}
