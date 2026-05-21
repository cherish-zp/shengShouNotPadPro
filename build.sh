#!/bin/bash
# NovaEdit - 打包构建脚本 (macOS)
set -e

echo "🔨 NovaEdit 构建脚本"
echo "===================="

# 安装依赖
echo "📦 安装依赖..."
npm install

# 构建生产版本
echo ""
echo "🏗️  构建生产版本..."
npx tauri build

echo ""
echo "✅ 构建完成！"
echo ""
echo "应用位置:"
echo "  运行程序: src-tauri/target/release/bundle/macos/NovaEdit.app"
echo "  安装包:   src-tauri/target/release/bundle/dmg/NovaEdit_*.dmg"
echo ""
echo "双击 .dmg 文件即可安装到 Applications"
