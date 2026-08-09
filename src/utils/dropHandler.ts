export interface DroppedItem {
  path: string;
  isDir: boolean;
}

export interface PartitionedDrops {
  folders: string[];
  files: string[];
}

/**
 * 将拖入的路径按「文件夹 / 文件」分组，保持原始顺序。
 *
 * 拖入文件夹时在左下方文件树区域打开；拖入文件时作为便签打开。
 * 该纯函数便于单测，实际的目录探测（get_file_info）在调用方完成。
 */
export function partitionDroppedPaths(items: DroppedItem[]): PartitionedDrops {
  const folders: string[] = [];
  const files: string[] = [];
  for (const it of items) {
    if (it.isDir) folders.push(it.path);
    else files.push(it.path);
  }
  return { folders, files };
}
