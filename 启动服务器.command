#!/bin/bash
# 双击启动小猫钓鱼的游戏服务器（关掉这个窗口，服务器就停了）
# 后台管理页面里点「重启服务器」时，服务器会以代码 42 退出，这里会自动再启动一次。
cd "$(dirname "$0")/server"
if ! command -v node >/dev/null 2>&1; then
  echo "❌ 没有找到 Node.js。"
  echo "   请到 https://nodejs.org 下载安装「LTS」版本（一路点下一步即可），装好后再双击这个文件。"
  read -n 1 -s -r -p "按任意键关闭…"
  exit 1
fi
echo "🐱 正在启动小猫钓鱼服务器……（Node $(node -v)）"
echo "   游戏：    http://localhost:28787"
echo "   后台管理：http://localhost:28787/admin/"
echo ""
while true; do
  node index.js
  code=$?
  if [ $code -eq 42 ]; then echo ""; echo "↻ 正在重启服务器……"; sleep 1; continue; fi
  break
done
echo ""
read -n 1 -s -r -p "服务器已停止。按任意键关闭窗口…"
