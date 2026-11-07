// ===== 怪物：冰海豹 =====
// 出没：航线 落日海湾→冰封雪湖、航线 冰封雪湖→深渊之岛、冰封雪湖的寻宝/摆渡
'use strict';

CF.monster('seal', {
  name: "冰海豹",
  skill: { name: "肚皮滑铲", mult: 1.6, every: 3 },
  check: "* 它看起来软软的，但是很重。",
  mats: ["oldwood",0.25,1],   // 掉落素材 [素材, 概率, 数量]
  sprite: {
    mirror: true,
    pal: { a: "#8fa3b5", A: "#6d8193", c: "#dfe8ef", k: SPR_K, w: "#fff", n: "#2a2a35" },
    rows: [
      "........",
      "........",
      "....aaaa",
      "...aaaaa",
      "..aaaaaa",
      "..awkaaa",
      "..akkaaa",
      "..aaaacc",
      "...accnn",
      "...acccc",
      "..aaaaaa",
      ".aaaaacc",
      "aaaaaccc",
      "aAaaaccc",
      "AA.aaacc",
      "A....aaa",
    ],
  },
});
