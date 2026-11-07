// ===== 副本：梦之湖·花的回忆 =====
// 在梦里，湖面倒映着三十年前的夕阳。
'use strict';

CF.story.chars({"younghua":{"name": "年轻的花", "face": "🐱", "spr": "younghua", "pitch":680}});

CF.dungeon('dream', {
  name: "梦之湖·花的回忆",
  desc: "在梦里，湖面倒映着三十年前的夕阳。",
  region: 'lake',        // 在哪个地点（到过那里、有船才能进）
  floors: 5, lv: [38,44],        // 层数、小怪等级（从第一层到最后一层）
  mons: ["memfish","shadow","ghost"],
  boss: 'younghua', bossLv: 48, tier: 5, gi: 'moon',
  style: {"wall": "#3d2f5c", "wall2": "#c98a6a", "floor": "#241a38", "torch": "#ffd9a0", "deco": "bubble"},
  hidden: true, hint: '当约定被完成，湖神也许会给你托一个梦……', unlock: S => S.hiddenOpen && S.hiddenOpen.dream,
  onClear(c) { if (c.first) c.uniques.push('u_rod'); else if (Math.random() < 0.35) c.uniques.push('u_hat'); },
  story: {
    enter: [
      ["narr", "* 你站在三十年前的码头上。"],
      ["narr", "* 一只年轻的橘猫正在甩竿。"],
    ],
    boss: [
      ["younghua", "你是谁？……为什么你的鱼竿和我的一模一样？"],
      ["younghua", "哦——我明白了。这是梦，对吧？"],
      ["younghua", "那就让我看看，未来的我教出了一只什么样的小猫！"],
    ],
    win: [
      ["younghua", "……好厉害。"],
      ["younghua", "我还以为，我会一个人走到最后。"],
      ["younghua", "原来，会有人替我去。"],
      ["younghua", "这根鱼竿……在梦里送给你也没关系吧？反正，它本来就是你的。"],
      ["narr", "* 你获得了「奶奶的鱼竿」。"],
      ["narr", "* 醒来的时候，枕边有一片带着湖水味道的叶子。"],
    ],
  },
});
