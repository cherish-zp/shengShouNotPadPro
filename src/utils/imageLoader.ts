/**
 * 本地图片加载器：通过 read_file_bytes 把图片读成 base64 data URL 显示。
 * 不依赖 Tauri asset 协议（在部分打包环境下 asset:// 加载失败，且 release 包
 * 无法开 devtools 排查）；图片文件名带时间戳不可变，按路径缓存 Promise 安全。
 */
import { collectLocalImagePaths, dataUrlFromBase64, imageMimeFromExt, resolvePreviewImages } from "@/utils/imagePaste";

const cache = new Map<string, Promise<string>>();

const IMG_DEBUG_KEY = "novaedit-img-debug";

/** 诊断日志：记录图片加载链路各环节，写入 localStorage（webview 控制台不可达时，可从磁盘 SQLite 读出排障） */
export function logImageDebug(event: Record<string, unknown>): void {
  try {
    const raw = localStorage.getItem(IMG_DEBUG_KEY);
    const list: unknown[] = raw ? JSON.parse(raw) : [];
    list.push({ t: Date.now(), ...event });
    localStorage.setItem(IMG_DEBUG_KEY, JSON.stringify(list.slice(-12)));
  } catch {
    // 诊断日志失败不影响主流程
  }
}

/** 读取本地图片并返回 data URL（失败不缓存，下次可重试） */
export function loadImageDataUrl(absPath: string): Promise<string> {
  const cached = cache.get(absPath);
  if (cached) return cached;
  const promise = (async () => {
    logImageDebug({ step: "read-start", path: absPath });
    const { invoke } = await import("@tauri-apps/api/core");
    try {
      const base64 = await invoke<string>("read_file_bytes", { path: absPath });
      logImageDebug({ step: "read-ok", path: absPath, base64Len: base64?.length ?? -1 });
      const ext = absPath.slice(absPath.lastIndexOf(".") + 1);
      const mime = imageMimeFromExt(ext) ?? "image/png";
      return dataUrlFromBase64(base64, mime);
    } catch (err) {
      logImageDebug({ step: "read-error", path: absPath, err: String(err) });
      throw err;
    }
  })();
  cache.set(absPath, promise);
  promise.catch(() => cache.delete(absPath));
  return promise;
}

/**
 * 预览 HTML 异步解析：把本地 <img> 的 src 换成 data URL。
 * 加载失败的图片保留原绝对路径（显示为加载失败的空图）。
 */
export async function resolvePreviewImagesAsync(rawHtml: string, baseDir: string | null): Promise<string> {
  const paths = collectLocalImagePaths(rawHtml, baseDir);
  const map = new Map<string, string>();
  await Promise.all(
    paths.map(async (p) => {
      try {
        map.set(p, await loadImageDataUrl(p));
      } catch (err) {
        console.error("图片加载失败:", p, err);
      }
    })
  );
  return resolvePreviewImages(rawHtml, baseDir, (p) => map.get(p) ?? p);
}
