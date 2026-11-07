// ===== 怪物：雪精灵 =====
// 出没：副本「冰晶迷宫」
'use strict';

CF.monster('sprite', {
  name: "雪精灵",
  skill: { name: "冰锥", mult: 1.6, every: 3 },
  check: "* 它在你耳边轻轻地吹冷气。",
  mats: ["stardust",0.25,1],   // 掉落素材 [素材, 概率, 数量]
  sprite: {
    mirror: true,
    pal: { w: "#ffffff", c: "#bfe8ff", C: "#8fc8f0", k: SPR_K, b: "#6fa8dc" },
    rows: [
      "......c.",
      ".....ccc",
      "..c...c.",
      ".ccc.www",
      "..c.wwww",
      "...wwwww",
      "..wwkwww",
      "..wwkwww",
      "..wwwwbb",
      "...wwwww",
      "..c.wwww",
      ".ccc.www",
      "..c..www",
      "......ww",
      ".......w",
      "........",
    ],
  },
});
