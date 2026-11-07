// ===== 怪物：冰原熊 =====
// 出没：副本「冰晶迷宫」
'use strict';

CF.monster('bear', {
  name: "冰原熊",
  skill: { name: "熊抱", mult: 1.9, every: 4 },
  check: "* 它想抱抱你。用力地。",
  mats: ["stardust",0.25,1],   // 掉落素材 [素材, 概率, 数量]
  sprite: {
    mirror: true,
    pal: { w: "#f4f8fb", c: "#d6e2ea", k: SPR_K, n: "#2a2a35" },
    rows: [
      "........",
      "..ww....",
      ".wcww...",
      ".wwwwwww",
      "..wwwwww",
      "..wkwwww",
      "..wkwwww",
      "..wwwwcc",
      "...wwcnn",
      "...wwccc",
      "..wwwwww",
      ".wwwwwww",
      "wwwwwwww",
      "wcwwwwww",
      "ww.wwwww",
      "cc..cccc",
    ],
  },
});
