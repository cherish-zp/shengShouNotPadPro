import { StateEffect, StateField } from "@codemirror/state";
import { Decoration, DecorationSet, EditorView } from "@codemirror/view";

// 查询高亮：把 FindReplace 面板算出的匹配位置标记成装饰，
// 只做视觉高亮——不修改选区、不移动光标、不抢焦点（v0.2.2 用户反馈）。

export interface SearchMatchRange {
  from: number;
  to: number;
  /** 当前项（面板计数指向的那一个）加深显示 */
  selected?: boolean;
}

const setSearchMatchesEffect = StateEffect.define<SearchMatchRange[]>();

const matchMark = Decoration.mark({ class: "cm-searchMatch" });
const matchSelectedMark = Decoration.mark({ class: "cm-searchMatch cm-searchMatch-selected" });

const searchMatchesField = StateField.define<DecorationSet>({
  create: () => Decoration.none,
  update(value, tr) {
    for (const effect of tr.effects) {
      if (effect.is(setSearchMatchesEffect)) {
        // 文档可能与面板计算时不同步（内容 200ms 防抖）：
        // 逐条钳制到当前文档范围内，避免 RangeError
        const docLength = tr.state.doc.length;
        const ranges = [];
        for (const m of effect.value) {
          const from = Math.max(0, Math.min(m.from, docLength));
          const to = Math.max(0, Math.min(m.to, docLength));
          if (to > from) {
            ranges.push((m.selected ? matchSelectedMark : matchMark).range(from, to));
          }
        }
        return Decoration.set(ranges, true);
      }
    }
    // 其他文档变更时平移已有装饰，等面板下一次重算（内容 200ms 防抖）
    return tr.docChanged ? value.map(tr.changes) : value;
  },
  provide: (field) => EditorView.decorations.from(field),
});

/** 查询高亮扩展：挂进编辑器静态扩展即可，内容由 setSearchMatches 推送 */
export const searchHighlightExtension = searchMatchesField;

/** 把面板计算出的匹配列表推送进编辑器（空数组 = 清除高亮） */
export function setSearchMatches(view: EditorView, matches: SearchMatchRange[]): void {
  view.dispatch({ effects: setSearchMatchesEffect.of(matches) });
}
