// @vitest-environment happy-dom
// DOM 级测试：挂真实 EditorView，验证「显示换行符」插件真的往 DOM 里插了标记。
// 纯函数测试覆盖不了渲染链路（visibleRanges / ViewPlugin 生命周期 / widget DOM）。
import { describe, expect, it } from "vitest";
import { EditorState } from "@codemirror/state";
import { EditorView } from "@codemirror/view";
import { lineEndingMarks } from "./lineEndingMarks";

function createView(doc: string, lineEnding: "LF" | "CRLF"): { view: EditorView; el: HTMLElement } {
  const el = document.createElement("div");
  document.body.appendChild(el);
  // 与生产 CodeEditor 一致：extensions 在 EditorState.create 里传入
  // （若同时传 EditorView 的 state + extensions，extensions 会被忽略）
  const state = EditorState.create({ doc, extensions: [lineEndingMarks(() => lineEnding)] });
  const view = new EditorView({ state, parent: el });
  return { view, el };
}

describe("lineEndingMarks DOM 渲染", () => {
  it("CRLF 文档：非末行的行尾各出现一个 CRLF 字样块", () => {
    const { view, el } = createView("第一行\r\n第二行\r\n第三行", "CRLF");
    const marks = el.querySelectorAll(".cm-le-crlf");
    expect(marks.length).toBe(2);
    expect(marks[0].textContent).toBe("CRLF");
    expect(marks[1].textContent).toBe("CRLF");
    view.destroy();
  });

  it("LF 文档：非末行的行尾各出现一个 LF 字样块", () => {
    const { view, el } = createView("a\nb\nc", "LF");
    const marks = el.querySelectorAll(".cm-le-lf");
    expect(marks.length).toBe(2);
    expect(marks[0].textContent).toBe("LF");
    view.destroy();
  });

  it("末行没有换行符：不出现标记", () => {
    const { view, el } = createView("只有一行", "CRLF");
    expect(el.querySelectorAll(".cm-le-crlf").length).toBe(0);
    expect(el.querySelectorAll(".cm-le-lf").length).toBe(0);
    view.destroy();
  });
});
