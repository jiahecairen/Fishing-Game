// ===== 怪物：抢鱼海鸥 =====
// 出没：航线 宁静湖畔→溪谷急流、航线 溪谷急流→竹林幽潭、航线 溪谷急流→落日海湾、宁静湖畔的寻宝/摆渡、溪谷急流的寻宝/摆渡
'use strict';

CF.monster('gull', {
  name: "抢鱼海鸥",
  skill: { name: "俯冲叼鱼", mult: 1.5, every: 3 },
  check: "* 它盯着你的水桶，眼神很不善良。",
  mats: ["oldwood",0.2,1],   // 掉落素材 [素材, 概率, 数量]
  sprite: {
    mirror: true,
    pal: { w: "#f4f6f8", a: "#9aa6b2", A: "#6f7d8a", y: "#f2b33d", k: SPR_K },
    rows: [
      "........",
      "........",
      ".....www",
      "....wwww",
      "A...wkww",
      "Aa..wwww",
      "aaa.wwyy",
      "aaaaawyy",
      ".aaaaawy",
      "..aaaaww",
      "...aawww",
      "....wwww",
      ".....www",
      "......y.",
      ".....yy.",
      "........",
    ],
  },
});
