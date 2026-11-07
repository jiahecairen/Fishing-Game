// ===== 怪物：泥巴蛙 =====
// 出没：航线 宁静湖畔→溪谷急流、航线 溪谷急流→竹林幽潭、宁静湖畔的寻宝/摆渡、竹林幽潭的寻宝/摆渡、副本「芦苇岛·鼠鼠地窖」
'use strict';

CF.monster('frog', {
  name: "泥巴蛙",
  skill: { name: "舌头鞭", mult: 1.4, every: 3 },
  check: "* 呱。它只会说这一个字。",
  mats: ["oldwood",0.15,1],   // 掉落素材 [素材, 概率, 数量]
  sprite: {
    mirror: true,
    pal: { g: "#5aa35a", l: "#9fd67a", y: "#efe7a8", m: "#2d5a2d", w: "#fff", k: SPR_K },
    rows: [
      "........",
      "..www...",
      ".wwkkw..",
      ".wwkkwg.",
      ".gwwwggg",
      "gggggggg",
      "gglggggg",
      "gggggggg",
      "ggmmmmmm",
      ".ggggggg",
      ".gyyyyyy",
      "ggyyyyyy",
      "ggyyyyyy",
      "gggyyyyy",
      "ll.gg.gg",
      "........",
    ],
  },
});
