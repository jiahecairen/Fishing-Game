# 小猫漂流 · Nintendo 3DS MVP

这是第一个 3DS 原生垂直切片：

- 上屏显示猫、地点、航行和电量状态
- 下屏显示卫星地图、BB 机消息和操作说明
- A：前往旧科研站
- B：观察卫星
- X：停留、钓鱼并节省电量
- Y：经过一天
- START：退出

## 构建

项目的 `Makefile` 默认使用 `/opt/devkitpro`，不依赖 shell 中的环境变量：

```sh
cd 3ds
make
```

成功后会生成：

```text
3ds/cat-drift.3dsx
```

将 `.3dsx` 放到 3DS SD 卡的 `3ds/` 目录即可通过 Homebrew Launcher 启动。

## 本机模拟器

本机已安装 Azahar（Apple Silicon 版本）。编译并启动模拟器：

```sh
cd 3ds
make emulator
```

模拟器可以验证双屏布局、按键和游戏逻辑；真实 3DS 仍然需要最后做性能、触摸和设备行为测试。

存档默认写入 SD 卡根目录：`sdmc:/cat-drift-save.txt`。

## 架构约束

- `source/game/` 不依赖 3DS API，未来可移植到桌面和手机。
- `source/main.cpp` 只负责 3DS 输入和双屏显示。
- 后续存档、消息、地图和事件都应继续放在平台无关的核心层。
