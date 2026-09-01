import { describe, it, expect } from "vitest";
import {
  imageExtFromMime,
  imageMimeFromExt,
  generateImageFileName,
  bytesToBase64,
  buildImageSnippet,
  dirname,
  joinPath,
  normalizeImagePath,
  resolveImagePath,
  extractStagingImageMoves,
  rewriteStagingLinks,
  resolvePreviewImages,
  isImageFilePath,
  isPasteSupported,
  randomLinkId,
  encodeImagePathForMarkdown,
  decodeImagePath,
  resolveImageDisplaySrc,
  findImageRanges,
  dataUrlFromBase64,
  collectLocalImagePaths,
  buildImageContextMenu,
  baseDirOfFilePath,
} from "./imagePaste";

describe("imageExtFromMime", () => {
  it("常见图片 MIME 映射到扩展名", () => {
    expect(imageExtFromMime("image/png")).toBe("png");
    expect(imageExtFromMime("image/jpeg")).toBe("jpg");
    expect(imageExtFromMime("image/jpg")).toBe("jpg");
    expect(imageExtFromMime("image/gif")).toBe("gif");
    expect(imageExtFromMime("image/webp")).toBe("webp");
    expect(imageExtFromMime("image/svg+xml")).toBe("svg");
  });

  it("非图片 MIME 返回 null", () => {
    expect(imageExtFromMime("text/plain")).toBeNull();
    expect(imageExtFromMime("application/pdf")).toBeNull();
  });
});

describe("imageMimeFromExt", () => {
  it("扩展名映射回 MIME（大小写不敏感）", () => {
    expect(imageMimeFromExt("png")).toBe("image/png");
    expect(imageMimeFromExt("JPG")).toBe("image/jpeg");
    expect(imageMimeFromExt("jpeg")).toBe("image/jpeg");
    expect(imageMimeFromExt("svg")).toBe("image/svg+xml");
  });

  it("非图片扩展名返回 null", () => {
    expect(imageMimeFromExt("txt")).toBeNull();
  });
});

describe("generateImageFileName", () => {
  it("按注入的时间和随机段生成文件名", () => {
    const now = new Date(2026, 7, 29, 14, 30, 5); // 本地时间 2026-08-29 14:30:05
    const name = generateImageFileName("image/png", now, "ab12cd");
    expect(name).toBe("img-20260829-143005-ab12cd.png");
  });

  it("jpeg 映射为 jpg 扩展名", () => {
    const now = new Date(2026, 11, 3, 0, 1, 2);
    expect(generateImageFileName("image/jpeg", now, "xyzxyz")).toBe(
      "img-20261203-000102-xyzxyz.jpg"
    );
  });

  it("不支持的 MIME 抛错", () => {
    expect(() => generateImageFileName("text/plain", new Date(), "abc123")).toThrow();
  });
});

describe("randomLinkId", () => {
  it("长度与字符集符合约定", () => {
    const id = randomLinkId();
    expect(id).toMatch(/^[a-z0-9]{6}$/);
  });
});

describe("bytesToBase64", () => {
  it("标准向量", () => {
    const enc = new TextEncoder();
    expect(bytesToBase64(new Uint8Array([]))).toBe("");
    expect(bytesToBase64(enc.encode("hello world"))).toBe("aGVsbG8gd29ybGQ=");
    expect(bytesToBase64(enc.encode("hello worl"))).toBe("aGVsbG8gd29ybA==");
    expect(bytesToBase64(enc.encode("hello wor"))).toBe("aGVsbG8gd29y");
    expect(bytesToBase64(new Uint8Array([0, 1, 2]))).toBe("AAEC");
  });
});

describe("buildImageSnippet", () => {
  const IMG = "![image](assets/a.png)";

  it("空文档：直接插入，末尾换行", () => {
    expect(buildImageSnippet("", 0, "assets/a.png")).toBe(`${IMG}\n`);
  });

  it("光标在首行行首：不补空行", () => {
    expect(buildImageSnippet("hello", 0, "assets/a.png")).toBe(`${IMG}\n`);
  });

  it("光标在行尾：前后补空行", () => {
    expect(buildImageSnippet("hello", 5, "assets/a.png")).toBe(`\n\n${IMG}\n`);
  });

  it("光标在行中：图片独占一行，剩余文字移到图后", () => {
    const snippet = buildImageSnippet("abcdef", 3, "assets/a.png");
    expect(snippet).toBe(`\n\n${IMG}\n`);
    const doc = "abcdef".slice(0, 3) + snippet + "abcdef".slice(3);
    expect(doc).toBe(`abc\n\n${IMG}\ndef`);
  });

  it("上一行非空时补空行分隔", () => {
    expect(buildImageSnippet("abc\ndef", 4, "assets/a.png")).toBe(`\n\n${IMG}\n`);
  });

  it("上一行为空行时不补空行", () => {
    expect(buildImageSnippet("abc\n\ndef", 5, "assets/a.png")).toBe(`${IMG}\n`);
  });

  it("光标在文档末尾：只在前面补空行", () => {
    expect(buildImageSnippet("hello\n", 6, "assets/a.png")).toBe(`\n\n${IMG}\n`);
  });
});

describe("dirname / joinPath / normalizeImagePath", () => {
  it("dirname 基础行为", () => {
    expect(dirname("/a/b/c.md")).toBe("/a/b");
    expect(dirname("/a")).toBe("/");
    expect(dirname("c.md")).toBe("");
    expect(dirname("/c.md")).toBe("/");
  });

  it("joinPath 拼接并清理多余斜杠", () => {
    expect(joinPath("/a", "b", "c.png")).toBe("/a/b/c.png");
    expect(joinPath("/a/", "b")).toBe("/a/b");
    expect(joinPath("/a", "", "b")).toBe("/a/b");
  });

  it("normalizeImagePath 处理 ./ 和 ../", () => {
    expect(normalizeImagePath("/a/./b")).toBe("/a/b");
    expect(normalizeImagePath("/a/b/../c")).toBe("/a/c");
    expect(normalizeImagePath("./assets/x.png")).toBe("assets/x.png");
    expect(normalizeImagePath("a//b")).toBe("a/b");
    expect(normalizeImagePath("../shared/x.png")).toBe("../shared/x.png");
    expect(normalizeImagePath("/docs/sub/../shared/x.png")).toBe("/docs/shared/x.png");
  });
});

describe("resolveImageDisplaySrc", () => {
  it("外链返回 external，src 原样可用", () => {
    expect(resolveImageDisplaySrc("https://x.com/a.png", "/docs")).toEqual({
      kind: "external",
      src: "https://x.com/a.png",
    });
    expect(resolveImageDisplaySrc("data:image/png;base64,AAAA", null)).toEqual({
      kind: "external",
      src: "data:image/png;base64,AAAA",
    });
  });

  it("本地绝对路径返回 local（%20 解码）", () => {
    expect(resolveImageDisplaySrc("/docs/Application%20Support/a.png", null)).toEqual({
      kind: "local",
      path: "/docs/Application Support/a.png",
    });
  });

  it("相对路径基于 baseDir 返回 local", () => {
    expect(resolveImageDisplaySrc("assets/a%20b.png", "/docs/notes")).toEqual({
      kind: "local",
      path: "/docs/notes/assets/a b.png",
    });
  });

  it("相对路径无 baseDir 时返回 missing", () => {
    expect(resolveImageDisplaySrc("assets/a.png", null)).toEqual({ kind: "missing" });
  });
});

describe("findImageRanges", () => {
  it("定位行内图片语法（含 alt 与链接）", () => {
    const line = "before ![图片](assets/img-1.png) after";
    expect(findImageRanges(line, 100)).toEqual([
      { from: 107, to: 130, alt: "图片", link: "assets/img-1.png" },
    ]);
  });

  it("一行多个图片都能定位", () => {
    const line = "![a](assets/x.png) 中间 ![b](assets/y.png)";
    const ranges = findImageRanges(line, 0);
    expect(ranges).toHaveLength(2);
    expect(ranges[0]).toMatchObject({ from: 0, alt: "a", link: "assets/x.png" });
    expect(ranges[1]).toMatchObject({ alt: "b", link: "assets/y.png" });
    expect(line.slice(ranges[1].from, ranges[1].to)).toBe("![b](assets/y.png)");
  });

  it("普通链接与纯文本不误报", () => {
    expect(findImageRanges("[text](assets/x.png) 与 ![a", 0)).toEqual([]);
  });

  it("%20 编码链接可定位", () => {
    const line = "![image](/a/Application%20Support/x.png)";
    expect(findImageRanges(line, 0)[0]).toMatchObject({
      from: 0,
      to: line.length,
      link: "/a/Application%20Support/x.png",
    });
  });
});

describe("baseDirOfFilePath", () => {
  it("返回文档所在目录而不是文件路径本身（ENOTDIR 回归测试）", () => {
    expect(baseDirOfFilePath("/Users/zhangpeng/Downloads/智能体开发.txt")).toBe(
      "/Users/zhangpeng/Downloads"
    );
    expect(baseDirOfFilePath("/notes/a/b.md")).toBe("/notes/a");
  });

  it("无路径（草稿）返回 null", () => {
    expect(baseDirOfFilePath(undefined)).toBeNull();
    expect(baseDirOfFilePath(null)).toBeNull();
    expect(baseDirOfFilePath("")).toBeNull();
  });
});

describe("buildImageContextMenu", () => {
  it("本地图片：解析绝对路径，支持在 Finder 中显示", () => {
    expect(buildImageContextMenu("assets/a.png", "/docs")).toEqual({
      path: "/docs/assets/a.png",
      canReveal: true,
    });
  });

  it("外链：路径为原始 URL，不支持 Finder 显示", () => {
    expect(buildImageContextMenu("https://x.com/a.png", null)).toEqual({
      path: "https://x.com/a.png",
      canReveal: false,
    });
  });

  it("无法解析（相对链接且无基准目录）：path 为 null 且无动作", () => {
    expect(buildImageContextMenu("assets/a.png", null)).toEqual({
      path: null,
      canReveal: false,
    });
  });
});

describe("dataUrlFromBase64", () => {
  it("拼装 data URL", () => {
    expect(dataUrlFromBase64("AAAA", "image/png")).toBe("data:image/png;base64,AAAA");
    expect(dataUrlFromBase64("R0lGOD", "image/gif")).toBe("data:image/gif;base64,R0lGOD");
  });
});

describe("collectLocalImagePaths", () => {
  it("从渲染 HTML 中收集本地图片绝对路径（去重）", () => {
    const html =
      `<img alt="x" src="/docs/a.png" class="md-img" />` +
      `<img alt="y" src="assets/b.png" class="md-img" />` +
      `<img alt="z" src="assets/b.png" class="md-img" />` +
      `<img alt="w" src="https://x.com/c.png" />`;
    expect(collectLocalImagePaths(html, "/docs")).toEqual([
      "/docs/a.png",
      "/docs/assets/b.png",
    ]);
  });

  it("无 baseDir 时相对链接不收集，绝对路径收集", () => {
    const html = `<img src="assets/a.png" /><img src="/abs/b.png" />`;
    expect(collectLocalImagePaths(html, null)).toEqual(["/abs/b.png"]);
  });

  it("无图片时返回空数组", () => {
    expect(collectLocalImagePaths("<p>hello</p>", "/docs")).toEqual([]);
  });
});

describe("resolveImagePath", () => {
  it("外部资源不转换", () => {
    expect(resolveImagePath("https://example.com/a.png", "/docs")).toBeNull();
    expect(resolveImagePath("http://example.com/a.png", "/docs")).toBeNull();
    expect(resolveImagePath("data:image/png;base64,AAAA", "/docs")).toBeNull();
    expect(resolveImagePath("blob:xxx", "/docs")).toBeNull();
  });

  it("绝对路径原样返回（交给 convertFileSrc，%20 解码为空格）", () => {
    expect(resolveImagePath("/Users/me/notes/a.png", null)).toBe("/Users/me/notes/a.png");
    expect(resolveImagePath("/Users/me/Application%20Support/a.png", null)).toBe(
      "/Users/me/Application Support/a.png"
    );
  });

  it("相对路径基于文档目录解析", () => {
    expect(resolveImagePath("assets/a.png", "/docs")).toBe("/docs/assets/a.png");
    expect(resolveImagePath("./assets/a.png", "/docs")).toBe("/docs/assets/a.png");
    expect(resolveImagePath("../shared/a.png", "/docs/sub")).toBe("/docs/shared/a.png");
    expect(resolveImagePath("assets/a%20b.png", "/docs")).toBe("/docs/assets/a b.png");
  });

  it("相对路径无基准目录时不转换", () => {
    expect(resolveImagePath("assets/a.png", null)).toBeNull();
  });
});

describe("encodeImagePathForMarkdown / decodeImagePath", () => {
  it("编码空格、括号与百分号，保证链接不含空白", () => {
    expect(encodeImagePathForMarkdown("/a/Application Support/x.png")).toBe(
      "/a/Application%20Support/x.png"
    );
    expect(encodeImagePathForMarkdown("/a/b (1)/x(2).png")).toBe("/a/b%20%281%29/x%282%29.png");
    expect(encodeImagePathForMarkdown("/a%20b.png")).toBe("/a%2520b.png");
  });

  it("解码还原真实路径（与编码互逆）", () => {
    const p = "/a/Application Support/x(1).png";
    expect(decodeImagePath(encodeImagePathForMarkdown(p))).toBe(p);
  });

  it("解码非法百分号序列时原样返回", () => {
    expect(decodeImagePath("/a%zz.png")).toBe("/a%zz.png");
  });
});

describe("extractStagingImageMoves", () => {
  const stagingRoot = "/Users/me/Library/Application Support/com.notepadpro.editor/attachments/staging";

  it("扫出暂存链接并生成迁移计划（链接含 %20 编码，from 解码为真实路径）", () => {
    const content = `before\n\n![image](${encodeImagePathForMarkdown(
      `${stagingRoot}/tab-1/img-20260829-100000-aaaaaa.png`
    )})\n\nafter`;
    const moves = extractStagingImageMoves(content, stagingRoot, "/docs/notes/assets");
    expect(moves).toEqual([
      {
        from: `${stagingRoot}/tab-1/img-20260829-100000-aaaaaa.png`,
        to: "/docs/notes/assets/img-20260829-100000-aaaaaa.png",
        link: encodeImagePathForMarkdown(
          `${stagingRoot}/tab-1/img-20260829-100000-aaaaaa.png`
        ),
        newLink: "assets/img-20260829-100000-aaaaaa.png",
      },
    ]);
  });

  it("忽略非暂存链接", () => {
    const content = `![img](https://x.com/a.png)\n![img](/other/dir/b.png)\n![img](assets/c.png)`;
    expect(extractStagingImageMoves(content, stagingRoot, "/docs/assets")).toEqual([]);
  });

  it("同一链接出现多次只生成一次迁移", () => {
    const link = encodeImagePathForMarkdown(`${stagingRoot}/tab-1/img-1.png`);
    const content = `![a](${link})\n![b](${link})`;
    const moves = extractStagingImageMoves(content, stagingRoot, "/docs/assets");
    expect(moves).toHaveLength(1);
  });
});

describe("rewriteStagingLinks", () => {
  it("把暂存绝对路径替换为相对路径", () => {
    const content = "before\n\n![image](/staging/tab-1/img-1.png)\n\n![image](/staging/tab-1/img-2.png)\n\nafter";
    const out = rewriteStagingLinks(content, [
      { link: "/staging/tab-1/img-1.png", newLink: "assets/img-1.png" },
      { link: "/staging/tab-1/img-2.png", newLink: "assets/img-2.png" },
    ]);
    expect(out).toBe("before\n\n![image](assets/img-1.png)\n\n![image](assets/img-2.png)\n\nafter");
  });

  it("迁移列表为空时内容不变", () => {
    const content = "![image](/staging/x.png)";
    expect(rewriteStagingLinks(content, [])).toBe(content);
  });
});

describe("resolvePreviewImages", () => {
  const toUrl = (p: string) => `asset://${p}`;

  it("绝对路径交给 toUrl 转换", () => {
    const html = `<img alt="x" src="/docs/a.png" class="md-img" />`;
    expect(resolvePreviewImages(html, null, toUrl)).toBe(
      `<img alt="x" src="asset:///docs/a.png" class="md-img" />`
    );
  });

  it("相对路径基于 baseDir 转换", () => {
    const html = `<img alt="x" src="assets/a.png" class="md-img" />`;
    expect(resolvePreviewImages(html, "/docs", toUrl)).toBe(
      `<img alt="x" src="asset:///docs/assets/a.png" class="md-img" />`
    );
  });

  it("外链与无 baseDir 的相对路径保持原样", () => {
    const html = `<img src="https://x.com/a.png" /><img src="assets/a.png" />`;
    expect(resolvePreviewImages(html, null, toUrl)).toBe(html);
  });

  it("多个 img 全部处理", () => {
    const html = `<img src="/a.png" /><img src="assets/b.png" /><img src="https://x.com/c.png" />`;
    expect(resolvePreviewImages(html, "/docs", toUrl)).toBe(
      `<img src="asset:///a.png" /><img src="asset:///docs/assets/b.png" /><img src="https://x.com/c.png" />`
    );
  });
});

describe("isImageFilePath", () => {
  it("识别常见图片扩展名（大小写不敏感）", () => {
    expect(isImageFilePath("a.png")).toBe(true);
    expect(isImageFilePath("a.PNG")).toBe(true);
    expect(isImageFilePath("a.jpg")).toBe(true);
    expect(isImageFilePath("a.jpeg")).toBe(true);
    expect(isImageFilePath("a.gif")).toBe(true);
    expect(isImageFilePath("a.webp")).toBe(true);
    expect(isImageFilePath("a.svg")).toBe(true);
  });

  it("非图片返回 false", () => {
    expect(isImageFilePath("a.txt")).toBe(false);
    expect(isImageFilePath("a")).toBe(false);
    expect(isImageFilePath("a.md")).toBe(false);
    expect(isImageFilePath(".png")).toBe(false);
  });
});

describe("isPasteSupported", () => {
  it("markdown 与 plaintext 支持，其他不支持", () => {
    expect(isPasteSupported("markdown")).toBe(true);
    expect(isPasteSupported("plaintext")).toBe(true);
    expect(isPasteSupported("javascript")).toBe(false);
    expect(isPasteSupported("python")).toBe(false);
  });
});
