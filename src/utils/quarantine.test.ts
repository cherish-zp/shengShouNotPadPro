import { describe, it, expect } from "vitest";
import {
  isLikelyQuarantinedPath,
  buildRemoveQuarantineCommand,
  classifyFileExtension,
} from "./quarantine";

describe("isLikelyQuarantinedPath", () => {
  it("returns true for files in Downloads folder", () => {
    expect(isLikelyQuarantinedPath("/Users/alice/Downloads/report.pdf")).toBe(true);
    expect(isLikelyQuarantinedPath("/Users/bob/Downloads/sub/info.txt")).toBe(true);
  });

  it("returns true for files on Desktop", () => {
    expect(isLikelyQuarantinedPath("/Users/alice/Desktop/note.md")).toBe(true);
  });

  it("returns false for files in project directories", () => {
    expect(isLikelyQuarantinedPath("/Users/alice/src/project/main.ts")).toBe(false);
    expect(isLikelyQuarantinedPath("/Users/alice/Documents/work/plan.md")).toBe(false);
  });

  it("returns false for system paths", () => {
    expect(isLikelyQuarantinedPath("/System/Library/file.plist")).toBe(false);
    expect(isLikelyQuarantinedPath("/Applications/Safari.app")).toBe(false);
  });

  it("returns false for empty path", () => {
    expect(isLikelyQuarantinedPath("")).toBe(false);
  });

  it("handles Windows-style paths gracefully", () => {
    expect(isLikelyQuarantinedPath("C:\\Users\\alice\\Downloads\\file.txt")).toBe(false);
  });
});

describe("buildRemoveQuarantineCommand", () => {
  it("builds an xattr command to remove com.apple.quarantine", () => {
    const cmd = buildRemoveQuarantineCommand("/tmp/test.txt");
    expect(cmd.tool).toBe("xattr");
    expect(cmd.args).toContain("-d");
    expect(cmd.args).toContain("com.apple.quarantine");
    expect(cmd.args).toContain("/tmp/test.txt");
  });

  it("includes -r flag for recursive mode when isDir is true", () => {
    const cmd = buildRemoveQuarantineCommand("/tmp/folder", true);
    expect(cmd.args).toContain("-r");
    expect(cmd.tool).toBe("xattr");
  });

  it("does not include -r flag when isDir is false or omitted", () => {
    const cmd = buildRemoveQuarantineCommand("/tmp/file.txt", false);
    expect(cmd.args).not.toContain("-r");
    const cmd2 = buildRemoveQuarantineCommand("/tmp/file.txt");
    expect(cmd2.args).not.toContain("-r");
  });

  it("preserves the exact path as the last argument", () => {
    const path = "/path/with spaces/and 'quotes'.txt";
    const cmd = buildRemoveQuarantineCommand(path);
    expect(cmd.args[cmd.args.length - 1]).toBe(path);
  });
});

describe("classifyFileExtension", () => {
  it("classifies common text/code extensions as safe-text", () => {
    expect(classifyFileExtension("main.ts")).toBe("safe-text");
    expect(classifyFileExtension("app.js")).toBe("safe-text");
    expect(classifyFileExtension("README.md")).toBe("safe-text");
    expect(classifyFileExtension("data.json")).toBe("safe-text");
    expect(classifyFileExtension("style.css")).toBe("safe-text");
    expect(classifyFileExtension("query.sql")).toBe("safe-text");
    expect(classifyFileExtension("config.yaml")).toBe("safe-text");
    expect(classifyFileExtension("notes.txt")).toBe("safe-text");
    expect(classifyFileExtension("src.rs")).toBe("safe-text");
    expect(classifyFileExtension("prog.py")).toBe("safe-text");
  });

  it("classifies app-bundle / installer extensions as caution", () => {
    expect(classifyFileExtension("app.app")).toBe("caution");
    expect(classifyFileExtension("installer.pkg")).toBe("caution");
    expect(classifyFileExtension("image.dmg")).toBe("caution");
    expect(classifyFileExtension("setup.exe")).toBe("caution");
  });

  it("classifies unknown extensions as unknown", () => {
    expect(classifyFileExtension("file.xyz")).toBe("unknown");
    expect(classifyFileExtension("data")).toBe("unknown");
  });

  it("is case-insensitive", () => {
    expect(classifyFileExtension("CODE.TS")).toBe("safe-text");
    expect(classifyFileExtension("App.APP")).toBe("caution");
  });

  it("handles files with no extension", () => {
    expect(classifyFileExtension("Makefile")).toBe("unknown");
    expect(classifyFileExtension("README")).toBe("unknown");
  });
});


describe("isLikelyQuarantinedPath — edge cases", () => {
  it("matches Downloads case-sensitively (exact folder name)", () => {
    // macOS Downloads 文件夹是大写 D 的，路径中确实是 /Downloads/
    expect(isLikelyQuarantinedPath("/Users/foo/Downloads/x.txt")).toBe(true);
    expect(isLikelyQuarantinedPath("/Users/foo/downloads/x.txt")).toBe(false);
  });

  it("matches Desktop at any user path depth", () => {
    expect(isLikelyQuarantinedPath("/Users/foo/Desktop/folder/note.md")).toBe(true);
  });

  it("does not match 'Downloads' in file name", () => {
    expect(isLikelyQuarantinedPath("/Users/foo/docs/my Downloads file.txt")).toBe(false);
  });
});

describe("buildRemoveQuarantineCommand — arg order", () => {
  it("places -r before -d when recursive", () => {
    const cmd = buildRemoveQuarantineCommand("/tmp/folder", true);
    const rIdx = cmd.args.indexOf("-r");
    const dIdx = cmd.args.indexOf("-d");
    expect(rIdx).toBeGreaterThan(-1);
    expect(dIdx).toBeGreaterThan(rIdx);
  });

  it("has path as the very last argument", () => {
    const cmd = buildRemoveQuarantineCommand("/a/b/c.txt", true);
    expect(cmd.args[cmd.args.length - 1]).toBe("/a/b/c.txt");
  });
});

describe("classifyFileExtension — more cases", () => {
  it("classifies .sql as safe-text", () => {
    expect(classifyFileExtension("msms_alert_realtime_history1_20260820.sql")).toBe("safe-text");
  });

  it("classifies dotfiles without extension as unknown", () => {
    expect(classifyFileExtension(".gitignore")).toBe("unknown");
    expect(classifyFileExtension(".bashrc")).toBe("unknown");
  });

  it("classifies .env as safe-text (env is a known config ext)", () => {
    expect(classifyFileExtension(".env")).toBe("safe-text");
    expect(classifyFileExtension("production.env")).toBe("safe-text");
  });

  it("classifies .log / .diff / .patch as safe-text", () => {
    expect(classifyFileExtension("system.log")).toBe("safe-text");
    expect(classifyFileExtension("changes.diff")).toBe("safe-text");
    expect(classifyFileExtension("fix.patch")).toBe("safe-text");
  });
});
