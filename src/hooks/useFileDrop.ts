import { useEffect, useState } from "react";
import { useTabStore } from "@/store/tabStore";
import { useTauri } from "@/hooks/useTauri";
import { detectLanguageFromExtension } from "@/utils/encoding";
import { useEditorStore } from "@/store/editorStore";
import { partitionDroppedPaths, type DroppedItem } from "@/utils/dropHandler";
import { classifyFileExtension } from "@/utils/quarantine";
import { isImageFilePath, imageMimeFromExt } from "@/utils/imagePaste";
import { insertImageBytes, insertImageFile } from "@/utils/imagePasteFlow";

interface UseFileDropOptions {
  /** 是否禁用拖放（如打开 Modal 时） */
  disabled?: boolean;
}

/**
 * 监听文件拖放：
 * - 在 Tauri 环境下监听原生窗口的拖入事件（拖入系统文件路径）
 * - 在浏览器开发环境下监听 window 的 dragenter/drop 事件，用 FileReader 读取文件内容
 * 拖入的文件会作为新便签打开。
 *
 * 返回 `isDragging`，可用来渲染拖放提示遮罩。
 */
export function useFileDrop(options: UseFileDropOptions = {}) {
  const { disabled = false } = options;
  const addTab = useTabStore((s) => s.addTab);
  const { readFile, detectEncoding } = useTauri();
  const [isDragging, setIsDragging] = useState(false);
  const setOpenFolder = useEditorStore((s) => s.setOpenFolder);
  const openSidebarView = useEditorStore((s) => s.openSidebarView);

  // 通过文件路径打开（Tauri 环境）
  const openByPath = async (path: string) => {
    const name = path.split(/[\\/]/).pop() || path;
    const ext = name.includes(".") ? name.split(".").pop() ?? "" : "";
    const language = detectLanguageFromExtension(ext);
    const safety = classifyFileExtension(name);
    try {
      // 拖入文件时先清除 macOS 隔离属性，避免之后从 Finder 打开弹警告
      if (safety !== "caution") {
        import("@tauri-apps/api/core").then(({ invoke }) => {
          invoke("remove_quarantine", { path, recursive: false }).catch(() => {});
        }).catch(() => {});
      }
      // 先尝试自动检测编码，失败则回落到 UTF-8
      let encoding = "UTF-8";
      try {
        encoding = await detectEncoding(path);
      } catch {
        // ignore
      }
      const result = await readFile(path, encoding);
      addTab({
        name,
        filePath: path,
        content: result.content,
        encoding: result.encoding || encoding,
        language,
      });
    } catch (err) {
      console.error("打开拖入文件失败:", path, err);
    }
  };

  // 通过浏览器 File 对象打开（开发模式 / 无文件路径）
  const openByFile = async (file: File) => {
    const ext = file.name.includes(".") ? file.name.split(".").pop() ?? "" : "";
    // 浏览器拖入的图片走贴图路径（开发模式下无文件系统，会提示保存失败）
    const mime = imageMimeFromExt(ext);
    if (mime) {
      const bytes = new Uint8Array(await file.arrayBuffer());
      await insertImageBytes(null, bytes, mime, {
        tabId: useTabStore.getState().activeTabId ?? "",
        language: useTabStore.getState().tabs.find((t) => t.id === useTabStore.getState().activeTabId)?.language ?? "plaintext",
        filePath: useTabStore.getState().tabs.find((t) => t.id === useTabStore.getState().activeTabId)?.filePath,
      });
      return;
    }
    const language = detectLanguageFromExtension(ext);
    try {
      const content = await file.text();
      addTab({
        name: file.name,
        content,
        encoding: "UTF-8",
        language,
      });
    } catch (err) {
      console.error("读取拖入文件失败:", file.name, err);
    }
  };

  // 处理拖入的路径：文件夹在左下方文件树区域打开，文件作为便签打开
  const handleDroppedPaths = async (paths: string[]) => {
    const items: DroppedItem[] = [];
    for (const p of paths) {
      let isDir = false;
      try {
        const { invoke } = await import("@tauri-apps/api/core");
        const info = await invoke<{ is_dir: boolean }>("get_file_info", { path: p });
        isDir = info.is_dir;
      } catch {
        isDir = false;
      }
      items.push({ path: p, isDir });
    }
    const { folders, files } = partitionDroppedPaths(items);
    if (folders.length > 0) {
      setOpenFolder(folders[0]);
      openSidebarView("files");
    }
    for (const f of files) {
      // 图片文件不作为文本打开（会乱码），而是复制进 assets/暂存目录并插入链接
      if (isImageFilePath(f.split(/[\\/]/).pop() || f)) {
        void insertImageFile(f);
      } else {
        void openByPath(f);
      }
    }
  };

  // Tauri 原生文件拖放监听
  useEffect(() => {
    if (disabled) return;
    let unlisten: (() => void) | undefined;
    let cancelled = false;

    (async () => {
      try {
        const { getCurrentWebview } = await import("@tauri-apps/api/webview");
        const webview = getCurrentWebview();
        const off = await webview.onDragDropEvent((event) => {
          if (cancelled) return;
          const payload = event.payload as
            | { type: "enter" | "over"; paths: string[]; position: unknown }
            | { type: "drop"; paths: string[]; position: unknown }
            | { type: "leave" };
          if (payload.type === "enter" || payload.type === "over") {
            setIsDragging(true);
          } else if (payload.type === "leave") {
            setIsDragging(false);
          } else if (payload.type === "drop") {
            setIsDragging(false);
            const paths = payload.paths || [];
            void handleDroppedPaths(paths);
          }
        });
        unlisten = off;
      } catch {
        // 非 Tauri 环境，使用浏览器拖放
      }
    })();

    return () => {
      cancelled = true;
      if (unlisten) unlisten();
    };
  }, [disabled]);

  // 浏览器拖放监听（dev 模式 fallback）
  useEffect(() => {
    if (disabled) return;
    let dragCounter = 0;

    const hasFiles = (e: DragEvent) =>
      Array.from(e.dataTransfer?.types || []).includes("Files");

    const onDragEnter = (e: DragEvent) => {
      if (!hasFiles(e)) return;
      e.preventDefault();
      dragCounter++;
      setIsDragging(true);
    };
    const onDragOver = (e: DragEvent) => {
      if (!hasFiles(e)) return;
      e.preventDefault();
      if (e.dataTransfer) e.dataTransfer.dropEffect = "copy";
    };
    const onDragLeave = (e: DragEvent) => {
      if (!hasFiles(e)) return;
      e.preventDefault();
      dragCounter = Math.max(0, dragCounter - 1);
      if (dragCounter === 0) setIsDragging(false);
    };
    const onDrop = (e: DragEvent) => {
      if (!hasFiles(e)) return;
      e.preventDefault();
      dragCounter = 0;
      setIsDragging(false);
      const files = Array.from(e.dataTransfer?.files || []);
      files.forEach((f) => {
        void openByFile(f);
      });
    };

    window.addEventListener("dragenter", onDragEnter);
    window.addEventListener("dragover", onDragOver);
    window.addEventListener("dragleave", onDragLeave);
    window.addEventListener("drop", onDrop);

    return () => {
      window.removeEventListener("dragenter", onDragEnter);
      window.removeEventListener("dragover", onDragOver);
      window.removeEventListener("dragleave", onDragLeave);
      window.removeEventListener("drop", onDrop);
    };
  }, [disabled]);

  return { isDragging };
}
