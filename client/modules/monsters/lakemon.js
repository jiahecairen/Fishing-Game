// ===== 怪物：水怪 =====
// 出没：钓鱼事件：水怪浮现
'use strict';

CF.monster('lakemon', {
  name: "水怪",
  skill: { name: "巨浪", mult: 1.7, every: 3 },
  check: "* 码头下面一直住着这家伙？！",
  sprite: {
    mirror: true,
    pal: { g: "#3f7d5c", l: "#8fcf9f", w: "#fff", k: SPR_K, b: "#4f8fb0", B: "#3a7090" },
    rows: [
      "....gggg",
      "...ggggg",
      "..gggggg",
      "..gwkggg",
      "..gkkggg",
      "..gggggg",
      "...ggggg",
      "...gwgwg",
      "g..ggggg",
      "gg.ggggg",
      "ggggllll",
      ".gglllll",
      "..glllll",
      "bbbbbbbb",
      "BbbBbbbB",
      "bbbbbbbb",
    ],
  },
});
