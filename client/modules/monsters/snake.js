// ===== 怪物：水蛇 =====
// 出没：航线 宁静湖畔→溪谷急流、航线 溪谷急流→竹林幽潭、航线 溪谷急流→落日海湾、溪谷急流的寻宝/摆渡、竹林幽潭的寻宝/摆渡、副本「瀑布后的洞穴」
'use strict';

CF.monster('snake', {
  name: "水蛇",
  skill: { name: "缠绕", mult: 1.6, every: 3 },
  check: "* 嘶嘶嘶……它在试图说服你。",
  mats: ["oldwood",0.2,1],   // 掉落素材 [素材, 概率, 数量]
  sprite: {
    pal: { t: "#3e9e8f", l: "#8fdcc6", y: "#ffe14a", r: "#e53935", k: SPR_K },
    rows: [
      "................",
      "..........ttt...",
      ".........ttttt..",
      ".........tyttyt.",
      ".........ttttt..",
      "..........ttt...",
      "..........r.r...",
      ".........tt.....",
      "........ttt.....",
      ".......tttl.....",
      "...tttttttt.....",
      "..ttllllltttt...",
      ".tttttttttttttt.",
      "tlllllllllllllt.",
      ".tttttttttttttt.",
      "................",
    ],
  },
});
