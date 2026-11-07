// ===== 副本：螃蟹岛·潮汐洞窟 =====
// 退潮时才会露出的洞窟，螃蟹们在里面列队。
'use strict';

CF.story.chars({"crabgen":{"name": "螃蟹将军", "face": "🦀", "spr": "crabgen", "pitch":420}});

CF.dungeon('tide', {
  name: "螃蟹岛·潮汐洞窟",
  desc: "退潮时才会露出的洞窟，螃蟹们在里面列队。",
  region: 'sea',        // 在哪个地点（到过那里、有船才能进）
  floors: 4, lv: [16,21],        // 层数、小怪等级（从第一层到最后一层）
  mons: ["hermit","jelly","octo"],
  boss: 'crabgen', bossLv: 23, tier: 3, gi: 'u_shell',
  style: {"wall": "#14284a", "wall2": "#244a78", "floor": "#0b1830", "torch": "#6fc3ff", "deco": "bubble"},
  story: {
    enter: [
      ["narr", "* 洞口挂着一块牌子：「螃蟹专用，猫勿入」。"],
      ["pao", "我们……假装是螃蟹？"],
    ],
    boss: [
      ["crabgen", "立正！稍息！本将军镇守此洞已有三年零两个月！"],
      ["crabgen", "我的钳子可是很硬的！来吧！"],
    ],
    win: [
      ["crabgen", "……其实我只是想要一个拥抱。"],
      ["narr", "* 你抱了抱螃蟹将军。"],
      ["narr", "* 有点扎。"],
    ],
  },
});
