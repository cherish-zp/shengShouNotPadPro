#!/bin/bash
# NovaEdit - 一键启动脚本 (macOS M1/M2/M3)
set -e

echo "🚀 NovaEdit 启动脚本"
echo "===================="

# 检查 Node.js
if ! command -v node &> /dev/null; then
    echo "❌ 未安装 Node.js，请先安装: brew install node"
    exit 1
fi
echo "✅ Node.js $(node --version)"

# 检查 Rust
if ! command -v rustc &> /dev/null; then
    echo "❌ 未安装 Rust，请先安装: curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh"
    exit 1
fi
echo "✅ Rust $(rustc --version | cut -d' ' -f2)"

# 安装前端依赖
echo ""
echo "📦 安装前端依赖..."
npm install

# 启动 Tauri 开发模式
echo ""
echo "🎯 启动 NovaEdit 开发模式..."
echo "   首次启动需要编译 Rust，可能需要 2-3 分钟"
echo ""
npx tauri dev
