// ===== 怪物：海盗猫 =====
// 出没：航线 溪谷急流→落日海湾、航线 落日海湾→珊瑚礁、航线 落日海湾→冰封雪湖、落日海湾的寻宝/摆渡、珊瑚礁的寻宝/摆渡、副本「海盗湾·独眼喵的宝窟」
'use strict';

CF.monster('pirate', {
  name: "海盗猫",
  skill: { name: "抢劫", mult: 1.5, every: 2 },
  check: "* “把小鱼干交出来！”",
  drop: ["mapPiece",0.1],        // 掉落宝藏 [id, 概率]
  mats: ["piratecoin",0.3,1],   // 掉落素材 [素材, 概率, 数量]
  sprite: {
    pal: { r: "#c0392b", R: "#8e2a20", o: "#f0a04b", l: "#ffe0b0", k: SPR_K, w: "#fff", s: "#cfd6de", S: "#8f9aa6", b: "#3b2a1a" },
    rows: [
      "................",
      "...rrrrrrrrrr...",
      "..rrwrrrrrrwrrr.",
      ".rrrrrrrrrrrrrrr",
      ".oo.rrrrrrrr.ooR",
      ".oooooooooooooR.",
      ".okkkoooooowkoo.",
      ".okkkoooooookoo.",
      ".oooooolloooooo.",
      ".ooooollllooooo.",
      "..ooolkllklooo..",
      "...oooooooooo...",
      "..llrrrrrrrrll.s",
      ".ollbbbbbbbbllos",
      ".oollllllllllooS",
      "..oo..oo..oo..b.",
    ],
  },
});
