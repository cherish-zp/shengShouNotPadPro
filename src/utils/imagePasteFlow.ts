/**
 * 贴图编排层（粘合 imagePaste 纯逻辑、imageBridge 与 zustand store）：
 * - 粘贴：剪贴板图片字节 → 落盘 → 光标处插入 Markdown 链接
 * - 拖拽：图片文件路径 → 复制落盘 → 插入链接
 * 所有失败路径都 toast 提示并返回 false，不改动文档。
 */
import type { EditorView } from "@codemirror/view";
import { useTabStore } from "@/store/tabStore";
import { useEditorStore } from "@/store/editorStore";
import {
  buildImageSnippet,
  bytesToBase64,
  encodeImagePathForMarkdown,
  generateImageFileName,
  imageMimeFromExt,
  isPasteSupported,
  randomLinkId,
} from "@/utils/imagePaste";
import { toast } from "@/utils/toast";

interface ImageTarget {
  tabId: string;
  language: string;
  filePath?: string;
}

/** 生成图片文件名（按扩展名），非法格式返回 null */
function makeImageName(mime: string | null, ext: string | null): string | null {
  if (mime) {
    try {
      return generateImageFileName(mime, new Date(), randomLinkId());
    } catch {
      return null;
    }
  }
  if (ext && imageMimeFromExt(ext)) {
    return generateImageFileName(imageMimeFromExt(ext)!, new Date(), randomLinkId());
  }
  return null;
}

/** 把链接插入到指定视图的光标处；view 缺失时追加到文档末尾 */
function insertLink(tab: ImageTarget & { content: string }, link: string, view: EditorView | null): void {
  const encoded = encodeImagePathForMarkdown(link);
  if (view) {
    const pos = view.state.selection.main.head;
    const snippet = buildImageSnippet(view.state.doc.toString(), pos, encoded);
    view.dispatch({
      changes: { from: pos, insert: snippet },
      selection: { anchor: pos + snippet.length },
    });
    return;
  }
  const snippet = buildImageSnippet(tab.content, tab.content.length, encoded);
  useTabStore.getState().updateContent(tab.tabId, tab.content + snippet);
}

/** 剪贴板图片粘贴入口：字节落盘并插入链接 */
export async function insertImageBytes(
  view: EditorView | null,
  bytes: Uint8Array,
  mime: string,
  target: ImageTarget
): Promise<boolean> {
  if (!isPasteSupported(target.language)) {
    toast("当前文件类型不支持贴图，仅支持 Markdown / 纯文本", { type: "error" });
    return false;
  }
  const name = makeImageName(mime, null);
  if (!name) {
    toast("不支持的图片格式", { type: "error" });
    return false;
  }
  try {
    // imageBridge 按需动态加载：避免被静态 import 拉进首屏主 chunk
    const { saveImageBytes } = await import("@/utils/imageBridge");
    const { link } = await saveImageForTarget(target, name, (dir) =>
      saveImageBytes(dir, name, bytesToBase64(bytes))
    );
    insertLink({ ...target, content: getCurrentContent(target) }, link, view);
    return true;
  } catch (err) {
    console.error("图片保存失败:", err);
    toast("图片保存失败，请重试", { type: "error" });
    return false;
  }
}

/** 拖拽图片文件入口：复制到 assets/暂存目录并插入链接 */
export async function insertImageFile(srcPath: string): Promise<boolean> {
  const tab = useTabStore.getState().tabs.find((t) => t.id === useTabStore.getState().activeTabId);
  if (!tab) {
    toast("请先新建或打开一个便签，再拖入图片", { type: "error" });
    return false;
  }
  if (!isPasteSupported(tab.language)) {
    toast("当前文件类型不支持贴图，仅支持 Markdown / 纯文本", { type: "error" });
    return false;
  }
  const name = pathBaseName(srcPath);
  const ext = name.includes(".") ? name.split(".").pop()! : "";
  const imageName = makeImageName(null, ext);
  if (!imageName) {
    toast("不支持的图片格式", { type: "error" });
    return false;
  }
  try {
    // imageBridge 按需动态加载：避免被静态 import 拉进首屏主 chunk
    const { copyImageFile } = await import("@/utils/imageBridge");
    const target: ImageTarget = { tabId: tab.id, language: tab.language, filePath: tab.filePath };
    const { link } = await saveImageForTarget(target, imageName, (dir) =>
      copyImageFile(srcPath, dir, imageName)
    );
    const view = useEditorStore.getState().editorView;
    insertLink({ ...target, content: tab.content }, link, view);
    return true;
  } catch (err) {
    console.error("图片保存失败:", err);
    toast("图片保存失败，请重试", { type: "error" });
    return false;
  }
}

/**
 * 按目标状态决定落盘目录：已保存便签 → 文档同目录 assets/（相对链接）；
 * 草稿 → 暂存目录（绝对路径链接，保存时迁移）。
 */
async function saveImageForTarget(
  target: ImageTarget,
  name: string,
  write: (dir: string) => Promise<string>
): Promise<{ absPath: string; link: string }> {
  // imageBridge 按需动态加载：避免被静态 import 拉进首屏主 chunk
  const { getAssetsDir, getTabStagingDir } = await import("@/utils/imageBridge");
  if (target.filePath) {
    const dir = getAssetsDir(target.filePath);
    const absPath = await write(dir);
    return { absPath, link: `assets/${name}` };
  }
  const dir = await getTabStagingDir(target.tabId);
  const absPath = await write(dir);
  return { absPath, link: absPath };
}

function getCurrentContent(target: ImageTarget): string {
  return useTabStore.getState().tabs.find((t) => t.id === target.tabId)?.content ?? "";
}

function pathBaseName(p: string): string {
  return p.split(/[\\/]/).pop() || p;
}
