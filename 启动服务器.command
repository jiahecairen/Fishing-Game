#!/bin/bash
# 双击启动小猫钓鱼的游戏服务器（关掉这个窗口，服务器就停了）
cd "$(dirname "$0")/server"
if ! command -v node >/dev/null 2>&1; then
  echo "❌ 没有找到 Node.js。"
  echo "   请到 https://nodejs.org 下载安装「LTS」版本（一路点下一步即可），装好后再双击这个文件。"
  read -n 1 -s -r -p "按任意键关闭…"
  exit 1
fi
echo "🐱 正在启动小猫钓鱼服务器……（Node $(node -v)）"
echo "   浏览器打开 http://localhost:28787 也能玩"
echo ""
node index.js
echo ""
read -n 1 -s -r -p "服务器已停止。按任意键关闭窗口…"
