// ===== 怪物：章鱼教授 =====
// 出没：副本「螃蟹岛·潮汐洞窟」
'use strict';

CF.monster('octo', {
  name: "章鱼教授",
  skill: { name: "八爪讲座", mult: 1.6, every: 3 },
  check: "* 它在给你上关于墨汁的课。",
  mats: ["pearl",0.3,1],   // 掉落素材 [素材, 概率, 数量]
  sprite: {
    mirror: true,
    pal: { o: "#c76ad0", O: "#9a45a3", l: "#e7a6ec", g: "#e8d9a0", w: "#fff", k: SPR_K },
    rows: [
      "....oooo",
      "...ooooo",
      "..oooooo",
      "..oolooo",
      "..oooooo",
      ".oogggoo",
      ".oogwkgo",
      ".oogggoo",
      ".ooooooo",
      "..oooOoo",
      ".o.oo.oo",
      "o.o.o.o.",
      "o.o.o..o",
      ".o..o.o.",
      "o..o..o.",
      "........",
    ],
  },
});
