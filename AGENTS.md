# AGENTS.md — NotePadPro 项目规范

## 项目简介
NotePadPro 是一个轻量、跨编码、支持 Markdown 预览的**本地文本编辑器**（便签 / 代码编辑）。
技术栈：Tauri 2 + React 18 + TypeScript + zustand + CodeMirror 6 + Tailwind。
**定位：纯本地文本编辑器。不包含远程连接（SSH）、终端、Xshell、Gitee 同步等功能，不要再引入。**

## 常用命令
- 安装依赖：`npm install`
- 开发模式：`npm run tauri dev`（首次需编译 Rust，约 2-3 分钟）
- 类型检查：`npx tsc --noEmit`
- 单元测试（TDD）：`npm test`（vitest）
- 前端构建：`npm run build`
- Rust 检查：`cd src-tauri && cargo check`
- 打包 mac 应用：`npx tauri build`

## 强制工作流（每次改动后必须执行）
完成任何代码改动后，按顺序执行；任一步失败则停下排查，不得跳过验证直接提交/安装：
1. **验证**：`npm test` 全绿 + `npx tsc --noEmit` 无错 + `npx vite build` 成功；改动涉及 Rust 时额外 `cd src-tauri && cargo check` 通过。
2. **提交 git**：`git add -A && git commit -m "<中文简述本次改动>"`。
3. **打包**：`npx tauri build`（产出 `.app` / `.dmg`）。
4. **安装到 mac**：`rm -rf /Applications/NotePadPro.app && cp -R src-tauri/target/release/bundle/macos/NotePadPro.app /Applications/`。

> 提交与安装会写入 `.git` 与 `/Applications`，需在沙箱外执行（提权）。
> **每次改完代码都必须完整执行「打包（步骤 3）+ 安装（步骤 4）」并确认安装成功，不得省略，也不得仅作为可选项交给用户自行执行。**

## 编码规范
- TypeScript + React 函数组件；样式用内联 `style` + CSS 变量（`var(--xxx)`），与现有代码保持一致。
- 状态管理用 zustand；持久化用 localStorage（参考 `editorStore` / `tabStore` / `settingsStore` 的 persist 模式）。
- Tauri 命令在 `src-tauri/src/commands/*.rs` 用 `#[tauri::command]` 定义，并在 `src-tauri/src/lib.rs` 的 `invoke_handler` 注册；前端用 `import("@tauri-apps/api/core").then(({invoke}) => ...)` 调用。
- 新增可测的纯逻辑放到 `src/utils/` 或组件目录下的独立模块，配 vitest 单测（TDD：先写失败测试，再实现至通过）。
- 不引入远程 / 终端相关功能；扩展保持本地化。
- 不要把 `dist/`、`node_modules/`、`src-tauri/target/`、`src-tauri/Cargo.lock` 等构建产物纳入 git（已在 `.gitignore`）。
