// ===== 怪物：暴怒刺豚 =====
// 出没：副本「沉没王座」
'use strict';

CF.monster('puffer', {
  name: "暴怒刺豚",
  skill: { name: "膨胀", mult: 1.9, every: 3 },
  check: "* 它越来越大了！",
  mats: ["whalebone",0.3,1],   // 掉落素材 [素材, 概率, 数量]
  sprite: {
    mirror: true,
    pal: { y: "#f2c94c", Y: "#c99a2e", w: "#fff3c4", k: SPR_K, s: "#8a6a20", r: "#c0392b", e: "#fff" },
    rows: [
      "...s....",
      "s..yy.s.",
      ".syyyyys",
      "..yyyyyy",
      ".yyyyyyy",
      "syyekyyy",
      ".yykkyyy",
      "syyyyyyy",
      ".yyyyyrr",
      ".ywwwwww",
      "syywwwww",
      ".yywwwww",
      "..yywwww",
      "s..yyyyy",
      "...s..s.",
      "........",
    ],
  },
});
