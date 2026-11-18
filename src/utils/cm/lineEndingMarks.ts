import { ViewPlugin, Decoration, WidgetType, type DecorationSet, type ViewUpdate, type EditorView } from "@codemirror/view";
import type { Extension, Range } from "@codemirror/state";

/**
 * 「显示换行符」扩展：在可视区每行行尾渲染换行符标记（与主流编辑器的
 * 「显示空白字符」一致）——CRLF 文件行尾显示黑底 CRLF 字样，LF 显示黑底
 * LF 字样，末行没有换行符不标记。开关由 CodeEditor 的 compartment 动态挂/卸。
 *
 * 注意：CM6 的 Text 在建 doc 时就把 \r\n 拆行吃掉（toString 恒为 \n），
 * 行尾原始分隔符在文档里不存在（sliceString 跨行时也会统一成 \n），
 * 所以标记取自 tab.lineEnding 元数据（后端字节级检测的权威值），
 * 由工厂函数注入读取器。
 */

/** 行尾标记判定：文档末行没有换行符不标记；其余按文件换行符类型给出字样 */
export function lineEndingMarkFor(
  lineEnding: "LF" | "CRLF",
  isLastLine: boolean
): "LF" | "CRLF" | null {
  if (isLastLine) return null;
  return lineEnding;
}

class LineEndMarkWidget extends WidgetType {
  constructor(readonly mark: "LF" | "CRLF") {
    super();
  }
  eq(other: LineEndMarkWidget) {
    return other.mark === this.mark;
  }
  toDOM() {
    const span = document.createElement("span");
    span.textContent = this.mark;
    span.className = this.mark === "CRLF" ? "cm-le-crlf" : "cm-le-lf";
    span.title =
      this.mark === "CRLF"
        ? "CRLF（Windows 换行 \\r\\n）"
        : "LF（Mac/Linux 换行 \\n）";
    return span;
  }
  ignoreEvent() {
    return true;
  }
}

/** 工厂：getLineEnding 返回当前 tab 的换行符（编辑器内文档已被 persistTab 归一保证与之一致） */
export function lineEndingMarks(getLineEnding: () => "LF" | "CRLF"): Extension {
  return ViewPlugin.fromClass(
    class {
      decorations: DecorationSet;
      constructor(view: EditorView) {
        this.decorations = this.build(view);
      }
      update(update: ViewUpdate) {
        if (update.docChanged || update.viewportChanged) {
          this.decorations = this.build(update.view);
        }
      }
      build(view: EditorView) {
        const doc = view.state.doc;
        const mark = lineEndingMarkFor(getLineEnding(), false);
        if (!mark) return Decoration.none;
        const widgets: Range<Decoration>[] = [];
        const deco = Decoration.widget({ widget: new LineEndMarkWidget(mark), side: 1 });
        for (const { from, to } of view.visibleRanges) {
          let pos = from;
          while (pos <= to) {
            const line = doc.lineAt(pos);
            // 最后一行（to === doc.length）没有换行符，不标记
            if (line.to < doc.length) {
              widgets.push(deco.range(line.to));
            }
            pos = line.to + 1;
          }
        }
        return Decoration.set(widgets, true);
      }
    },
    {
      // 必须：把插件值里的 decorations 注册进 CM6 的 decorations facet，
      // 否则插件实例化了 CM6 也不知道要渲染（widget 永远不出现在 DOM）
      decorations: (plugin) => plugin.decorations,
    }
  );
}
