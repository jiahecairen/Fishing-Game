# 美术素材：小猫像素图集

- `source/cat_sheet.png`：原始精灵表（角色三视图、待机、四方向钓鱼、走/跑/跳、受伤、倒下、场景、道具、UI 小图）
- 游戏实际用的是切好的图集：`client/modules/art/cat.png`（透明背景、所有帧排在一张图里）
- 每一帧在图集里的位置写在 `client/modules/art/cat.js`

## 帧的格式
```js
fishR2: [x, y, 宽, 高, 锚点x, 锚点y, 竿尖x, 竿尖y]
```
- 坐标都是 `cat.png` 里的像素
- 锚点 = 小猫脚底中心，游戏把这个点放在地面上
- 竿尖（只有拿着鱼竿的帧才有）：游戏从这里画鱼线
- `scale`：精灵表里不同排的小猫大小不一样，乘上系数让它们一样大
- `anims`：动画 = 一串帧 + 每秒几帧（`once: true` 播一次就停在最后一帧）

## 换图 / 加动作
1. 用图片软件（Aseprite、Photoshop、Pixelmator……）打开 `cat.png`，把新的帧画进空白处（背景保持透明）
2. 在 `cat.js` 的 `frames` 里加一行，写上位置、大小和锚点
3. 想做成动画就在 `anims` 里加一条
4. 刷新游戏就能看到；在代码里用 `Art.draw(ctx, 'cat', '帧名', x, y, 缩放)` 或 `Art.play(ctx, 'cat', '动画名', 秒数, x, y, 缩放)` 画

想换一整套新角色：仿照 `cat.js` 新建一个图集文件（比如 `npc.js` + `npc.png`），用 `Art.sheet('npc', {...})` 注册，再加到 `client/modules/art/module.js` 的 `files` 里。

关掉 `art` 模块（`client/modules.js` 里注释掉），游戏会自动换回程序画的小猫；设置里的「经典小猫」开关也能临时切换。
