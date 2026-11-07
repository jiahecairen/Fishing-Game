// ===== 副本：海盗湾·独眼喵的宝窟 =====
// 拼好的地图指向一处被浓雾包围的海湾。
'use strict';

CF.story.chars({"onecap":{"name": "独眼船长", "face": "🏴‍☠️", "spr": "onecap", "pitch":260}});

CF.dungeon('pirate', {
  name: "海盗湾·独眼喵的宝窟",
  desc: "拼好的地图指向一处被浓雾包围的海湾。",
  region: 'sea',        // 在哪个地点（到过那里、有船才能进）
  floors: 4, lv: [25,30],        // 层数、小怪等级（从第一层到最后一层）
  mons: ["pirate","skelcat","parrot"],
  boss: 'onecap', bossLv: 33, tier: 4, gi: 'skull',
  style: {"wall": "#3a2416", "wall2": "#6b4426", "floor": "#1e130b", "torch": "#ffcf6a", "deco": "dust"},
  hidden: true, hint: '传说海盗把地图撕成了三片……', unlock: S => S.hiddenOpen && S.hiddenOpen.pirate,
  onClear(c) { if (c.first) c.uniques.push('u_blade'); },
  story: {
    enter: [
      ["narr", "* 浓雾里传来走调的手风琴声。"],
      ["pao", "这里……有股朗姆酒和咸鱼的味道。"],
    ],
    boss: [
      ["onecap", "哈哈哈！又一只想要我宝藏的小猫！"],
      ["onecap", "你知道我为什么戴眼罩吗？"],
      ["onecap", "……因为帅！来吧！"],
    ],
    win: [
      ["onecap", "好吧好吧，宝藏归你了。"],
      ["onecap", "替我向花问好——当年她可是唯一一个在钓鱼比赛上赢过我的猫。"],
      ["pao", "奶奶到底赢过多少人啊……"],
    ],
  },
});
