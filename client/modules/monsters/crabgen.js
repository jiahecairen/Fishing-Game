// ===== 怪物：螃蟹将军 =====
// 出没：副本「螃蟹岛·潮汐洞窟」的 Boss
'use strict';

CF.monster('crabgen', {
  name: "螃蟹将军",
  boss: true,
  skill: { name: "钳之审判", mult: 2, every: 3 },
  check: "* 将军的钳子闪闪发亮。",
  unique: ["u_shell",0.12],   // 掉落隐藏装备 [id, 概率]
  mats: ["pearl",1,4],   // 掉落素材 [素材, 概率, 数量]
  sprite: {
    mirror: true,
    pal: { r: "#e0503a", R: "#a8342a", o: "#ff8a65", y: "#ffd54a", w: "#fff", k: SPR_K, h: "#607d8b", H: "#455a64" },
    rows: [
      "............",
      "..rr........",
      ".rrrr.......",
      "rr..r.......",
      "rr.rr.......",
      ".rrrr...hhhh",
      "..rr...hhhhh",
      "..rr..hhHhhh",
      "..rr....wk..",
      "..rr....r...",
      "..rr..rrrrrr",
      "...rrrrrrrrr",
      "....rrrrrrrr",
      "...rrrrrrryr",
      "...rrrrrrrrr",
      "..rrRrrrrrrr",
      ".rr.rrrrrrrr",
      "rr..rRrrrrrr",
      "r..rr.rRrrrr",
      "..rr..rr.rrR",
      ".rr..rr..rr.",
      ".r..rr..rr..",
      "...r...r....",
      "............",
    ],
  },
});
