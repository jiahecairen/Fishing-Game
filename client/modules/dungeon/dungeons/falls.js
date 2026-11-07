// ===== 副本：瀑布后的洞穴 =====
// 瀑布的水帘后面，藏着一条幽深的通道。
'use strict';

CF.story.chars({"turtle":{"name": "老龟·千年", "face": "🐢", "spr": "turtle", "pitch":180,"slow":true}});

CF.dungeon('falls', {
  name: "瀑布后的洞穴",
  desc: "瀑布的水帘后面，藏着一条幽深的通道。",
  region: 'river',        // 在哪个地点（到过那里、有船才能进）
  floors: 4, lv: [9,13],        // 层数、小怪等级（从第一层到最后一层）
  mons: ["bat","rock","snake"],
  boss: 'turtle', bossLv: 15, tier: 2, gi: 'fountain',
  style: {"wall": "#173236", "wall2": "#2a5257", "floor": "#0e2124", "torch": "#7fe0d8", "deco": "drip"},
  story: {
    enter: [
      ["narr", "* 水帘在身后合上了。四周一片潮湿的黑暗。"],
    ],
    boss: [
      ["turtle", "……"],
      ["turtle", "…………"],
      ["narr", "* （它说话非常、非常慢）"],
      ["turtle", "年轻……的……猫……来……吧……"],
    ],
    win: [
      ["turtle", "很……好……你……让……我……想起……一位……故人……"],
      ["turtle", "她……也是……橘色……的……"],
    ],
  },
});
