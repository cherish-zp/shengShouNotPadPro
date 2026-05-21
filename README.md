# NotPadPro

> 一个为 macOS M1 打造的现代化便签编辑器  
> 轻量 · 极速 · 炫酷 · 国产化界面

基于 **Tauri 2.0 + React 18 + TypeScript + CodeMirror 6** 构建，融合便签和代码编辑器的双重体验。

## ✨ 核心特性

- 🚀 **极致性能** — Rust 后端 + Web 前端，启动 <300ms,内存 <50MB
- 📝 **便签持久化** — 自动保存到本地，重启不丢内容
- 💾 **本地文件保存** — Cmd+S 选位置后保存，支持多种编码
- 🎨 **冷白现代风格** — GitHub/Tailwind 风格,纯净专业
- 🔍 **强大搜索** — 高亮跳转、计数显示、正则支持
- 📊 **15+ 语言高亮** — JS/TS/Python/Rust/Go/Java/HTML/CSS/JSON 等
- 🔀 **文件对比** — 双文件 Diff,差异行高亮
- 🛠 **工具箱** — JSON 格式化/Base64/时间戳/颜色拾取
- 🎯 **多编码支持** — UTF-8/GBK/Shift_JIS/EUC-KR/Big5 等
- ⚡ **快捷键全覆盖** — Cmd+N/S/F/H/P 等

## 🚀 快速启动

```bash
# 开发模式
./start.sh

# 打包
./build.sh
```

## 🛠 技术栈

| 模块 | 技术 |
|------|------|
| 框架 | Tauri 2.0 |
| 后端 | Rust + git2 + encoding_rs + walkdir |
| 前端 | React 18 + TypeScript |
| 编辑器 | CodeMirror 6 |
| 状态管理 | Zustand |
| 样式 | Tailwind CSS |
| 构建 | Vite 5 |

## 📐 项目结构

```
NotPadPro/
├── src-tauri/         # Rust 后端
│   ├── src/
│   │   ├── commands/  # Tauri 命令(文件/编码/搜索/Git/系统)
│   │   ├── state.rs   # 应用状态
│   │   └── lib.rs     # Tauri 初始化
│   └── Cargo.toml
├── src/               # React 前端
│   ├── components/    # UI 组件
│   ├── store/         # Zustand 状态
│   ├── hooks/         # React Hook
│   └── utils/         # 工具函数
├── start.sh           # 开发启动脚本
└── build.sh           # 打包脚本
```

## 🎨 界面

- **左侧**：便签列表(可重命名/标色/拖拽)、文件树、搜索、工具箱、插件
- **中间**：编辑器(语法高亮、字号缩放、编码切换)
- **顶部**：编码/语言/换行符/缩进/字号 实时控制
- **底部**：状态栏(行列、字符数、编码、缩进)

## 📜 协议

MIT
