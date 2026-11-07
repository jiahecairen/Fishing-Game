// ===== 怪物：老龟·千年 =====
// 出没：副本「瀑布后的洞穴」的 Boss
'use strict';

CF.monster('turtle', {
  name: "老龟·千年",
  boss: true,
  skill: { name: "缩……壳……撞……", mult: 2, every: 3 },
  check: "* 它……非常……慢……",
  mats: ["turtleshell",1,4],   // 掉落素材 [素材, 概率, 数量]
  sprite: {
    mirror: true,
    pal: { g: "#5b8c4a", G: "#3e6633", h: "#a3c76a", s: "#9bbf7a", S: "#7a9e5e", k: SPR_K, w: "#f4f4f4", y: "#e8e0a0" },
    rows: [
      "............",
      "..........ss",
      ".........sss",
      "........ssss",
      "........ssss",
      "........skss",
      "........ssss",
      "........swww",
      "......ggwwww",
      "....gggggwww",
      "...ggGgggggg",
      "..ggGhGggggg",
      ".gggGhhGgggG",
      ".ggGhhhhGggG",
      "gggGhhhhGGgh",
      "ggGhhhhhhGgh",
      "ggGhhhhhhGhh",
      "gggGhhhhGGgh",
      ".gggGGGGgggg",
      ".ssgggggggss",
      "ssss......ss",
      "sSs.......ss",
      "............",
      "............",
    ],
  },
});
