// ===== 怪物：洞穴蝙蝠 =====
// 出没：副本「瀑布后的洞穴」
'use strict';

CF.monster('bat', {
  name: "洞穴蝙蝠",
  skill: { name: "超声波", mult: 1.5, every: 3 },
  check: "* 它倒挂着和你说话。你听不懂。",
  mats: ["turtleshell",0.3,1],   // 掉落素材 [素材, 概率, 数量]
  sprite: {
    mirror: true,
    pal: { p: "#5a3d6e", P: "#3e2850", m: "#8a6aa0", r: "#ff5252", w: "#fff" },
    rows: [
      "........",
      "........",
      "........",
      ".....p..",
      "p....pp.",
      "pp...ppp",
      "ppp.pppp",
      "pppppprp",
      ".pppmppp",
      "..pmpppw",
      "..p.pppp",
      ".....ppp",
      "......pp",
      ".......p",
      "........",
      "........",
    ],
  },
});
