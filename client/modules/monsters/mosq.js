// ===== 怪物：蚊子团 =====
// 出没：副本「芦苇岛·鼠鼠地窖」
'use strict';

CF.monster('mosq', {
  name: "蚊子团",
  skill: { name: "嗡嗡嗡", mult: 1.3, every: 2 },
  check: "* 嗡嗡嗡嗡嗡嗡嗡。",
  sprite: {
    mirror: true,
    pal: { g: "#5d4a36", G: "#8a6d4c", w: "#d6ecff", r: "#e53935", k: SPR_K },
    rows: [
      "........",
      ".ww.....",
      "wwww....",
      "wwwww...",
      ".wwwwg..",
      "..wwgGrr",
      "....gGrr",
      ".....ggg",
      "...g..Gk",
      "..g..ggg",
      ".g...ggG",
      "g...gggg",
      "...g..gg",
      "..g....k",
      ".g.....k",
      "........",
    ],
  },
});
