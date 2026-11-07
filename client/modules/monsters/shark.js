// ===== 怪物：饿肚子鲨鱼 =====
// 出没：航线 溪谷急流→落日海湾、航线 落日海湾→珊瑚礁、航线 落日海湾→冰封雪湖、落日海湾的寻宝/摆渡、珊瑚礁的寻宝/摆渡
'use strict';

CF.monster('shark', {
  name: "饿肚子鲨鱼",
  skill: { name: "撕咬", mult: 1.7, every: 3 },
  check: "* 它说它只是想尝一口船。",
  mats: ["oldwood",0.25,1],   // 掉落素材 [素材, 概率, 数量]
  sprite: {
    mirror: true,
    pal: { b: "#5f7f9c", B: "#46627b", w: "#e6eef4", x: "#ffffff", m: "#7a1f2b", k: SPR_K },
    rows: [
      ".......b",
      "......bb",
      ".....bbb",
      "...bbbbb",
      "..bbbbbb",
      ".bkbbbbb",
      "bbbbbbbb",
      "bbmmmmmm",
      "bmxmxmxm",
      "bmmmmmmm",
      "bmxmxmxm",
      "bbmmmmmm",
      ".bwwwwww",
      "..wwwwww",
      "B..wwwww",
      "BB......",
    ],
  },
});
