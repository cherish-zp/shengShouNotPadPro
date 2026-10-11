# 更新日志

本项目所有显著变更将记录于此文件。

格式基于 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.1.0/)，
版本号遵循 [语义化版本 2.0.0](https://semver.org/lang/zh-CN/)。

## [未发布]

### Changed
- CI：`assemble-updater-json` 与 `sync-gitee` 两个 job 的 runner 钉到 ubuntu-24.04
  （ubuntu-latest 将于 2026-10-19 起迁移 Ubuntu 26，避免清单组装环境漂移）。
- Gitee 同步失败的报错改为可操作指引（令牌过期 / 缺 projects 权限时给出具体修复步骤）。
- 本地同步脚本 `sync-gitee-release.sh` 支持从 `~/.gitee-token` 读取令牌（环境变量优先）。
- CI 密钥归一化步骤兼容 Windows runner（stdout 强制 UTF-8，修复中文诊断输出崩溃），
  失败时打印收到内容的长度 / 行数 / 开头，并专门识别「贴成公钥」「读到空值」。

## [0.2.1] - 2026-10-11

### Added
- **界面皮肤「少女粉」🌸**：全新樱花奶油配色（浅色 51 项 token + 「粉夜」深色变体），
  设置 → 外观一键切换；皮肤接管强调色，工具栏/侧栏/弹窗全量换装。
- **编辑器图片背景**：支持选择本地图片作为编辑器背景（遮罩浓度 / 背景模糊可调），
  侧栏自动切换为毛玻璃浮层，设置 → 外观 → 背景图片。
- **更新按钮移至窗口右上角**：Codex 风格圆形状态按钮——待检 / 检查中旋转 /
  发现新版本脉动高亮 / 下载中显示进度 / 失败标红，点击即检查。
- **更新错误提示中文化**：updater 原始报错按类型转译（暂无新版本 / 网络失败 /
  签名校验失败 / 权限不足），不再向用户暴露英文原文。

### Fixed
- 应用内更新链路端到端验证通过（本地签名清单实测：检查 → 下载 → 校验 → 安装 → 重启）。

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

### Added（0.2.0 期间）
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

[0.2.1]: https://github.com/cherish-zp/shengShouNotPadPro/releases/tag/v0.2.1
