/**
 * 编辑器内联图片渲染：把行内的 Markdown 图片语法 ![](...) 渲染成图片本体。
 * - 仅作用于可见行；光标/选区落在图片区间内时显示源码，方便编辑链接
 * - 原子范围：方向键整体跳过图片，不会卡进隐藏文本
 * - 本地图片经 read_file_bytes 读成 data URL 显示（不依赖 asset 协议）；
 *   外链直接加载；无基准目录的相对链接显示占位符
 */
import { EditorView, ViewPlugin, Decoration, type DecorationSet, type ViewUpdate, WidgetType } from "@codemirror/view";
import { RangeSetBuilder, type Extension } from "@codemirror/state";
import { buildImageContextMenu, findImageRanges, resolveImageDisplaySrc } from "@/utils/imagePaste";
import { loadImageDataUrl } from "@/utils/imageLoader";
import { toast } from "@/utils/toast";

/** 图片右键菜单：展示解析后的路径，支持复制 / 在 Finder 中显示 */
function showImageMenu(x: number, y: number, menu: { path: string | null; canReveal: boolean }): void {
  document.querySelector(".cm-image-context-menu")?.remove();
  if (!menu.path) return;

  const el = document.createElement("div");
  el.className = "cm-image-context-menu";
  Object.assign(el.style, {
    position: "fixed",
    left: `${Math.min(x, window.innerWidth - 460)}px`,
    top: `${Math.min(y, window.innerHeight - 140)}px`,
    zIndex: "99998",
    display: "flex",
    flexDirection: "column",
    gap: "8px",
    padding: "10px 12px",
    borderRadius: "10px",
    maxWidth: "440px",
    background: "var(--glass-bg-strong, rgba(255,255,255,0.9))",
    backdropFilter: "var(--glass-blur, blur(24px))",
    WebkitBackdropFilter: "var(--glass-blur, blur(24px))",
    border: "0.5px solid var(--border-strong, rgba(0,0,0,0.12))",
    boxShadow: "var(--shadow-lg, 0 12px 40px rgba(0,0,0,0.12))",
    fontSize: "12px",
    color: "var(--text-primary, #1d1d1f)",
  });

  const pathLabel = document.createElement("div");
  pathLabel.textContent = "图片路径";
  Object.assign(pathLabel.style, { fontSize: "10px", color: "var(--text-secondary, #888)", letterSpacing: "0.05em" });
  const pathText = document.createElement("code");
  pathText.textContent = menu.path;
  Object.assign(pathText.style, {
    fontFamily: "var(--font-mono, monospace)",
    fontSize: "11px",
    wordBreak: "break-all",
    userSelect: "all",
    lineHeight: "1.5",
  });
  el.appendChild(pathLabel);
  el.appendChild(pathText);

  const actions = document.createElement("div");
  Object.assign(actions.style, { display: "flex", gap: "8px", justifyContent: "flex-end" });
  const mkButton = (label: string, onClick: () => void) => {
    const btn = document.createElement("button");
    btn.textContent = label;
    Object.assign(btn.style, {
      padding: "4px 10px",
      borderRadius: "7px",
      fontSize: "12px",
      border: "none",
      cursor: "pointer",
      background: "var(--bg-hover, rgba(0,0,0,0.06))",
      color: "var(--text-primary, #1d1d1f)",
    });
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      onClick();
      el.remove();
    });
    return btn;
  };
  actions.appendChild(
    mkButton("复制路径", () => {
      void navigator.clipboard
        .writeText(menu.path!)
        .then(() => toast("路径已复制"))
        .catch(() => {
          // WebView 剪贴板不可用时走后端命令兜底
          import("@tauri-apps/api/core")
            .then(({ invoke }) => invoke("set_clipboard_text", { text: menu.path }))
            .then(() => toast("路径已复制"))
            .catch(() => toast("复制失败", { type: "error" }));
        });
    })
  );
  if (menu.canReveal) {
    actions.appendChild(
      mkButton("在 Finder 中显示", () => {
        import("@tauri-apps/api/core")
          .then(({ invoke }) => invoke("reveal_in_finder", { path: menu.path }))
          .catch(() => {});
      })
    );
  }
  el.appendChild(actions);
  document.body.appendChild(el);

  const close = () => el.remove();
  // 点击菜单外任意处关闭；菜单内点击由按钮自行处理
  document.addEventListener("mousedown", close, { once: true, capture: true });
}

class InlineImageWidget extends WidgetType {
  constructor(
    readonly alt: string,
    readonly link: string,
    readonly getBaseDir: () => string | null
  ) {
    super();
  }

  eq(other: InlineImageWidget): boolean {
    return (
      other.alt === this.alt &&
      other.link === this.link &&
      other.getBaseDir() === this.getBaseDir()
    );
  }

  toDOM(): HTMLElement {
    const wrap = document.createElement("span");
    wrap.className = "cm-inline-image";
    const resolution = resolveImageDisplaySrc(this.link, this.getBaseDir());

    if (resolution.kind === "missing") {
      const placeholder = document.createElement("span");
      placeholder.textContent = `🖼 ${this.alt || "图片"}`;
      Object.assign(placeholder.style, {
        display: "inline-block",
        padding: "2px 10px",
        borderRadius: "6px",
        border: "1px dashed var(--border-strong, rgba(128,128,128,0.4))",
        color: "var(--text-tertiary, #999)",
        fontSize: "0.9em",
      });
      wrap.appendChild(placeholder);
      return wrap;
    }

    const img = document.createElement("img");
    img.alt = this.alt;
    img.title = this.link;
    Object.assign(img.style, {
      display: "block",
      maxWidth: "min(100%, 520px)",
      maxHeight: "260px",
      margin: "2px 0",
      borderRadius: "8px",
      border: "0.5px solid var(--border, rgba(128,128,128,0.2))",
      background: "var(--bg-secondary, rgba(128,128,128,0.06))",
    });
    // 失败时在图旁显示具体原因，便于从截图直接定位问题
    const markFailed = (reason: string) => {
      img.style.minWidth = "140px";
      img.style.minHeight = "32px";
      img.style.outline = "1px dashed var(--error, #ff3b30)";
      img.title = `图片无法加载: ${this.link}`;
      const label = document.createElement("span");
      label.textContent = `图片加载失败: ${reason}`;
      Object.assign(label.style, {
        display: "inline-block",
        marginLeft: "8px",
        fontSize: "11px",
        color: "var(--error, #ff3b30)",
        verticalAlign: "top",
        paddingTop: "4px",
        maxWidth: "320px",
        wordBreak: "break-all",
      });
      wrap.appendChild(label);
    };
    img.addEventListener("error", () => markFailed("资源解码失败"));
    if (resolution.kind === "external") {
      img.src = resolution.src;
    } else {
      // 本地图片：read_file_bytes → data URL，绕开 asset 协议
      img.style.minWidth = "140px";
      img.style.minHeight = "32px";
      loadImageDataUrl(resolution.path)
        .then((url) => {
          if (img.isConnected) img.src = url;
        })
        .catch((err) => {
          if (img.isConnected) markFailed(String(err));
        });
    }
    wrap.appendChild(img);
    // 右键查看路径：点击/选中图片不再切换成源码（见 rebuild），查看路径走这里
    wrap.addEventListener("contextmenu", (e) => {
      e.preventDefault();
      e.stopPropagation();
      showImageMenu(e.clientX, e.clientY, buildImageContextMenu(this.link, this.getBaseDir()));
    });
    return wrap;
  }

  ignoreEvent(): boolean {
    return false;
  }
}

/** 编辑器扩展：内联渲染图片。getBaseDir 返回当前文档所在目录（草稿为 null）。 */
export function inlineImages(getBaseDir: () => string | null): Extension {
  const plugin = ViewPlugin.fromClass(
    class InlineImagePlugin {
      decorations: DecorationSet = Decoration.none;

      constructor(readonly view: EditorView) {
        this.rebuild();
      }

      update(update: ViewUpdate) {
        if (update.docChanged || update.viewportChanged) {
          this.rebuild();
        }
      }

      rebuild() {
        const view = this.view;
        const builder = new RangeSetBuilder<Decoration>();
        for (const { from, to } of view.visibleRanges) {
          for (let pos = from; pos <= to; ) {
            const line = view.state.doc.lineAt(pos);
            for (const range of findImageRanges(line.text, line.from)) {
              // 始终渲染图片本体：点击/选中不再切换成源码（查看路径走右键菜单）
              builder.add(
                range.from,
                range.to,
                Decoration.replace({
                  widget: new InlineImageWidget(range.alt, range.link, getBaseDir),
                })
              );
            }
            if (line.to >= to) break;
            pos = line.to + 1;
          }
        }
        this.decorations = builder.finish();
      }
    },
    { decorations: (v) => v.decorations }
  );

  return [
    plugin,
    EditorView.atomicRanges.of((view) => view.plugin(plugin)?.decorations ?? Decoration.none),
  ];
}
