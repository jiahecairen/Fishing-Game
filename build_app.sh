#!/bin/bash
# 小猫钓鱼 · 一键打包为 macOS App
# 用法：在终端里运行  ./build_app.sh   （或右键 → 打开方式 → 终端）
set -e
cd "$(dirname "$0")"

if ! command -v swiftc >/dev/null 2>&1; then
  echo "❌ 没有找到 swiftc。请先安装 Xcode 命令行工具："
  echo "   xcode-select --install"
  exit 1
fi

APP="build/小猫钓鱼.app"
echo "🐱 正在打包 $APP ..."
rm -rf "$APP"
mkdir -p "$APP/Contents/MacOS" "$APP/Contents/Resources"
cp macos/Info.plist "$APP/Contents/Info.plist"
cp -R web "$APP/Contents/Resources/web"

# 编译原生外壳
swiftc -O -swift-version 5 macos/main.swift \
  -o "$APP/Contents/MacOS/CatFishing" \
  -framework Cocoa -framework WebKit

# 生成图标
if [ -f macos/icon_1024.png ] && command -v iconutil >/dev/null 2>&1; then
  ICONSET="build/AppIcon.iconset"
  rm -rf "$ICONSET"; mkdir -p "$ICONSET"
  for s in 16 32 128 256 512; do
    sips -z $s $s macos/icon_1024.png --out "$ICONSET/icon_${s}x${s}.png" >/dev/null
    d=$((s*2)); sips -z $d $d macos/icon_1024.png --out "$ICONSET/icon_${s}x${s}@2x.png" >/dev/null
  done
  iconutil -c icns "$ICONSET" -o "$APP/Contents/Resources/AppIcon.icns"
  rm -rf "$ICONSET"
fi

# 本地临时签名，避免“已损坏”提示
codesign --force --deep --sign - "$APP" >/dev/null 2>&1 || true
xattr -cr "$APP" 2>/dev/null || true

echo "✅ 完成！App 位于：$(pwd)/$APP"
echo "   可以把它拖进「应用程序」文件夹。"
open -R "$APP" 2>/dev/null || true
