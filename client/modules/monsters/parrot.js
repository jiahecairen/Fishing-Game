// ===== 怪物：学舌鹦鹉 =====
// 出没：副本「海盗湾·独眼喵的宝窟」
'use strict';

CF.monster('parrot', {
  name: "学舌鹦鹉",
  skill: { name: "“把鱼交出来！”", mult: 1.5, every: 2 },
  check: "* “把鱼交出来！把鱼交出来！”",
  mats: ["piratecoin",0.35,1],   // 掉落素材 [素材, 概率, 数量]
  sprite: {
    pal: { r: "#e53935", y: "#ffd54a", b: "#1e88e5", g: "#6d4c2a", w: "#fff", k: SPR_K, o: "#555a66" },
    rows: [
      "................",
      "......rrr.......",
      ".....rrrrr......",
      "....rrwkrrr.....",
      "....rrkkrrooo...",
      "....rrrrrroo....",
      ".....rrrrr......",
      "....rrrrrr......",
      "...yrrrrrr......",
      "..yyyrrrrr......",
      "..byyyrrrr......",
      "..bbyyrrrr......",
      "...bbyrrr.......",
      "....b.ooo.......",
      "......o.o.......",
      "....gggggggg....",
    ],
  },
});
