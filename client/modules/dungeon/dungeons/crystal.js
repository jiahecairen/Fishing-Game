// ===== 副本：冰晶迷宫 =====
// 冰层下的迷宫，墙壁会映出你的倒影。
'use strict';

CF.story.chars({"queen":{"name": "冰晶女王", "face": "👸", "spr": "queen", "pitch":620}});

CF.dungeon('crystal', {
  name: "冰晶迷宫",
  desc: "冰层下的迷宫，墙壁会映出你的倒影。",
  region: 'ice',        // 在哪个地点（到过那里、有船才能进）
  floors: 5, lv: [24,29],        // 层数、小怪等级（从第一层到最后一层）
  mons: ["sprite","peng","bear"],
  boss: 'queen', bossLv: 31, tier: 4, gi: 'u_ice',
  style: {"wall": "#294260", "wall2": "#6f9cc4", "floor": "#1a2b40", "torch": "#bdf2ff", "deco": "shard"},
  story: {
    enter: [
      ["narr", "* 冰墙里映出无数个你。每一个都很冷。"],
    ],
    boss: [
      ["queen", "又是一个来打扰我沉睡的家伙。"],
      ["queen", "你可知道，寒冷是唯一不会离开的东西。"],
    ],
    win: [
      ["queen", "……你的爪子，好暖和。"],
      ["queen", "去吧。深渊里的那位，一直在等一只橘色的猫。"],
    ],
  },
});
