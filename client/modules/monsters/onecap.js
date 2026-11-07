// ===== 怪物：独眼船长·黑胡子喵 =====
// 出没：副本「海盗湾·独眼喵的宝窟」的 Boss
'use strict';

CF.monster('onecap', {
  name: "独眼船长·黑胡子喵",
  boss: true,
  hidden: true,
  skill: { name: "七海连斩", mult: 2, every: 3 },
  check: "* 他的眼罩下面……其实没有受伤。只是觉得帅。",
  unique: ["u_pirhat",0.3],   // 掉落隐藏装备 [id, 概率]
  mats: ["piratecoin",1,6],   // 掉落素材 [素材, 概率, 数量]
  sprite: {
    mirror: true,
    pal: { h: "#2b2b3a", H: "#1a1a26", w: "#f0f0f0", g: "#e0b040", o: "#b0703a", l: "#e8c49a", k: SPR_K, r: "#8e2430", R: "#6a1824" },
    rows: [
      "............",
      "......hhhhhh",
      "....hhhhhhhh",
      "...hhhhhhhww",
      "..hhhhhhhwkw",
      ".hhhhhhhhhww",
      "gggggggggggg",
      "hhhhhhhhhhhh",
      "..oo.ooooooo",
      "..oooooooooo",
      "..oowkoooooo",
      "..ookkoooooo",
      "..oooooollll",
      "...ooollllkk",
      "....oooooooo",
      "...rrrrrrrgg",
      "..rrrrrrrrrr",
      ".rrrrrrrrrrg",
      "rrRrrrrrrrrr",
      "rrRrrrrrrrgg",
      "rrRrrrrrrrrr",
      ".rRrrrrrrrrr",
      "..kkk...kkkk",
      "..kkk.......",
    ],
    patch: [[17,10,"k"],[18,10,"k"],[19,10,"k"],[20,10,"k"],[17,11,"k"],[18,11,"k"],[19,11,"k"],[20,11,"k"],[14,9,"k"],[15,9,"k"],[16,9,"k"],[21,9,"k"],[22,9,"k"]],
  },
});
