// ===== 怪物：寄居蟹兵 =====
// 出没：副本「螃蟹岛·潮汐洞窟」
'use strict';

CF.monster('hermit', {
  name: "寄居蟹兵",
  skill: { name: "贝壳盾击", mult: 1.5, every: 3 },
  check: "* 它的壳是从别的螃蟹那里借来的。",
  mats: ["pearl",0.3,1],   // 掉落素材 [素材, 概率, 数量]
  sprite: {
    mirror: true,
    pal: { s: "#e0a070", S: "#b87a4a", r: "#e05a3a", R: "#a8402a", w: "#fff", k: SPR_K },
    rows: [
      "........",
      "....ssss",
      "...sSSss",
      "..sSsssS",
      "..sSsSsS",
      "..ssSSss",
      "...ssssr",
      "..w.rrrr",
      "..k.rrrr",
      "rr.rrrrr",
      "rrrrrrRr",
      "rR.rrrrr",
      ".r.rRrrr",
      "..r.r.rr",
      "...r.r..",
      "........",
    ],
  },
});
