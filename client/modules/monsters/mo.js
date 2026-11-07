// ===== 怪物：深渊之主·墨 =====
// 出没：副本「沉没王座」的 Boss
'use strict';

CF.monster('mo', {
  name: "深渊之主·墨",
  boss: true,
  final: true,
  skill: { name: "深渊潮汐", mult: 1.9, every: 3 },
  check: "* 一只非常、非常孤独的大鱼。",
  mats: ["whalebone",1,5],   // 掉落素材 [素材, 概率, 数量]
  mercy: { at: 0.15, story: 'mercy_abyss' },   // 血量低于 15% 时可以选择饶恕
  sprite: {
    mirror: true,
    pal: { n: "#2b3a67", N: "#1b2547", l: "#6f86c9", w: "#cfd8f5", k: SPR_K, e: "#ffd54a", t: "#8fd3ff" },
    rows: [
      "............",
      "....nnnnnnnn",
      "..nnnnnnnnnn",
      ".nnnnlnnnnnn",
      ".nnnlnnnnnnn",
      "nnnnnnnnnnnn",
      "nneeennnnnnn",
      "nnekennnnnnn",
      "nneeennnnnnn",
      "nnntnnnnnnnn",
      "nnntnnnnnnnn",
      "nnnnnnnnnnnn",
      "nwwwwwwwwwww",
      "nnwnwnwnwnwn",
      "nnwwwwwwwwww",
      "nnnwnwnwnwnw",
      ".nnwwwwwwwww",
      "N.nnnwwwwwww",
      "NN.nnnnnnnnn",
      "NNN.nnnnnnnn",
      "NN...nnnnnnn",
      "N.....nnnnnn",
      "........nnnn",
      "............",
    ],
  },
});
