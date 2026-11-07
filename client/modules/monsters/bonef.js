// ===== 怪物：骨头鱼 =====
// 出没：副本「沉没王座」
'use strict';

CF.monster('bonef', {
  name: "骨头鱼",
  skill: { name: "鱼刺雨", mult: 1.8, every: 3 },
  check: "* 它已经没有肉了，但还在游。",
  mats: ["whalebone",0.35,1],   // 掉落素材 [素材, 概率, 数量]
  sprite: {
    pal: { b: "#e8e2d0", B: "#b5ad95", r: "#ff5252", k: SPR_K },
    rows: [
      "................",
      "................",
      "..b.............",
      "..bb....bbbbb...",
      "..b.b..bbBbbbb..",
      "...b.bbbbbbrbbb.",
      "..bbbbbbbbbbbbbb",
      "..bb.b.b.b.bbbb.",
      "...b.b.b.b.bBbb.",
      "..bbbbbbbbbbbbbb",
      "..b.b..bbbbbbbb.",
      "..bb....bbbbbb..",
      "..b.............",
      "................",
      "................",
      "................",
    ],
  },
});
