#!/bin/bash
# 自动提交 GitHub 脚本
# 用法: ./git-auto-push.sh "你的提交信息"
# 如果不传参数，会自动生成包含时间戳的提交信息

set -e

cd "$(dirname "$0")"

# 检查是否有改动
if [ -z "$(git status --porcelain)" ]; then
    echo "✨ 没有需要提交的改动"
    exit 0
fi

# 提交信息
MSG="${1:-chore: 自动提交于 $(date '+%Y-%m-%d %H:%M:%S')}"

echo "📦 添加所有改动..."
git add -A

echo "💬 提交: $MSG"
git commit -m "$MSG"

echo "🚀 推送到 GitHub..."
if git remote get-url origin >/dev/null 2>&1; then
    # 获取当前分支
    BRANCH=$(git rev-parse --abbrev-ref HEAD)
    git push -u origin "$BRANCH"
    echo "✅ 已推送到 origin/$BRANCH"
else
    echo "⚠️  未设置 remote。先执行:"
    echo "   git remote add origin git@github.com:cherish-zp/NotPadPro.git"
    exit 1
fi
