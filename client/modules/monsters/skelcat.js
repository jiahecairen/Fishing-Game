// ===== 怪物：骷髅水手 =====
// 出没：副本「海盗湾·独眼喵的宝窟」、事件：幽灵船
'use strict';

CF.monster('skelcat', {
  name: "骷髅水手",
  skill: { name: "骨头回旋镖", mult: 1.6, every: 3 },
  check: "* 它的帽子比它的骨头还旧。",
  drop: ["mapPiece",0.12],        // 掉落宝藏 [id, 概率]
  mats: ["piratecoin",0.35,1],   // 掉落素材 [素材, 概率, 数量]
  sprite: {
    mirror: true,
    pal: { b: "#ece6d4", B: "#bdb59c", n: "#2a2a35", c: "#7fe7ff", r: "#8e2430", k: SPR_K },
    rows: [
      ".b......",
      ".bb.....",
      ".bbbbbbb",
      ".bbbbbbb",
      ".bnnbbbb",
      ".bncbbbb",
      ".bbbbbbb",
      "..bbbbBb",
      "..bkbkbk",
      "...bbbbb",
      "..rrrrrr",
      ".b.Bbbbb",
      "b..b.bBb",
      "...bbbbb",
      "...b..b.",
      "..bb..bb",
    ],
  },
});
