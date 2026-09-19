import { useLayoutEffect, useState } from "react";
import { getFileSizeBytes } from "@/utils/fileSize";

/**
 * 获取指定文件的大小（字节）。
 *
 * @param path       文件路径；undefined 表示当前没有文件
 * @param refreshKey 变化时重新获取（如 tab id / 路径 / dirty 状态变化）
 * @returns undefined 表示加载中，null 表示不可用（无路径或 stat 失败），其余为文件字节数
 */
export function useFileSize(
  path: string | undefined,
  refreshKey?: unknown
): number | null | undefined {
  const [size, setSize] = useState<number | null | undefined>(
    path === undefined ? null : undefined
  );

  useLayoutEffect(() => {
    if (path === undefined) {
      setSize(null);
      return;
    }

    let stale = false;
    setSize(undefined);

    getFileSizeBytes(path)
      .then((result) => {
        if (!stale) setSize(result);
      })
      .catch(() => {
        if (!stale) setSize(null);
      });

    return () => {
      stale = true;
    };
  }, [path, refreshKey]);

  return size;
}
