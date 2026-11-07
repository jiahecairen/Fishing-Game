#!/bin/bash
# 双击备份小猫钓鱼的存档：
#   1. 旧版本（v0.4 及以前）Mac App 的本地存档：~/Library/Application Support/CatFishing/
#   2. 服务器上的账号和云存档：server/data/
# 备份放在项目旁边的「小猫钓鱼存档备份」文件夹里，每次一个按时间命名的子文件夹。
cd "$(dirname "$0")"
ROOT="$(pwd)"
OLD="$HOME/Library/Application Support/CatFishing"
DEST="$(dirname "$ROOT")/小猫钓鱼存档备份/$(date +%Y-%m-%d_%H-%M-%S)"
mkdir -p "$DEST"
found=0

if ls "$OLD"/*.json >/dev/null 2>&1; then
  mkdir -p "$DEST/旧版本地存档"
  cp -p "$OLD"/*.json "$DEST/旧版本地存档/"
  echo "✅ 旧版本地存档：$(ls "$OLD"/*.json | xargs -n1 basename | tr '\n' ' ')"
  found=1
else
  echo "·  没有找到旧版本地存档（$OLD）"
fi

if [ -d "$ROOT/server/data" ]; then
  cp -Rp "$ROOT/server/data" "$DEST/服务器存档"
  echo "✅ 服务器存档（账号和云存档）"
  found=1
else
  echo "·  服务器还没有存档（还没启动过新版服务器）"
fi

echo ""
if [ $found = 1 ]; then
  echo "📦 备份完成：$DEST"
  open "$DEST"
else
  rmdir "$DEST" 2>/dev/null
  echo "没有找到需要备份的存档。"
fi
echo ""
read -n 1 -s -r -p "按任意键关闭窗口…"
