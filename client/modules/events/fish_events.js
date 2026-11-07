// ===== 突发事件 · 钓鱼中的事件 =====
'use strict';

// 海鸥叼走一条鱼
function gullSteal() {
  const S = Game.S, fish = S.bag.filter(x => !FISH_BY_ID[x.id].treasure);
  if (!fish.length) return '海鸥扑了个空。';
  const f = fish[Math.floor(Math.random() * fish.length)];
  S.bag.splice(S.bag.indexOf(f), 1);
  return `海鸥叼走了一条${FISH_BY_ID[f.id].name}！`;
}

[
  { id: 'frenzy', where: 'fish', w: 10, icon: 'frenzy', color: '#4fc3f7', title: '鱼群来了！', text: '码头下面的水突然翻腾起来，一大群鱼游了过来！',
    choices: [{ t: '好耶！', def: true, fn: () => { Game.S.buffs.frenzyUntil = Date.now() + 90000; return '接下来 90 秒，上钩速度翻倍！'; } }] },
  { id: 'merchant', where: 'fish', w: 8, icon: 'merchant', color: '#ffb74d', title: '流浪商人·喵喵', who: 'merchant',
    setup: ctx => {
      const t = Game.progressTier();
      const offers = [
        { name: '秘制猫薄荷饵 ×10', price: 1500, give: () => { Game.S.baits.catnip = (Game.S.baits.catnip || 0) + 10; } },
        { name: '钥匙 ×2', price: 1600, give: () => { Game.S.treasure.key += 2; } },
        { name: '幸运猫铃 ×2', price: 700, give: () => { Game.S.items.luckbell = (Game.S.items.luckbell || 0) + 2; } },
        { name: `神秘装备（T${t}）`, price: Math.round(500 * t * t), give: () => { const g = Hero.newGear(t, 2); Hero.addGear(g); return gearName(g); } },
        { name: `${FISH_BY_ID[Treasure.sceneChest()].name} + 钥匙`, price: 900 * t, give: () => { Game.S.treasure[Treasure.sceneChest()]++; Game.S.treasure.key++; } },
      ];
      ctx.offer = offers[Math.floor(Math.random() * offers.length)];
      ctx.text = `“喵～好东西便宜卖！”\n商人掏出了【${ctx.offer.name}】，只要 🪙${fmtFull(ctx.offer.price)}。`;
    },
    choices: [
      { t: ctx => `买下（🪙${fmtFull(ctx.offer.price)}）`, fn: ctx => { if (!Game.pay(ctx.offer.price)) return '金币不够……商人遗憾地走了。'; const n = ctx.offer.give(); return `买到了【${n || ctx.offer.name}】！`; } },
      { t: '不用了', def: true, fn: () => '商人耸耸肩，背着大包走远了。' },
    ] },
  { id: 'paofood', where: 'fish', w: 7, icon: 'fishbone', color: '#ff8a3d', title: '泡泡饿了', who: 'pao',
    cond: S => (S.flags.paoFed || 0) < 7 && cheapestFish(), text: '“小橘……我、我有点饿。可以分我一条小鱼吗？”',
    choices: [
      { t: '喂它一条鱼', fn: () => {
        const S = Game.S, f = cheapestFish(); if (!f) return '背包里没有鱼了。';
        S.bag.splice(S.bag.indexOf(f), 1); S.flags.paoFed = (S.flags.paoFed || 0) + 1;
        if (S.flags.paoFed >= 7 && !Hero.ownsUnique('u_scale')) { Hero.giveUnique('u_scale', true); Story.run('paoScale'); return '泡泡吃完，认真地看着你……'; }
        return ['“嗝～谢谢！”', '“你是世界上最好的猫！”', '“这条有点咸……不过我原谅你。”', '“你知道吗，奶奶以前也这样喂我。”', '“再一条，就一条！”', '“我会记住这条鱼的。”'][S.flags.paoFed % 6];
      } },
      { t: '下次吧', def: true, fn: () => '“哼。”泡泡吐了个泡泡。' },
    ] },
  { id: 'gull', where: 'fish', w: 8, icon: 'gull', color: '#eceff1', title: '海鸥小偷！', cond: S => S.bag.some(x => !FISH_BY_ID[x.id].treasure),
    text: '一只海鸥盯上了你的水桶，正准备俯冲下来！',
    choices: [
      { t: '赶走它！', fn: () => { if (Math.random() < 0.75) { const c = Math.round(rand(20, 80) * Game.progressTier()); Game.addCoins(c); return `海鸥被吓跑了，还掉下了一枚亮晶晶的硬币（🪙${c}）。`; } return gullSteal(); } },
      { t: '算了', def: true, fn: () => gullSteal() },
    ] },
  { id: 'bottle', where: 'fish', w: 7, icon: 'bottle', color: '#80deea', title: '漂流瓶', text: '一只漂流瓶晃晃悠悠地漂到了码头边。',
    choices: [{ t: '捞起来打开', def: true, fn: () => {
      const S = Game.S, t = Game.progressTier();
      if ((S.flags.letters || 0) < 3 && Math.random() < 0.4) { S.flags.letters = (S.flags.letters || 0) + 1; Story.run('letter' + S.flags.letters); return '里面是一封很旧的信。'; }
      const r = Math.random();
      if (r < 0.1) { Treasure.gain('mapPiece', true); return '里面是一片破旧的【海盗地图碎片】！'; }
      if (r < 0.35) { S.treasure.key++; return '里面有一把【钥匙】！'; }
      const c = Math.round(rand(150, 600) * t); Game.addCoins(c); return `里面塞满了金币！🪙${c}`;
    } }] },
  { id: 'lakemon', where: 'fish', w: 5, icon: 'monster', spr: 'lakemon', color: '#81c784', title: '水怪浮现！', text: '码头下的水面鼓起一个大包……一只水怪探出了头！',
    cond: () => !Battle.battle,
    choices: [
      { t: '战斗！', fn: () => {
        const lv = regionLv() + 2;
        Battle.fight('lakemon', lv, { where: 'event', tier: Game.progressTier(), onWin: () => { const id = Treasure.sceneChest(); Game.S.treasure[id]++; Game.toast(`水怪逃走时留下了一个${FISH_BY_ID[id].name}！`, 'good'); } });
        return '小橘拔出了武器！';
      } },
      { t: '躲开', def: true, fn: () => '水怪打了个哈欠，又沉了下去。' },
    ] },
  { id: 'meteor', where: 'fish', w: 6, icon: 'meteor', color: '#fff59d', title: '流星！', cond: S => Game.phase() === 'night' && ['sunny', 'cloudy'].includes(S.weather),
    text: '一颗流星划过夜空，拖着长长的尾巴。',
    choices: [{ t: '许个愿', def: true, fn: () => {
      const S = Game.S; S.buffs.luckUntil = Math.max(Date.now(), S.buffs.luckUntil || 0) + 5 * 60000;
      if (!Hero.ownsUnique('u_moon') && Math.random() < 0.1) { Hero.giveUnique('u_moon', true); Story.run('meteorBoots'); return '愿望……好像被听见了！'; }
      S.mats.stardust = (S.mats.stardust || 0) + 1;
      return '你许了一个愿。幸运 +30%（5 分钟），还捡到了一粒星尘。';
    } }] },
  { id: 'rainbow', where: 'fish', w: 4, icon: 'rainbow', color: '#f48fb1', title: '彩虹', cond: S => S.weather === 'sunny' && Game.phase() === 'day', text: '远处出现了一道彩虹。泡泡看呆了。',
    choices: [{ t: '静静地看一会儿', def: true, fn: () => { Game.gainExp(40 * Game.progressTier()); return `心情变好了。经验 +${40 * Game.progressTier()}`; } }] },
  { id: 'oldcat', where: 'fish', w: 3, icon: 'oldcat', color: '#b39ddb', title: '神秘老猫', who: 'oldcat', cond: S => [1, 2, 3, 4, 5].some(i => !S.story.seen['oldcat' + i]),
    text: '一只披着斗篷的老猫坐在了你旁边。“想听个故事吗？”',
    choices: [
      { t: '听他说', def: true, fn: () => { const S = Game.S; const i = [1, 2, 3, 4, 5].find(k => !S.story.seen['oldcat' + k]); Story.run('oldcat' + i); return '老猫说完，就消失在了雾里。'; } },
      { t: '我在忙', fn: () => '老猫笑了笑，走了。' },
    ] },

].forEach(e => CF.content.define('event', e.id, e));
