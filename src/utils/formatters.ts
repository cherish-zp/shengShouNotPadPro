export function formatJSON(str: string): string {
  return JSON.stringify(JSON.parse(str), null, 2);
}

export function minifyJSON(str: string): string {
  return JSON.stringify(JSON.parse(str));
}

export function validateJSON(str: string): { valid: boolean; error?: string } {
  try {
    JSON.parse(str);
    return { valid: true };
  } catch (e) {
    return { valid: false, error: (e as Error).message };
  }
}

export function base64Encode(str: string): string {
  try {
    return btoa(unescape(encodeURIComponent(str)));
  } catch {
    return btoa(str);
  }
}

export function base64Decode(str: string): string {
  try {
    return decodeURIComponent(escape(atob(str)));
  } catch {
    return atob(str);
  }
}

export function timestampToDate(ts: number): string {
  return new Date(ts * 1000).toLocaleString("zh-CN");
}

export function dateToTimestamp(date: string): number {
  return Math.floor(new Date(date).getTime() / 1000);
}

export function getCurrentTimestamp(): number {
  return Math.floor(Date.now() / 1000);
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}
