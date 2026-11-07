// ===== 怪物：企鹅暴徒 =====
// 出没：副本「冰晶迷宫」
'use strict';

CF.monster('peng', {
  name: "企鹅暴徒",
  skill: { name: "腹部滑行", mult: 1.7, every: 3 },
  check: "* 它戴着领结，但很不礼貌。",
  mats: ["icecore",0.12,1],   // 掉落素材 [素材, 概率, 数量]
  sprite: {
    mirror: true,
    pal: { k: "#22252e", w: "#f4f6f8", y: "#f2a93b", r: "#d33a3a", e: "#fff" },
    rows: [
      "....kkkk",
      "...kkkkk",
      "..kkkkkk",
      "..kkekkk",
      "..kkkkyy",
      "..kkkyyy",
      "..kkwwww",
      ".kkwwwrr",
      ".kkwwwwr",
      "kkkwwwww",
      "kk.wwwww",
      "k..wwwww",
      "..kwwwww",
      "...kkwww",
      "...yy...",
      "........",
    ],
  },
});
