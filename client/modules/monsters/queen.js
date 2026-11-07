// ===== 怪物：冰晶女王 =====
// 出没：副本「冰晶迷宫」的 Boss
'use strict';

CF.monster('queen', {
  name: "冰晶女王",
  boss: true,
  skill: { name: "永冻之息", mult: 2.1, every: 3 },
  check: "* 她身边的空气都结成了冰。",
  unique: ["u_ice",0.12],   // 掉落隐藏装备 [id, 概率]
  mats: ["icecore",1,3],   // 掉落素材 [素材, 概率, 数量]
  sprite: {
    mirror: true,
    pal: { c: "#bfe8ff", C: "#7fc4f0", w: "#fff", b: "#3a6fa8", B: "#24507f", s: "#e8f4ff", k: SPR_K, p: "#b39ddb" },
    rows: [
      "..........c.",
      ".......c..cc",
      "......cc.ccw",
      "......cccccc",
      ".....bbbbbbb",
      "....bbssssss",
      "....bsssssss",
      "....bsskssss",
      "....bsssssss",
      "....bbsssssp",
      "...bbbbsssss",
      "...bbbcccccc",
      "..cbbcCwCwCw",
      "..cbbbbbbbbb",
      ".bcbbbbbbbbb",
      ".bc.bbbbBbbb",
      "b.c.bbbbBbbb",
      "..c.bbbBbbbb",
      "..c.bbbBbbbb",
      "..cbbbBbbbbb",
      "..cbbBbbbbbb",
      "..bbBbbbbbbb",
      ".bbBbbbbbbbb",
      "CCCCCCCCCCCC",
    ],
  },
});
