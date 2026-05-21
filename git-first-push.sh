#!/bin/bash
# 首次推送到 GitHub - 在你的 Mac 上执行一次
set -e

cd "$(dirname "$0")"

echo "🚀 首次推送 NotPadPro 到 GitHub"
echo "================================="

# 配置 Git 用户信息（如果还没配过）
if [ -z "$(git config user.name)" ]; then
    echo "请输入 Git 用户名:"
    read GIT_USER
    git config user.name "$GIT_USER"
fi
if [ -z "$(git config user.email)" ]; then
    echo "请输入 Git 邮箱:"
    read GIT_EMAIL
    git config user.email "$GIT_EMAIL"
fi

# 添加 remote（如果还没加过）
if ! git remote get-url origin >/dev/null 2>&1; then
    echo "📡 添加 GitHub remote..."
    git remote add origin git@github.com:cherish-zp/NotPadPro.git
else
    echo "✅ Remote 已存在: $(git remote get-url origin)"
fi

# 切换到 main 分支
git branch -M main 2>/dev/null || true

# 添加全部文件
echo "📦 添加全部文件..."
git add -A

# 检查是否有改动
if [ -z "$(git status --porcelain --cached)" ] && [ -n "$(git log -1 2>/dev/null)" ]; then
    echo "⚠️  没有新的改动需要提交，尝试推送已有提交..."
else
    echo "💬 提交..."
    git commit -m "first commit: NotPadPro 初始化版本

- 完整的 Tauri 2.0 + React + TypeScript + CodeMirror 6 编辑器
- 支持便签管理、文件对比、多编码、语法高亮、JSON工具箱等
- 冷白 GitHub 风格界面，全中文
- 自动持久化便签内容到本地，重启不丢
- Cmd+F 搜索高亮跳转，Cmd+S 保存到本地
- 字体大小可缩放（按钮/下拉/滚轮）" 2>&1 || echo "（已经提交过了）"
fi

# 推送
echo "🚀 推送到 GitHub..."
git push -u origin main

echo ""
echo "✅ 首次推送完成！"
echo "🔗 仓库地址: https://github.com/cherish-zp/NotPadPro"
echo ""
echo "📝 以后每次改动后，执行: ./git-auto-push.sh \"你的提交信息\""
