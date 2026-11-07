// ===== 怪物：电电水母 =====
// 出没：副本「螃蟹岛·潮汐洞窟」
'use strict';

CF.monster('jelly', {
  name: "电电水母",
  skill: { name: "放电", mult: 1.8, every: 3 },
  check: "* 噼里啪啦。",
  mats: ["pearl",0.3,1],   // 掉落素材 [素材, 概率, 数量]
  sprite: {
    mirror: true,
    pal: { c: "#7fd3ff", C: "#4fa3e0", y: "#fff176", w: "#fff", k: SPR_K },
    rows: [
      "........",
      "...ccccc",
      "..cccccc",
      ".ccwcccc",
      ".cccCccc",
      "ccckcccc",
      "ccCccccc",
      ".cccCccc",
      ".c.c.c.c",
      ".c.c.c.c",
      "y..c.c.c",
      "...c..c.",
      "..y.c..c",
      "....c...",
      ".y......",
      "........",
    ],
  },
});
