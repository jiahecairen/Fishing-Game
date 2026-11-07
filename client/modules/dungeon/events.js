// ===== 副本 · 副本里的事件 =====
'use strict';

[
  { id: 'mimicchest', where: 'dungeon', w: 10, icon: 'mimic', color: '#c08a4a', title: '宝箱？', text: '房间正中央放着一个宝箱。太显眼了，反而让人不安。',
    choices: [
      { t: '打开', def: true, fn: () => {
        if (Math.random() < 0.55) { const D = Game.S.dungeon, def = Dungeon.def(); const c = Math.round(def.lv[1] * rand(30, 60)); Game.addCoins(c); D.loot.coins += c; let m = `是真的宝箱！🪙${c}`; if (Math.random() < 0.5) { const g = Hero.newGear(def.tier, 2); if (Hero.addGear(g, true)) { D.loot.gear++; m += `，还有【${gearName(g)}】`; } } return m; }
        Events.fight('mimic', 2); return '宝箱怪！';
      } },
      { t: '不碰它', fn: () => '你绕开了宝箱。宝箱好像有点失望。' },
    ] },
  { id: 'altar', where: 'dungeon', w: 7, icon: 'altar', color: '#ffd54f', title: '古老的祭坛', setup: ctx => { ctx.price = 600 * Dungeon.def().tier; }, text: ctx => `祭坛上刻着：「献上金币者，得到力量。」（🪙${fmtFull(ctx.price)}）`,
    choices: [
      { t: '献上金币', fn: ctx => { if (!Game.pay(ctx.price)) return '金币不够……祭坛没有反应。'; Game.S.dungeon.buff = 0.25; return '一股力量涌了上来！本次副本攻击 +25%。'; } },
      { t: '离开', def: true, fn: () => '你没有理会祭坛。' },
    ] },
  { id: 'kitten', where: 'dungeon', w: 7, icon: 'paw', color: '#ffcc80', title: '被困的小猫', text: '一只小猫被困在了落石下面，正可怜地叫着。',
    choices: [
      { t: '救它出来', def: true, fn: () => { const d = hurt(0.1); Game.S.treasure.key++; const c = Math.round(rand(100, 400) * Game.progressTier()); Game.addCoins(c); return `搬石头时受了点伤（HP -${d}）。小猫送了你一把钥匙和 🪙${c}，“谢谢哥哥/姐姐！”`; } },
      { t: '离开', fn: () => '小猫的叫声在身后回荡……' },
    ] },
  { id: 'trap', where: 'dungeon', w: 7, icon: 'trap', color: '#ef9a9a', title: '陷阱！', text: '咔哒一声，你踩到了什么东西。',
    choices: [{ t: '糟了！', def: true, fn: () => { const st = Hero.stats(); if (Math.random() < Math.min(0.6, st.spd / 60)) return '小橘敏捷地跳开了！'; return `飞出了一排尖刺！HP -${hurt(0.12)}`; } }] },
  { id: 'dmerchant', where: 'dungeon', w: 6, icon: 'merchant', color: '#ffb74d', title: '地下商人', setup: ctx => { ctx.price = 250 * Dungeon.def().tier; }, text: ctx => `“探险辛苦啦，要来点鱼干吗？”3 条烤鱼只要 🪙${fmtFull(ctx.price)}。`,
    choices: [
      { t: '买下', fn: ctx => { if (!Game.pay(ctx.price)) return '金币不够。'; const S = Game.S; for (let i = 0; i < 3; i++) Inv.put({ uid: Game.nextUid(), id: 'carp', size: 60, value: 16 }); return '获得了 3 条烤鲤鱼（口粮）。'; } },
      { t: '不用了', def: true, fn: () => '商人缩回了阴影里。' },
    ] },
  { id: 'statue', where: 'dungeon', w: 5, icon: 'cat', color: '#b0bec5', title: '猫神像', text: '一座猫的石像，表情有点得意。',
    choices: [{ t: '摸摸它的头', def: true, fn: () => {
      const r = Math.random();
      if (r < 0.4) { const h = Hero.heal(Hero.stats().maxHp * 0.5); return `石像的眼睛亮了一下。HP +${h}`; }
      if (r < 0.7) { const e = 30 * Game.progressTier(); Game.gainExp(e); return `你觉得自己变聪明了。经验 +${e}`; }
      return '什么也没发生。石像好像在笑你。';
    } }] },
].forEach(e => CF.content.define('event', e.id, e));
