# 设计文档：编辑器粘贴图片

日期：2026-08-29
状态：待评审

## 1. 背景与目标

NotePadPro 目前编辑区只能输入文字。用户希望能把剪贴板里的截图/图片直接贴进便签，并在 Markdown 预览中看到图片。

**P1 目标（本设计范围）：**

1. 在 Markdown / 纯文本便签中按 `Cmd+V` 粘贴剪贴板图片，图片自动落盘，光标处插入 Markdown 图片链接。
2. 拖拽图片文件到编辑区时，同样落盘并插入链接（不再按文本打开导致乱码）。
3. Markdown 预览面板能正确显示本地图片。
4. 未保存便签（无 filePath）贴图后，`Cmd+S` 保存时图片自动迁移到文档旁边并重写链接。

**非目标（后续迭代 / 不做）：**

- 编辑器内把 `![](...)` 渲染成内联缩略图（P2，另行设计）。
- 图片压缩、缩放、粘贴时改名弹窗、内容哈希去重。
- 非图片附件（pdf/zip 等）。
- 截图功能。

## 2. 关键约束与选型结论

| 约束 | 结论 |
| --- | --- |
| 便签内容持久化在 localStorage（约 5MB 上限） | base64 内嵌会撑爆，**图片必须落盘为文件** |
| WebView 内 `<img>` 无法直接加载本地路径 | 开启 Tauri `assetProtocol`，前端用 `convertFileSrc` 生成可加载 URL |
| 现有 `write_file` 命令只支持文本 | 新增二进制写盘 Rust 命令，沿用现有自定义命令风格 |
| 便签分「已关联文件」与「未保存草稿」两类 | 已保存 → 文档同目录 `assets/`；草稿 → 暂存目录，保存时迁移 |

**已确认的三个方向（用户拍板）：**

1. 存储方式：**文档同目录 `assets/`，文档内相对路径**（Typora/Obsidian 风格，文件夹可整体移动/分享/进 git）。
2. 呈现方式：**两步走**——P1 插入链接 + 预览显示；P2 再做编辑器内联渲染。
3. 适用范围：**仅 Markdown / 纯文本**；其他语言类型贴图时给出提示。

## 3. 数据流

### 3.1 粘贴（主路径）

```
Cmd+V
 → CodeEditor 的 domEventHandlers("paste")
 → clipboardData.items 中找到 image/* 项（png/jpeg/gif/webp/svg）
   ├─ 找不到 → 不拦截，走默认文本粘贴
   └─ 找到 → preventDefault()
 → isPasteSupported(tab.language) 校验（markdown/plaintext 之外 toast 提示并终止）
 → blob.arrayBuffer() → base64（前端转，invoke 传字符串）
 → 生成文件名 img-YYYYMMDD-HHmmss-xxxxxx.<ext>（按 MIME 定扩展名）
 → 计算落盘目录（见 3.2）
 → invoke save_image_bytes(dir, name, base64) → 返回绝对路径
 → 计算应插入的链接：
     已保存便签 → assets/<name>（相对路径）
     草稿便签   → <暂存绝对路径>
 → buildImageSnippet 处理前后空行，view.dispatch 在光标处插入
 → 现有 updateListener 自动 updateContent → dirty → 既有保存机制接管
```

落盘失败（目录创建失败/写盘失败）时 toast 提示，不插入任何链接。

### 3.2 落盘目录

- **已保存便签**：`<文档所在目录>/assets/`，自动创建。
- **草稿便签（无 filePath）**：`<appData>/attachments/staging/<tabId>/`，`appDataDir()` 由 `@tauri-apps/api/path` 获取，模块级缓存。

草稿文档里插入暂存目录的**绝对路径**。这样：

- 预览渲染统一走「绝对路径 → convertFileSrc」，草稿也能即时看到图；
- 保存迁移时按「staging 前缀匹配」重写，逻辑集中在一处纯函数，易测。

### 3.3 保存时迁移（useAutoSave 改造）

`handleSave` / `autoSaveAll` / `handleSaveAs` 统一走一个新的 `persistTab(tab)`：

1. `findStagingLinks(content, stagingRoot)` 扫出指向暂存目录的图片链接；
2. `invoke ensure_dir(<文档目录>/assets)`；
3. 对每个暂存图：`invoke rename_file(暂存路径, <文档目录>/assets/<name>)`（复用现有命令做移动）；
4. `rewriteStagingLinks` 把文档中的暂存绝对路径改写为 `assets/<name>`；
5. 最后 `writeFile` 写正文。**先迁图后写文**，顺序保证链接始终有效。

无暂存图时零开销直写，行为与现在完全一致。

### 3.4 拖拽图片文件

在现有文件拖入流程（`partitionDroppedPaths` 之后）增加分流：

- 扩展名为 png/jpg/jpeg/gif/webp/svg 的文件**不再作为文本便签打开**；
- 目标便签支持贴图 → `invoke copy_image_file(src, dir, name)` 复制进 assets/暂存目录（复制而非引用，保证文件夹整体移动不断链），插入链接；
- 目标便签不支持贴图（代码文件）→ toast 提示「图片文件无法在代码文件中插入」；
- 混合拖入（图片 + 文本文件）时各自分流，互不影响。

### 3.5 预览显示

1. `tauri.conf.json` 增加：`app.security.assetProtocol = { "enable": true, "scope": ["**"] }`。
2. `MarkdownPreview` 新增 `filePath?: string` 属性；`renderMarkdown` 产出 HTML 后，对 `<img src="...">` 做一次 resolve：
   - `http(s)://`、`data:` 开头 → 原样；
   - 绝对路径（`/` 开头，含暂存路径）→ `convertFileSrc(src)`；
   - 相对路径（`assets/...`、`./`、`../`）→ 基于 `dirname(filePath)` 拼成绝对路径再 `convertFileSrc`；无 filePath 时原样输出（草稿不会有相对链接）。
   - resolve 逻辑抽纯函数 `resolveImagePath(src, baseDir)`，返回 null 表示不转换。

## 4. 模块划分

| 单元 | 职责 | 依赖 |
| --- | --- | --- |
| `src/utils/imagePaste.ts`（新增，纯逻辑） | 剪贴板图片提取判断、文件名生成、插入片段构建、staging 链接扫描/重写、相对路径 resolve、图片文件名判断、语言支持判断 | 无（全部可注入/纯函数） |
| `src-tauri/src/commands/file_ops.rs`（扩展） | `save_image_bytes(dir, name, base64)`、`copy_image_file(src, dir, name)`、`ensure_dir(path)`，均在 `lib.rs` 注册 | 现有 base64 依赖 |
| `CodeEditor.tsx`（修改） | paste handler（含拦截与插入） | imagePaste、commands |
| `useFileDrop.ts` / App 层（修改） | 图片文件 drop 分流（`partitionDroppedPaths` 之后） | imagePaste、commands |
| `MarkdownPreview.tsx`（修改） | img src resolve + convertFileSrc | imagePaste |
| `useAutoSave.ts`（修改） | 抽 `persistTab`，保存前迁移暂存图 | imagePaste、commands |
| `App.tsx` / `tabStore`（小改） | 启动时清空 staging 根目录；`closeTab` 时清理该 tab 的 staging 目录 | commands |
| `src/utils/toast.ts`（新增，~30 行） | 极轻量 toast（全局单例，2.5s 消失），贴图失败/类型不支持提示 | 无 |
| `tauri.conf.json`（一行） | 开启 assetProtocol | — |

文件名规则：`img-YYYYMMDD-HHmmss-<6位随机小写字母数字>.<png|jpg|gif|webp|svg>`，纯 ASCII 无空格，无需 URL 编码，git 友好。时间由调用方注入以便测试。

## 5. 错误处理

| 场景 | 行为 |
| --- | --- |
| 剪贴板无图片 | 不拦截，正常粘贴文本 |
| 写盘/建目录失败 | toast「图片保存失败」，不插入链接，文档不变 |
| 代码文件（非 md/txt）贴图 | toast「当前文件类型不支持贴图」，无副作用 |
| 保存迁移时某个图片移动失败 | toast 提示具体文件名，正文仍保存（保留原暂存绝对路径，链接不丢） |
| 应用启动/关闭草稿 | 清理 staging 目录，孤儿图片不堆积 |
| 超大图片 | 不做限制（本地工具，YAGNI） |

## 6. 测试计划（TDD）

先写失败测试再实现，全部落在 `src/utils/imagePaste.test.ts`：

1. `generateImageFileName`：MIME → 扩展名映射、注入固定时间后格式正确、随机段唯一性。
2. `buildImageSnippet`：光标在行首/行中/文件头/文件尾时前后空行补齐正确。
3. `findStagingLinks` + `rewriteStagingLinks`：能从混合内容中扫出暂存链接、重写为相对路径、无关文本不受影响。
4. `resolveImagePath`：http/data 原样（返回 null）、绝对路径、`./` `../` 相对路径拼接正确。
5. `isImageFileName` / `isPasteSupported`：边界用例（无扩展名、大写扩展名、markdown/plaintext 之外的类型）。

验证链：`npm test` 全绿 + `npx tsc --noEmit` 无错 + `npx vite build` 成功 + `cd src-tauri && cargo check`（动了 Rust）。

安装启动后手工验证清单：微信/浏览器复制图片粘贴、macOS 截图 ⌘⇧⌃4 粘贴、拖 png 进 md、草稿贴图后 ⌘S 选路径保存、预览图片显示、`assets/` 目录与 git status 符合预期。

## 7. 风险与备注

- **WKWebView paste 事件可靠性**：macOS 上 Safari/WebKit 的 `clipboardData.items` 对图片支持良好（微信、浏览器、系统截图均可拿到 `image/png`）。若后续发现个别来源拿不到，再引入 `clipboard-manager` 插件的 `readImage` 作兜底，本次不做。
- **assetProtocol scope 用 `["**"]`**：本应用定位本地工具，与现有 fs 命令直接传绝对路径的权限面一致；不额外收紧。
- **迁移失败保底**：正文里保留暂存绝对路径时预览仍可显示（staging 目录未清理），不产生死链。
- **duplicateTab 边界**：草稿副本会引用同一暂存文件，两个 tab 各自保存迁移时按「链接扫到就迁移、文件已不在则保留原路径」处理，最坏情况是副本保留暂存绝对路径且仍可预览，不产生死链；P1 不做共享图去重。
