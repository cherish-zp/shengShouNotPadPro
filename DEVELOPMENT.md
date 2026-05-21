# 开发规范 (Development Guidelines)

> 本规范适用于 **NotPadPro** 项目所有贡献者，请严格遵守。

---

## 🎯 一、Git 自动提交规范（强制）

### 1.1 每次完成调整后**必须自动提交**

只要对项目做了任何调整（功能开发、Bug 修复、样式调整、文案修改等），完成后**立即执行**：

```bash
./git-auto-push.sh "你的提交信息"
```

或者使用默认时间戳提交信息：

```bash
./git-auto-push.sh
```

### 1.2 提交信息规范

使用 **Conventional Commits** 格式：

| 类型 | 说明 | 示例 |
|------|------|------|
| `feat` | 新功能 | `feat: 添加 JSON 格式化工具` |
| `fix` | 修复 Bug | `fix: 修复 Cmd+S 不弹保存窗口` |
| `style` | 样式调整 | `style: 统一便签栏背景色` |
| `refactor` | 重构 | `refactor: 重写编辑器字体大小逻辑` |
| `perf` | 性能优化 | `perf: 减少编辑器重建次数` |
| `docs` | 文档 | `docs: 更新 README` |
| `chore` | 杂项 | `chore: 升级依赖` |
| `i18n` | 国际化 | `i18n: 工具箱按钮汉化` |

**示例**：

```bash
./git-auto-push.sh "fix: 修复编码切换后文件不变化的问题"
./git-auto-push.sh "feat: 搜索框支持高亮和跳转"
./git-auto-push.sh "style: 整体改为冷白 GitHub 风格"
```

### 1.3 仓库地址

- **GitHub**: `git@github.com:cherish-zp/NotPadPro.git`
- **主分支**: `main`

### 1.4 首次配置（仅需一次）

```bash
git remote add origin git@github.com:cherish-zp/NotPadPro.git
git branch -M main
git push -u origin main
```

---

## 🎨 二、UI/UX 规范

### 2.1 颜色系统

**统一使用 CSS 变量**，禁止硬编码颜色：

```tsx
// ✅ 正确
background: "var(--bg-primary)"
color: "var(--text-secondary)"

// ❌ 错误
background: "#F9FAFB"
color: "#6B7280"
```

**主色板**（冷白 GitHub 风格）：

| 变量 | 用途 | 颜色 |
|------|------|------|
| `--bg-primary` | 主背景 | `#F9FAFB` |
| `--bg-secondary` | 次背景 | `#F3F4F6` |
| `--bg-surface` | 面板背景 | `#E5E7EB` |
| `--bg-hover` | 悬停背景 | `#D1D5DB` |
| `--text-primary` | 主文字 | `#111827` |
| `--text-secondary` | 次文字 | `#6B7280` |
| `--accent` | 强调色 | `#2563EB` |
| `--border` | 边框 | `#D1D5DB` |
| `--success` | 成功 | `#059669` |
| `--error` | 错误 | `#DC2626` |
| `--warning` | 警告 | `#D97706` |

### 2.2 文案规范

**全部使用中文**，禁止英文界面：

```tsx
// ✅ 正确
placeholder="搜索..."
label="保存"

// ❌ 错误
placeholder="Search..."
label="Save"
```

技术名词除外（如 JSON、Base64、Cmd、URL）。

### 2.3 字体规范

- **UI 字体**: 系统字体栈 `-apple-system, BlinkMacSystemFont, ...`
- **代码字体**: `SF Mono, Fira Code, JetBrains Mono, Menlo, Monaco, monospace`
- **字号范围**: 8px - 48px
- **默认字号**: 14px

### 2.4 间距规范

使用 4 的倍数：`2, 4, 6, 8, 10, 12, 16, 20, 24, 32`

### 2.5 圆角规范

- 小元素（按钮、输入框）: `4-6px`
- 卡片/面板: `8px`
- 模态框: `12px`

---

## 🏗 三、代码规范

### 3.1 文件命名

- React 组件: `PascalCase.tsx` (如 `TabItem.tsx`)
- Hook: `camelCase.ts` 以 `use` 开头 (如 `useKeyboard.ts`)
- 工具函数: `camelCase.ts` (如 `formatters.ts`)
- Store: `camelCase.ts` 以 `Store` 结尾 (如 `tabStore.ts`)
- Rust: `snake_case.rs` (如 `file_ops.rs`)

### 3.2 组件规范

```tsx
// ✅ 推荐结构
import React, { useState } from "react";
import { useTabStore } from "@/store/tabStore";

interface MyComponentProps {
  tabId: string;
}

export default function MyComponent({ tabId }: MyComponentProps) {
  const tab = useTabStore((s) => s.tabs.find((t) => t.id === tabId));

  if (!tab) return null;

  return <div>...</div>;
}
```

### 3.3 路径别名

使用 `@/` 别名，禁止相对路径深层引用：

```tsx
// ✅ 正确
import { useTabStore } from "@/store/tabStore";

// ❌ 错误
import { useTabStore } from "../../../store/tabStore";
```

### 3.4 状态管理

- 全局状态用 **Zustand store**
- 组件局部状态用 `useState`
- 跨组件需要持久化的状态加 `localStorage` 同步

### 3.5 Tauri 调用

通过 `useTauri()` Hook 调用，禁止直接调用 `invoke`：

```tsx
// ✅ 正确
const { readFile, writeFile } = useTauri();
await readFile(path, "UTF-8");

// ❌ 错误
import { invoke } from "@tauri-apps/api/core";
await invoke("read_file", { path, encoding: "UTF-8" });
```

---

## 🔒 四、安全和性能规范

### 4.1 文件操作

- **永远不要**在保存时弹窗（除用户主动 Cmd+S）
- 便签内容**必须自动持久化**到本地存储
- 大文件读取使用流式处理

### 4.2 编辑器性能

- CodeEditor **只创建一次**，配置变化通过 CodeMirror compartment 或外层 CSS 实现
- 字体大小通过外层 `style.fontSize` 传递，CodeMirror 内部用 `inherit`
- 搜索使用 EditorView 原生 `selection` 和 `scrollIntoView`

### 4.3 状态更新

- 避免在 useEffect 中无依赖地重建编辑器
- 使用 `useMemo` / `useCallback` 缓存昂贵计算

---

## 📝 五、提交流程总结

每次开发完一个功能/修复一个 Bug，**严格执行**：

```bash
# 1. 检查改动
git status

# 2. 一键提交并推送（带描述）
./git-auto-push.sh "fix: 修复 XXX 问题"

# 或者快速提交（自动时间戳）
./git-auto-push.sh
```

**不允许**：
- ❌ 留着未提交的改动跨天
- ❌ 提交时使用英文命名（如 `update`、`fix bug`）
- ❌ 一次提交包含多个不相关的改动

**推荐**：
- ✅ 小步快跑，每完成一个独立改动就提交
- ✅ 提交信息清晰具体，能让人一眼看懂改了什么
- ✅ 修 Bug 时提交信息描述「修了什么问题」而不是「改了什么代码」

---

## 🚀 六、发布流程

1. 完成所有功能开发，全部提交到 main
2. 执行 `./build.sh` 打包成 `.dmg`
3. 在 GitHub Releases 发布新版本，附上 `.dmg` 安装包

---

*本规范持续更新，所有贡献者必须遵守*
