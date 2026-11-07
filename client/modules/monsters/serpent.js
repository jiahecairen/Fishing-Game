// ===== 怪物：深海巨蛇 =====
// 出没：航线 冰封雪湖→深渊之岛、深渊之岛的寻宝/摆渡
'use strict';

CF.monster('serpent', {
  name: "深海巨蛇",
  skill: { name: "漩涡", mult: 1.9, every: 3 },
  check: "* 海水开始旋转。",
  mats: ["oldwood",0.3,2],   // 掉落素材 [素材, 概率, 数量]
  sprite: {
    pal: { g: "#2e7d6b", G: "#1e5a4c", y: "#ffd54a", l: "#7fd1b3", r: "#e53935", w: "#fff", k: SPR_K },
    rows: [
      "..........GGG...",
      ".........gggggG.",
      "........ggyggggG",
      "........gggggggg",
      "........gwwgwwg.",
      ".........gggg...",
      "........rr......",
      "..........gg....",
      "...gg.....ggg...",
      "..gglg...gglgg..",
      ".gglggg.gglggg..",
      ".gg.gggggggg.gg.",
      "gg...gglggg...gg",
      "g.....ggggg....g",
      "l......lll.....l",
      "................",
    ],
  },
});
