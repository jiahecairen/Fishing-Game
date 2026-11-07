// ===== 怪物：大王乌贼 =====
// 出没：航线 落日海湾→珊瑚礁、航线 落日海湾→冰封雪湖、航线 冰封雪湖→深渊之岛、冰封雪湖的寻宝/摆渡、深渊之岛的寻宝/摆渡
'use strict';

CF.monster('squidm', {
  name: "大王乌贼",
  skill: { name: "喷墨", mult: 1.8, every: 3 },
  check: "* 八只手……不，是十只。",
  mats: ["oldwood",0.25,1],   // 掉落素材 [素材, 概率, 数量]
  sprite: {
    mirror: true,
    pal: { p: "#e86a8a", P: "#b84466", l: "#f8b8c8", w: "#fff", k: SPR_K },
    rows: [
      "......pp",
      ".....ppp",
      "....pppp",
      "...ppPpp",
      "...plppp",
      "..pppppp",
      "..ppwkpp",
      "..ppkkpp",
      "..pppppp",
      "...ppppp",
      "..p.pp.p",
      ".p.pp.pp",
      ".p.p..p.",
      "p..p.p..",
      "p.p..p..",
      ".p...p..",
    ],
  },
});
