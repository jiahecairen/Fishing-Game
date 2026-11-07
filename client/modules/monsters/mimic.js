// ===== 怪物：宝箱怪 =====
// 出没：事件：宝箱？/漂流宝箱
'use strict';

CF.monster('mimic', {
  name: "宝箱怪",
  skill: { name: "大口吞噬", mult: 1.8, every: 3 },
  check: "* 宝箱长出了牙齿！",
  sprite: {
    mirror: true,
    pal: { b: "#8b5e3c", B: "#5e3d24", y: "#e0b040", w: "#fff", r: "#e05a6a", k: SPR_K, e: "#ffeb3b" },
    rows: [
      "........",
      "..bbbbbb",
      ".bBBBBBB",
      ".bbebbbb",
      ".yyyyyyy",
      ".bwbwbwb",
      ".kkkkkkk",
      ".kkkkrrr",
      ".kkkrrrr",
      ".wbwbwbw",
      ".yyyyyyy",
      ".bbbbbyy",
      ".bbbbbbb",
      ".BBBBBBB",
      "..B....B",
      "........",
    ],
  },
});
