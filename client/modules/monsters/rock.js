// ===== 怪物：苔藓石头人 =====
// 出没：副本「瀑布后的洞穴」
'use strict';

CF.monster('rock', {
  name: "苔藓石头人",
  skill: { name: "落石", mult: 1.7, every: 4 },
  check: "* 它的梦想是成为一块鹅卵石。",
  mats: ["turtleshell",0.3,1],   // 掉落素材 [素材, 概率, 数量]
  sprite: {
    mirror: true,
    pal: { s: "#8d8a80", S: "#6b675e", m: "#6aa84f", M: "#4a8a3a", k: SPR_K, y: "#ffd54a" },
    rows: [
      "........",
      "....mmmm",
      "...mMsmm",
      "..smmsss",
      "..ssssss",
      ".sssssss",
      ".ssyksss",
      ".sskksss",
      ".sssssss",
      ".ssssskk",
      ".ssSssss",
      "ssssssss",
      "sSssssSs",
      "ssssssss",
      ".sss..ss",
      ".SSS..SS",
    ],
  },
});
