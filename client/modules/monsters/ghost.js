// ===== 怪物：溺水的幽灵 =====
// 出没：副本「沉没王座」、副本「梦之湖·花的回忆」
'use strict';

CF.monster('ghost', {
  name: "溺水的幽灵",
  skill: { name: "叹息", mult: 1.7, every: 3 },
  check: "* 它在找它丢掉的鱼竿。",
  mats: ["whalebone",0.3,1],   // 掉落素材 [素材, 概率, 数量]
  sprite: {
    mirror: true,
    pal: { g: "#c9d6ff", G: "#9aa8e0", k: SPR_K, b: "#4a5a9a" },
    rows: [
      "........",
      "....gggg",
      "...ggggg",
      "..gggggg",
      "..gggggg",
      "..gkkggg",
      "..gkkggg",
      ".ggggggg",
      ".ggggggb",
      ".gggggbb",
      "gggggggg",
      "gggggggg",
      "gGgggggg",
      "gg.gGggg",
      "g...gg.g",
      "........",
    ],
  },
});
