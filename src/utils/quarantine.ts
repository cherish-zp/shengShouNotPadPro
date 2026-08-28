export type FileSafetyClass = "safe-text" | "caution" | "unknown";

export interface XattrCommand {
  tool: "xattr";
  args: string[];
}

const SAFE_TEXT_EXTENSIONS = new Set([
  "txt", "md", "markdown", "rst", "adoc",
  "json", "yaml", "yml", "toml", "ini", "cfg", "conf", "env",
  "sql", "hql", "prql",
  "ts", "tsx", "js", "jsx", "mjs", "cjs",
  "py", "rb", "php", "java", "kt", "swift", "go", "rs", "c", "h", "cpp", "hpp",
  "cs", "fs", "scala", "clj", "ex", "exs", "erl",
  "html", "htm", "css", "scss", "sass", "less", "styl",
  "vue", "svelte", "astro",
  "sh", "bash", "zsh", "fish", "ps1", "bat", "cmd",
  "r", "m", "mm", "pl", "pm", "lua", "dart",
  "csv", "tsv", "log", "diff", "patch",
  "xml", "svg",
]);

const CAUTION_EXTENSIONS = new Set([
  "app", "pkg", "dmg", "iso",
  "command", "tool", "workflow",
  "exe", "msi", "bat",
]);

/**
 * Guess whether a file at `path` is likely to have the macOS quarantine
 * attribute set, based on its location. Downloads and Desktop are the most
 * common places where quarantined files land.
 */
export function isLikelyQuarantinedPath(path: string): boolean {
  if (!path) return false;
  const normalized = path.replace(/\\/g, "/");
  if (!normalized.startsWith("/")) return false;
  return /\/Downloads\//.test(normalized) || /\/Desktop\//.test(normalized);
}

/**
 * Build the `xattr` command that removes the `com.apple.quarantine`
 * extended attribute from `path`.  When `isDir` is true the `-r`
 * (recursive) flag is added so every item inside the directory is also
 * cleared.
 */
export function buildRemoveQuarantineCommand(
  path: string,
  isDir: boolean = false
): XattrCommand {
  const args: string[] = ["-d", "com.apple.quarantine"];
  if (isDir) args.unshift("-r");
  args.push(path);
  return { tool: "xattr", args };
}

/**
 * Classify a file by its extension into one of three safety buckets:
 *
 * - `safe-text`  — plain-text / source-code formats that a text editor
 *                  can safely open regardless of quarantine status.
 * - `caution`    — executable / installer bundles that should be treated
 *                  carefully (never auto-opened from the editor).
 * - `unknown`    — anything else.
 */
export function classifyFileExtension(fileName: string): FileSafetyClass {
  const dot = fileName.lastIndexOf(".");
  if (dot < 0 || dot === fileName.length - 1) return "unknown";
  const ext = fileName.slice(dot + 1).toLowerCase();
  if (SAFE_TEXT_EXTENSIONS.has(ext)) return "safe-text";
  if (CAUTION_EXTENSIONS.has(ext)) return "caution";
  return "unknown";
}
