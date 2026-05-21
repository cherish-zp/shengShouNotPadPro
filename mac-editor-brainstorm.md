# Mac Editor 功能规划 — 头脑风暴

## 技术栈推荐：Tauri 2.0 + Rust + TypeScript

### 为什么选 Tauri？

| 对比项 | Tauri | Electron | Swift/SwiftUI |
|--------|-------|----------|---------------|
| 内存占用 | ~30-50MB | ~200-500MB | ~20-40MB |
| 打包体积 | ~3-8MB | ~150MB+ | ~5-15MB |
| M1 原生支持 | ✅ 编译为 ARM64 | ✅ 但偏重 | ✅ 最优 |
| UI 灵活度 | 高（Web 前端） | 高（Web 前端） | 中（SwiftUI 限制多） |
| 插件/扩展难度 | 中（前端 + Rust） | 低（纯 JS） | 高（需编译） |
| 跨平台潜力 | ✅ Win/Mac/Linux | ✅ | ❌ 仅 Apple |
| 启动速度 | 极快 | 慢 | 极快 |

**结论：** Tauri 在"极致性能"和"插件生态"之间取得了最佳平衡。
- Rust 后端处理文件 I/O、搜索、LSP 等重活，M1 上性能拉满
- Web 前端（React/Svelte + TypeScript）负责 UI 渲染，适合做炫酷界面
- 相比 Electron 省 80%+ 内存，比纯 Swift 更容易做插件系统

---

## 产品名称暂定：**NovaEdit**（可改）

## 核心功能模块

### 一、编辑器核心（Editor Core）

#### 1.1 文本编辑引擎
- 基于 **CodeMirror 6** 或 **Monaco Editor** 作为底层引擎
  - CodeMirror 6：更轻量、可扩展性强、Bundle 小
  - Monaco：VS Code 同款引擎、功能丰富但较重
  - **推荐 CodeMirror 6**（轻量 + 插件架构 = 更符合定位）
- 多标签页（Tab）编辑
- 分屏编辑（水平/垂直 split）
- 无限撤销/重做
- 多光标编辑（Multi-cursor）
- 列选择模式（Column/Block Selection）
- 自动保存 + 版本快照

#### 1.2 代码支持
- 语法高亮：支持 100+ 语言（Tree-sitter 驱动）
- 代码折叠（Code Folding）
- 括号匹配 & 高亮
- 自动缩进 & 格式化
- 缩进指南线（Indent Guides）
- 行号 + 面包屑导航（Breadcrumb）
- Minimap（代码小地图）

#### 1.3 纯文本支持
- Markdown 实时预览（分屏或浮动）
- 纯文本模式（零干扰写作）
- 字数/字符数统计
- 自动换行切换

### 二、文件管理（File Manager）

#### 2.1 侧边栏文件树
- 项目文件夹树形展示
- 文件图标（基于文件类型，可用 vscode-icons）
- 拖拽移动文件
- 右键菜单（新建/重命名/删除/复制路径）
- Git 状态标记（修改/新增/删除颜色标识）
- 排除规则（.gitignore 同步）

#### 2.2 文件搜索
- 全局文件搜索（模糊匹配，fzf 风格）
  - Cmd+P 快速打开
  - 支持 `文件名:行号` 语法
- 文件内搜索 + 替换（正则支持）
- 跨文件搜索（全局 grep）
  - Rust 后端 ripgrep 引擎，速度碾压
  - 结果高亮 + 预览

### 三、终端集成（Integrated Terminal）

- 内嵌终端面板（基于 xterm.js + Rust PTY）
- 多终端实例
- 分屏终端
- 命令快捷运行
- Shell 自动检测（zsh/bash/fish）

### 四、LSP 智能支持

- 集成 Language Server Protocol 客户端
- 智能代码补全（IntelliSense）
- 悬浮提示（Hover）
- 跳转到定义（Go to Definition）
- 查找引用（Find References）
- 重命名符号（Rename Symbol）
- 诊断信息（错误/警告波浪线）
- 内置支持：JavaScript/TypeScript, Python, Rust, Go, C/C++, Java, Swift 等主流语言

### 五、Git 集成

- 侧边栏 Git 面板
- 查看 diff（内联 diff + 分屏 diff）
- 暂存/提交/推送/拉取
- 分支切换与管理
- Git blame（行级作者信息）
- Commit 历史查看
- 冲突解决工具

### 六、插件系统（Plugin System）— 核心卖点

#### 6.1 插件架构
- **WebAssembly (WASM) 插件**：高性能插件用 Rust/C 编译为 WASM
- **JavaScript 插件**：低门槛，用 JS/TS 写插件
- 插件沙箱隔离（不影响主进程稳定性）
- 插件 API 设计：
  - 注册命令（Commands）
  - 注册菜单项
  - 自定义面板（Webview）
  - 编辑器事件钩子（onSave, onChange, onOpen）
  - 自定义语言支持
  - 自定义主题

#### 6.2 插件市场
- 内置插件浏览器（类似 VS Code 扩展市场）
- 一键安装/卸载/更新
- 插件评分与评论
- 热门/推荐分类
- 插件自动更新

#### 6.3 预置插件（V1 可先不全做，但要规划接口）
- Vim 模式
- Emmet 支持
- Prettier 格式化
- ESLint 集成
- Color Picker
- 图片预览
- PDF 预览

### 七、UI/UX 设计 — 炫酷路线

#### 7.1 视觉风格
- **毛玻璃效果（Frosted Glass / Vibrancy）**：利用 macOS NSVisualEffectView 通过 Tauri 插件实现
- **透明/半透明背景**：终端和侧边栏支持透明度调节
- **圆角 UI**：现代感设计语言
- **流畅动画**：标签切换、面板展开、搜索结果滚动均有过渡动画
- **自定义背景图**：编辑器背景支持自定义图片/渐变

#### 7.2 主题系统
- 内置深色/浅色主题
- 跟随系统（自动切换）
- 主题编辑器（可视化调色）
- 兼容 VS Code 主题格式（.json）
- 主题市场（社区分享）

#### 7.3 布局系统
- 可拖拽面板布局
- 侧边栏可左可右
- 面板可上下左右停靠
- Zen Mode（禅模式：全屏无干扰写作）
- 全屏模式

### 八、性能优化（M1 专项）

#### 8.1 启动优化
- 冷启动 < 300ms 目标
- 懒加载：插件按需加载
- 前端代码 Splitting
- Rust 后端预加载常用模块

#### 8.2 大文件处理
- 虚拟滚动（只渲染可视区域）
- 大文件分块读取（Rust 后端流式读取）
- 目标：100MB 文件流畅打开
- 后台索引（不影响编辑体验）

#### 8.3 内存管理
- 目标：空文件 < 40MB 内存
- 文件内容按需加载/卸载
- WASM 插件内存上限控制

#### 8.4 原生优化
- Rust 编译为 ARM64 原生代码
- 启用 Link Time Optimization (LTO)
- Web 渲染使用 WebKit（Safari 内核，M1 已深度优化）

### 九、快捷键 & 命令面板

- **Cmd+Shift+P**：命令面板（Command Palette）
- **Cmd+P**：快速文件打开
- **Cmd+Shift+F**：全局搜索
- **Cmd+`**：切换终端
- 完全自定义快捷键
- 快捷键方案切换（VS Code / Sublime / Vim 预设）
- 按键提示（新用户引导）

### 十、AI 辅助（V2 预留，V1 不做）

- 内置 AI 补全（可选接入 OpenAI / Claude API）
- 选中代码 → 右键 AI 解释/重构
- AI 写作助手（对纯文本）
- 自定义 AI 指令

---

## 开发阶段建议

### Phase 1 — MVP（最小可用产品）⏱ 约 6-8 周
**目标：** 能用、够快、好看

- [ ] Tauri 项目脚手架 + CI/CD
- [ ] CodeMirror 6 编辑器集成
- [ ] 基础语法高亮（Tree-sitter，先支持 20 种语言）
- [ ] 多标签页 + 分屏
- [ ] 文件树侧边栏
- [ ] Cmd+P 快速打开
- [ ] 文件内搜索 + 替换
- [ ] 深色/浅色主题
- [ ] 基础毛玻璃效果
- [ ] 大文件虚拟滚动
- [ ] 自动保存

### Phase 2 — 核心增强 ⏱ 约 4-6 周
**目标：** 开发者日常够用

- [ ] 内嵌终端
- [ ] Git 集成（基础 diff + 提交）
- [ ] 全局搜索（ripgrep）
- [ ] LSP 集成（补全、跳转、诊断）
- [ ] 多光标 + 列选择
- [ ] Minimap
- [ ] Markdown 预览
- [ ] 插件系统 JS 接口
- [ ] 命令面板

### Phase 3 — 生态 & 炫酷 ⏱ 约 4-6 周
**目标：** 差异化、有社区

- [ ] 插件市场
- [ ] 主题系统 + 主题编辑器
- [ ] WASM 插件支持
- [ ] 动画优化（全链路过渡动画）
- [ ] 透明/自定义背景
- [ ] Vim 模式插件
- [ ] 快捷键自定义系统
- [ ] 设置界面（图形化配置）

### Phase 4 — 打磨 & 发布 ⏱ 约 3-4 周
**目标：** 可发布、好口碑

- [ ] 自动更新（Sparkle for Tauri）
- [ ] 崩溃报告
- [ ] 性能 Profiling & 优化
- [ ] Apple 公证（Notarization）
- [ ] DMG 安装包制作
- [ ] Landing Page
- [ ] 文档站

---

## 项目结构建议

```
novaedit/
├── src-tauri/          # Rust 后端
│   ├── src/
│   │   ├── main.rs
│   │   ├── editor/     # 文本引擎核心
│   │   ├── file/       # 文件 I/O
│   │   ├── search/     # ripgrep 集成
│   │   ├── lsp/        # LSP 客户端
│   │   ├── git/        # Git 操作
│   │   ├── terminal/   # PTY 管理
│   │   ├── plugin/     # 插件运行时
│   │   └── commands/   # Tauri 命令
│   └── Cargo.toml
├── src/                # TypeScript 前端
│   ├── components/
│   │   ├── Editor/     # 编辑器组件
│   │   ├── Sidebar/    # 侧边栏
│   │   ├── Terminal/   # 终端
│   │   ├── Git/        # Git 面板
│   │   ├── Search/     # 搜索面板
│   │   └── Settings/   # 设置
│   ├── stores/         # 状态管理
│   ├── hooks/          # 自定义 Hook
│   ├── plugins/        # 内置插件
│   ├── themes/         # 主题文件
│   └── styles/         # 全局样式
├── plugins/            # 官方插件示例
└── docs/               # 文档
```

---

## 竞品参考

| 编辑器 | 我们能学什么 | 我们能超越什么 |
|--------|-------------|---------------|
| **VS Code** | 插件生态设计、LSP 集成 | 内存占用（我们轻 80%+）、启动速度 |
| **Zed** | GPU 渲染思路、协作设计 | 插件生态（Zed 插件少） |
| **Sublime Text** | 极致性能、Goto Anything | UI 现代感、插件易用性 |
| **Nova** | 原生 Mac 体验、UI 设计 | 开源、插件门槛更低 |
| **Typora** | Markdown 实时预览体验 | 代码编辑能力 |

---

## 技术选型清单

| 模块 | 推荐方案 | 备选 |
|------|---------|------|
| 框架 | Tauri 2.0 | — |
| 后端语言 | Rust | — |
| 前端框架 | React + TypeScript | Svelte + TS |
| 编辑器引擎 | CodeMirror 6 | Monaco Editor |
| 语法高亮 | Tree-sitter (WASM) | CodeMirror 内置 |
| 搜索引擎 | ripgrep (via Rust) | — |
| LSP 客户端 | tower-lsp / lsp-types | — |
| 终端模拟 | xterm.js + portable-pty | — |
| 状态管理 | Zustand | Jotai / Valtio |
| 样式方案 | Tailwind CSS + CSS Modules | — |
| 动画 | Framer Motion | Motion One |
| Git | git2-rs (libgit2) | — |
| 构建工具 | Vite | — |
| 包管理 | pnpm | — |

---

*文档生成时间：2026-05-17*
