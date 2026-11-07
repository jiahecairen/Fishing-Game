// ===== 副本：沉没王座 =====
// 深渊之岛中央，沉在水下的古老宫殿。最深处有什么在等待。
'use strict';

CF.story.chars({"mo":{"name": "墨", "face": "🐋", "spr": "mo", "pitch":140}});

CF.dungeon('abyss', {
  name: "沉没王座",
  desc: "深渊之岛中央，沉在水下的古老宫殿。最深处有什么在等待。",
  region: 'abyss',        // 在哪个地点（到过那里、有船才能进）
  floors: 5, lv: [32,37],        // 层数、小怪等级（从第一层到最后一层）
  mons: ["ghost","puffer","bonef"],
  boss: 'mo', bossLv: 40, tier: 5, gi: 'whale',
  style: {"wall": "#1d1033", "wall2": "#46287a", "floor": "#100820", "torch": "#c58cff", "deco": "bubble"},
  // 墨不会在你离线的时候和你见面：离线时停在 Boss 门口等你回来
  waitForPlayer: true,
  // 第二次来，墨会认出你
  bossIntro(go, offline) {
    if (Story.seen('boss_abyss')) Story.run('again_abyss', go, true);
    else Story.run('boss_abyss', go);
  },
  // 饶恕墨，才能拿到「墨之泪」
  onClear(c) { if (c.spared && !Hero.ownsUnique('u_tear')) c.uniques.push('u_tear'); },
  // 结局：饶恕 / 战斗
  ending(c, show) {
    const S = Game.S;
    S.story.ending = c.spared ? 'spare' : (S.story.ending === 'spare' ? 'spare' : 'fight');
    Story.run(c.spared ? 'end_spare' : 'end_fight', show, true);
    if (c.spared && c.uniques.includes('u_tear')) Story.run('moTear');
  },
  story: {
    enter: [
      ["narr", "* 宫殿的大门自己打开了。"],
      ["narr", "* 好像有谁，一直在等你来。"],
    ],
    boss: [
      ["narr", "* 黑暗中，一只巨大的眼睛睁开了。"],
      ["mo", "…………花？"],
      ["mo", "不……你不是她。但你身上有她的味道。"],
      ["mo", "三十年。她说过，她会回来，和我一起看一次日落。"],
      ["mo", "她骗了我。"],
      ["mo", "所以——我不会再相信任何一只猫了！"],
    ],
  },
});

CF.story.lines({
  moTear: [['mo', '这个……送给你。'], ['mo', '三十年来，我只哭过一次。就是刚才。'], ['narr', '* 你获得了「墨之泪」。']],
  mercy_abyss: [
    ["mo", "为……为什么你不逃？"],
    ["narr", "* 墨的身体在发抖。它已经打不动了。"],
    ["narr", "* 你的口袋里，还装着奶奶的信。"],
    { choice: [["spare","✦ 饶恕，并递出奶奶的信"],["fight","✦ 继续战斗"]] },
  ],
  end_spare: [
    ["narr", "* 你把信递了过去。"],
    ["nana", "墨：对不起，我老了，再也划不动船了。但我会让我的孙女替我来。她会带着最好吃的鱼，陪你看一次日落。——花"],
    ["mo", "……"],
    ["mo", "…………她没有忘记。"],
    ["narr", "* 深渊的天空，第一次出现了橘色的晚霞。"],
    ["mo", "小橘。谢谢你。这片海底的宝藏……送给你吧。那本来就是她想留给你的。"],
    ["mo", "以后……可以常来钓鱼吗？"],
    ["pao", "（小声）我们……是不是做了一件很了不起的事？"],
    ["narr", "* 你充满了决心。"],
    ["narr", "—— 完 ——　感谢游玩《小猫钓鱼》"],
    ["narr", "（你可以继续钓鱼、刷副本、收集全图鉴。墨会一直在深渊等你。）"],
  ],
  end_fight: [
    ["mo", "……果然……猫……都是一样的……"],
    ["narr", "* 墨沉入了更深的黑暗。"],
    ["narr", "* 宝箱底下，压着一封泡烂了的信。"],
    ["nana", "墨：对不起，我老了，再也划不动船了。但我会让我的孙女替我来。她会带着最好吃的鱼，陪你看一次日落。——花"],
    ["narr", "* ……"],
    ["pao", "小橘……我们是不是……做错了什么？"],
    ["narr", "* 也许，你可以再来一次。"],
    ["narr", "（再次挑战沉没王座，可以做出不同的选择。）"],
  ],
  again_abyss: [
    ["mo", "……你又来了。"],
    ["mo", "这一次，你想做什么？"],
  ],
});
