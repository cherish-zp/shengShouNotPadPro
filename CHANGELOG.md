# 更新日志

本项目所有显著变更将记录于此文件。

格式基于 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.1.0/)，
版本号遵循 [语义化版本 2.0.0](https://semver.org/lang/zh-CN/)。

## [0.2.0] - 2026-10-10

### Added
- **便签手动排序**：便签列表支持右键菜单「上移 / 下移」与鼠标拖拽两种方式调整顺序，
  排序结果持久化保存，重启后保持。
- **应用内一键更新**：接入 `tauri-plugin-updater`（minisign 签名验证，公钥内嵌），
  更新检查走双源端点——Gitee 常驻 latest release（国内可达）优先、GitHub 兜底；
  应用内可一键检查 / 下载 / 重启安装新版本。
- **GitHub Actions 多平台自动发布**：tag（`v*`）推送触发 CI 自动完成质量门禁
  （vitest 单测 + TypeScript 类型检查 + 前端构建 + Rust 测试）与三平台构建
  （macOS Apple Silicon / macOS Intel / Windows x64），自动创建 GitHub Release
  并重组更新器清单 latest.json；随后自动同步 Gitee Release（国内下载源）并维护
  Gitee 常驻 latest 更新检查端点；提供手动重跑与本地补传大附件入口。

### Changed
- **依赖与构建链全面升级**：React 19、TypeScript 7（原生编译器）、Vite 8（Rolldown 内核）、
  Vitest 5、Zustand 5、diff 9、lucide-react 1.x、CodeMirror 6 全系最新、Tauri 2.12；
  Rust 侧 git2 0.21、dirs 7 并全量 `cargo update`。npm 依赖零过时。
- **移除未使用的 Tailwind CSS**：全项目无任何 Tailwind 工具类（样式走内联 style + CSS 变量），
  移除 tailwindcss / postcss / autoprefixer 依赖与配置；原由 Tailwind preflight 提供的
  全局重置（box-sizing、元素归一等）已以内联等价规则自持，渲染效果不变。
- **CI Actions 升级**：checkout v7 / setup-node v7 / upload-artifact v7 / tauri-action v1，
  Linux runner 升级 ubuntu-24.04，消除 Node.js 20 弃用警告。
- **应用更名「圣手编辑器」**：并入「圣手」系列本地工具（与圣手码头、圣手捕影同系列），
  品牌分层命名——用户可见名「圣手编辑器」、包内可执行名 `ShengShouBianJiQi`、
  identifier `com.cherish.shengshoubianjiqi`。
- **全新系列笔尖图标**：应用图标更换为圣手系列统一的笔尖视觉
  （macOS `.icns`、Windows `.ico` 全套尺寸同步更新）。

[0.2.0]: https://github.com/cherish-zp/shengShouNotPadPro/releases/tag/v0.2.0
