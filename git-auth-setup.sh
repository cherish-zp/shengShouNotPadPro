#!/bin/bash
# GitHub 鉴权配置助手
# 解决 "Password authentication is not supported" 错误

set -e

cd "$(dirname "$0")"

echo "🔐 GitHub 鉴权配置助手"
echo "========================"
echo ""
echo "GitHub 不再支持密码登录，请选择一种方式："
echo ""
echo "  1) SSH（推荐 - 一次配置永久使用）"
echo "  2) Personal Access Token (PAT)"
echo ""
read -p "请选择 (1/2): " CHOICE

case "$CHOICE" in
    1)
        echo ""
        echo "📌 方式 1: 配置 SSH"
        echo "===================="

        # 检查是否已有 SSH key
        if [ -f ~/.ssh/id_ed25519.pub ]; then
            echo "✅ 已存在 SSH key: ~/.ssh/id_ed25519.pub"
            PUBKEY=$(cat ~/.ssh/id_ed25519.pub)
        elif [ -f ~/.ssh/id_rsa.pub ]; then
            echo "✅ 已存在 SSH key: ~/.ssh/id_rsa.pub"
            PUBKEY=$(cat ~/.ssh/id_rsa.pub)
        else
            echo "📝 正在生成新的 SSH key..."
            read -p "输入你的 GitHub 邮箱: " EMAIL
            ssh-keygen -t ed25519 -C "$EMAIL" -f ~/.ssh/id_ed25519 -N ""
            PUBKEY=$(cat ~/.ssh/id_ed25519.pub)
            echo "✅ SSH key 已生成"
        fi

        # 复制公钥到剪贴板
        echo "$PUBKEY" | pbcopy
        echo ""
        echo "📋 SSH 公钥已复制到剪贴板:"
        echo "----------------------------------------"
        echo "$PUBKEY"
        echo "----------------------------------------"
        echo ""
        echo "🌐 接下来请完成 3 步:"
        echo "  1. 打开浏览器访问: https://github.com/settings/ssh/new"
        echo "  2. Title 随便填（如 MacBook），把上面的公钥粘进 Key 输入框"
        echo "  3. 点 Add SSH key"
        echo ""
        read -p "完成后按回车继续..." DUMMY

        # 切换 remote 为 SSH
        echo "🔄 切换 remote 为 SSH..."
        git remote set-url origin git@github.com:cherish-zp/NotPadPro.git
        echo "✅ Remote: $(git remote get-url origin)"

        # 测试连接
        echo "🧪 测试 SSH 连接..."
        ssh -T git@github.com 2>&1 || true

        echo ""
        echo "🚀 推送..."
        git push -u origin main
        ;;

    2)
        echo ""
        echo "📌 方式 2: 配置 Personal Access Token"
        echo "===================================="
        echo ""
        echo "🌐 请完成以下 4 步:"
        echo "  1. 打开: https://github.com/settings/tokens/new"
        echo "  2. Note: 随便填（如 NotPadPro）"
        echo "  3. 勾选 repo 权限"
        echo "  4. 生成 token 并复制（只显示一次！）"
        echo ""
        read -p "粘贴 token: " TOKEN

        # 切换 remote 为带 token 的 HTTPS
        git remote set-url origin "https://cherish-zp:${TOKEN}@github.com/cherish-zp/NotPadPro.git"
        echo "✅ Remote 已配置"

        echo ""
        echo "🚀 推送..."
        git push -u origin main
        ;;

    *)
        echo "❌ 无效选择"
        exit 1
        ;;
esac

echo ""
echo "✅ 推送成功!"
echo "🔗 https://github.com/cherish-zp/NotPadPro"
