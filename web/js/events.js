// ===== 突发事件：钓鱼、航行、副本中的随机事件 =====
'use strict';

function regionLv() { const r = REGION_LV[Game.S.scene] || [3, 6]; return Math.round((r[0] + r[1]) / 2); }
function cheapestFish(fromBag) {
  const arr = Game.S.bag.filter(x => !FISH_BY_ID[x.id].treasure && FISH_BY_ID[x.id].rarity !== 'junk');
  return arr.sort((a, b) => a.value - b.value)[0];
}
function hurt(pct) {
  const S = Game.S, st = Adv.stats();
  const k = S.mode === 'voyage' ? 1 - 0.15 * S.boatUps.hull : 1;
  const d = Math.round(st.maxHp * pct * k);
  S.hero.hp = Math.max(1, S.hero.hp - d);
  return d;
}

const EVENT_DEFS = [
  // ===================== 钓鱼 =====================
  { id: 'frenzy', where: 'fish', w: 10, icon: 'frenzy', color: '#4fc3f7', title: '鱼群来了！', text: '码头下面的水突然翻腾起来，一大群鱼游了过来！',
    choices: [{ t: '好耶！', def: true, fn: () => { Game.S.buffs.frenzyUntil = Date.now() + 90000; return '接下来 90 秒，上钩速度翻倍！'; } }] },
  { id: 'merchant', where: 'fish', w: 8, icon: 'merchant', color: '#ffb74d', title: '流浪商人·喵喵', who: 'merchant',
    setup: ctx => {
      const t = Adv.progressTier();
      const offers = [
        { name: '秘制猫薄荷饵 ×10', price: 1500, give: () => { Game.S.baits.catnip = (Game.S.baits.catnip || 0) + 10; } },
        { name: '钥匙 ×2', price: 1600, give: () => { Game.S.treasure.key += 2; } },
        { name: '幸运猫铃 ×2', price: 700, give: () => { Game.S.items.luckbell = (Game.S.items.luckbell || 0) + 2; } },
        { name: `神秘装备（T${t}）`, price: Math.round(500 * t * t), give: () => { const g = Adv.newGear(t, 2); Adv.addGear(g); return gearName(g); } },
        { name: `${FISH_BY_ID[SCENE_CHEST[Game.S.scene] || 'chest_wood'].name} + 钥匙`, price: 900 * t, give: () => { Game.S.treasure[SCENE_CHEST[Game.S.scene] || 'chest_wood']++; Game.S.treasure.key++; } },
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
        if (S.flags.paoFed >= 7 && !Adv.ownsUnique('u_scale')) { Adv.giveUnique('u_scale', true); Adv.story('paoScale'); return '泡泡吃完，认真地看着你……'; }
        return ['“嗝～谢谢！”', '“你是世界上最好的猫！”', '“这条有点咸……不过我原谅你。”', '“你知道吗，奶奶以前也这样喂我。”', '“再一条，就一条！”', '“我会记住这条鱼的。”'][S.flags.paoFed % 6];
      } },
      { t: '下次吧', def: true, fn: () => '“哼。”泡泡吐了个泡泡。' },
    ] },
  { id: 'gull', where: 'fish', w: 8, icon: 'gull', color: '#eceff1', title: '海鸥小偷！', cond: S => S.bag.some(x => !FISH_BY_ID[x.id].treasure),
    text: '一只海鸥盯上了你的水桶，正准备俯冲下来！',
    choices: [
      { t: '赶走它！', fn: () => { if (Math.random() < 0.75) { const c = Math.round(rand(20, 80) * Adv.progressTier()); Game.addCoins(c); return `海鸥被吓跑了，还掉下了一枚亮晶晶的硬币（🪙${c}）。`; } return Events.steal(); } },
      { t: '算了', def: true, fn: () => Events.steal() },
    ] },
  { id: 'bottle', where: 'fish', w: 7, icon: 'bottle', color: '#80deea', title: '漂流瓶', text: '一只漂流瓶晃晃悠悠地漂到了码头边。',
    choices: [{ t: '捞起来打开', def: true, fn: () => {
      const S = Game.S, t = Adv.progressTier();
      if ((S.flags.letters || 0) < 3 && Math.random() < 0.4) { S.flags.letters = (S.flags.letters || 0) + 1; Adv.story('letter' + S.flags.letters); return '里面是一封很旧的信。'; }
      const r = Math.random();
      if (r < 0.1) { S.treasure.mapPiece++; Adv.checkHidden(); return '里面是一片破旧的【海盗地图碎片】！'; }
      if (r < 0.35) { S.treasure.key++; return '里面有一把【钥匙】！'; }
      const c = Math.round(rand(150, 600) * t); Game.addCoins(c); return `里面塞满了金币！🪙${c}`;
    } }] },
  { id: 'lakemon', where: 'fish', w: 5, icon: 'monster', spr: 'lakemon', color: '#81c784', title: '水怪浮现！', text: '码头下的水面鼓起一个大包……一只水怪探出了头！',
    cond: () => !Adv.battle,
    choices: [
      { t: '战斗！', fn: () => {
        const lv = regionLv() + 2;
        Adv.eventBattle('lakemon', lv, () => { const id = SCENE_CHEST[Game.S.scene] || 'chest_wood'; Game.S.treasure[id]++; Game.toast(`水怪逃走时留下了一个${FISH_BY_ID[id].name}！`, 'good'); });
        return '小橘拔出了武器！';
      } },
      { t: '躲开', def: true, fn: () => '水怪打了个哈欠，又沉了下去。' },
    ] },
  { id: 'meteor', where: 'fish', w: 6, icon: 'meteor', color: '#fff59d', title: '流星！', cond: S => Game.phase() === 'night' && ['sunny', 'cloudy'].includes(S.weather),
    text: '一颗流星划过夜空，拖着长长的尾巴。',
    choices: [{ t: '许个愿', def: true, fn: () => {
      const S = Game.S; S.buffs.luckUntil = Math.max(Date.now(), S.buffs.luckUntil || 0) + 5 * 60000;
      if (!Adv.ownsUnique('u_moon') && Math.random() < 0.1) { Adv.giveUnique('u_moon', true); Adv.story('meteorBoots'); return '愿望……好像被听见了！'; }
      S.mats.stardust = (S.mats.stardust || 0) + 1;
      if (Math.random() < 0.2 && Quests.giveClue('q3')) return '流星的碎片里，夹着一张旧星图……';
      return '你许了一个愿。幸运 +30%（5 分钟）。';
    } }] },
  { id: 'rainbow', where: 'fish', w: 4, icon: 'rainbow', color: '#f48fb1', title: '彩虹', cond: S => S.weather === 'sunny' && Game.phase() === 'day', text: '远处出现了一道彩虹。泡泡看呆了。',
    choices: [{ t: '静静地看一会儿', def: true, fn: () => { Game.gainExp(40 * Adv.progressTier()); return `心情变好了。经验 +${40 * Adv.progressTier()}`; } }] },
  { id: 'oldcat', where: 'fish', w: 3, icon: 'oldcat', color: '#b39ddb', title: '神秘老猫', who: 'oldcat', cond: S => [1, 2, 3, 4, 5].some(i => !S.story.seen['oldcat' + i]),
    text: '一只披着斗篷的老猫坐在了你旁边。“想听个故事吗？”',
    choices: [
      { t: '听他说', def: true, fn: () => { const S = Game.S; const i = [1, 2, 3, 4, 5].find(k => !S.story.seen['oldcat' + k]); Adv.story('oldcat' + i); return '老猫说完，就消失在了雾里。'; } },
      { t: '我在忙', fn: () => '老猫笑了笑，走了。' },
    ] },

  // ===================== 航行 =====================
  { id: 'storm', where: 'voyage', w: 10, icon: 'storm', color: '#90a4ae', title: '暴风雨！', text: '乌云压了过来，前方的海面卷起了巨浪。',
    choices: [
      { t: '硬闯过去', fn: () => { Adv.damageBoat(10); return `船剧烈摇晃（耐久 -10），小橘受了 ${hurt(0.18)} 点伤，但没有耽误航程。`; } },
      { t: '绕路', def: true, fn: () => { const v = Game.S.voyage; v.t = Math.max(0, v.t - 25); return '绕了一大圈，多花了一些时间。'; } },
    ] },
  { id: 'driftchest', where: 'voyage', w: 9, icon: 'chest', color: '#c08a4a', title: '漂流宝箱', text: '海面上漂着一个宝箱。看起来……有点可疑？',
    choices: [
      { t: '捞上来', def: true, fn: () => {
        if (Math.random() < 0.7) { const id = ['chest_wood', 'chest_silver', 'chest_gold'][Math.min(2, Math.floor(Adv.progressTier() / 2))]; Game.S.treasure[id]++; return `捞到了一个${FISH_BY_ID[id].name}！`; }
        Events.fight('mimic', 2); return '宝箱张开了满是牙齿的大嘴！';
      } },
      { t: '不管它', fn: () => '宝箱慢慢漂远了。' },
    ] },
  { id: 'siren', where: 'voyage', w: 6, icon: 'siren', color: '#ce93d8', title: '海妖的歌声', text: '远处的礁石上传来了美妙的歌声……',
    choices: [
      { t: '侧耳倾听', fn: () => { const lv = Game.S.voyage.lv[1]; const e = lv * 25; Game.gainExp(e); return `你听得入了迷。经验 +${e}，但头好晕（HP -${hurt(0.25)}）`; } },
      { t: '捂住耳朵', def: true, fn: () => '泡泡在水桶里大声唱歌，盖过了海妖的声音。' },
    ] },
  { id: 'trade', where: 'voyage', w: 7, icon: 'ship', color: '#a1887f', title: '商船', text: '一艘商船和你并排航行。“要不要做笔交易？”',
    choices: [
      { t: '用 8 条鱼换 2 把钥匙', fn: () => { const S = Game.S; const fish = S.bag.filter(x => !FISH_BY_ID[x.id].treasure).sort((a, b) => a.value - b.value); if (fish.length < 8) return '背包里的鱼不够 8 条。'; const set = new Set(fish.slice(0, 8).map(x => x.uid)); S.bag = S.bag.filter(x => !set.has(x.uid)); S.treasure.key += 2; return '成交！获得钥匙 ×2。'; } },
      { t: ctx => `花 🪙${fmtFull(ctx.price)} 买宝箱`, fn: ctx => { if (!Game.pay(ctx.price)) return '金币不够。'; Game.S.treasure.chest_silver++; return '买到了一个白银宝箱！'; } },
      { t: '离开', def: true, fn: () => '商船挥挥手，驶远了。' },
    ], setup: ctx => { ctx.price = 1200 * Adv.progressTier(); } },
  { id: 'whale', where: 'voyage', w: 6, icon: 'whale', color: '#7986cb', title: '鲸鱼同行', text: '一头鲸鱼游到了船边，好像想带你一程。',
    choices: [{ t: '跟着它！', def: true, fn: () => { const v = Game.S.voyage; v.boost = v.t + 60; return '接下来一段时间航速 +30%！'; } }] },
  { id: 'ghostship', where: 'voyage', w: 3, icon: 'ghost', spr: 'skelcat', color: '#80cbc4', title: '幽灵船', cond: S => S.voyage && S.voyage.lv[0] >= 10, text: '浓雾中出现了一艘破破烂烂的船，甲板上有骷髅在走动……',
    choices: [
      { t: '登船！', fn: () => { Events.fight('skelcat', 3, () => { Game.S.treasure.mapPiece++; Game.toast('在船长室里找到了一片【海盗地图碎片】！', 'good'); Adv.checkHidden(); }); return '骷髅水手拔出了骨头刀！'; } },
      { t: '远离它', def: true, fn: () => '幽灵船消失在了雾里。' },
    ] },
  { id: 'island', where: 'voyage', w: 6, icon: 'island', color: '#aed581', title: '无名小岛', text: '航线旁边有一座地图上没有的小岛。',
    choices: [
      { t: '上岸看看', fn: () => {
        const r = Math.random(), t = Adv.progressTier();
        if (r < 0.45) { const c = Math.round(rand(300, 900) * t); Game.addCoins(c); return `在椰子树下挖到了 🪙${c}！`; }
        if (r < 0.6) { Game.S.treasure.key++; return '在岩缝里找到了一把钥匙！'; }
        if (r < 0.7) { Game.S.mats.oldwood = (Game.S.mats.oldwood || 0) + 3; return '海滩上有一堆漂来的老船木（×3）！'; }
        if (r < 0.85) { const g = Adv.newGear(t, 1); Adv.addGear(g); return `捡到了【${gearName(g)}】！`; }
        return `踩到了一只螃蟹……HP -${hurt(0.1)}`;
      } },
      { t: '继续航行', def: true, fn: () => '小岛渐渐消失在身后。' },
    ] },

  // ===================== 副本 =====================
  { id: 'mimicchest', where: 'dungeon', w: 10, icon: 'mimic', color: '#c08a4a', title: '宝箱？', text: '房间正中央放着一个宝箱。太显眼了，反而让人不安。',
    choices: [
      { t: '打开', def: true, fn: () => {
        if (Math.random() < 0.55) { const D = Game.S.dungeon, def = DUNGEONS.find(x => x.id === D.id); const c = Math.round(def.lv[1] * rand(30, 60)); Game.addCoins(c); D.loot.coins += c; let m = `是真的宝箱！🪙${c}`; if (Math.random() < 0.5) { const g = Adv.newGear(def.tier, 2); if (Adv.addGear(g, true)) { D.loot.gear++; m += `，还有【${gearName(g)}】`; } } return m; }
        Events.fight('mimic', 2); return '宝箱怪！';
      } },
      { t: '不碰它', fn: () => '你绕开了宝箱。宝箱好像有点失望。' },
    ] },
  { id: 'altar', where: 'dungeon', w: 7, icon: 'altar', color: '#ffd54f', title: '古老的祭坛', setup: ctx => { ctx.price = 600 * DUNGEONS.find(x => x.id === Game.S.dungeon.id).tier; }, text: ctx => `祭坛上刻着：「献上金币者，得到力量。」（🪙${fmtFull(ctx.price)}）`,
    choices: [
      { t: '献上金币', fn: ctx => { if (!Game.pay(ctx.price)) return '金币不够……祭坛没有反应。'; Game.S.dungeon.buff = 0.25; return '一股力量涌了上来！本次副本攻击 +25%。'; } },
      { t: '离开', def: true, fn: () => '你没有理会祭坛。' },
    ] },
  { id: 'kitten', where: 'dungeon', w: 7, icon: 'paw', color: '#ffcc80', title: '被困的小猫', text: '一只小猫被困在了落石下面，正可怜地叫着。',
    choices: [
      { t: '救它出来', def: true, fn: () => { const d = hurt(0.1); Game.S.treasure.key++; const c = Math.round(rand(100, 400) * Adv.progressTier()); Game.addCoins(c); return `搬石头时受了点伤（HP -${d}）。小猫送了你一把钥匙和 🪙${c}，“谢谢哥哥/姐姐！”`; } },
      { t: '离开', fn: () => '小猫的叫声在身后回荡……' },
    ] },
  { id: 'trap', where: 'dungeon', w: 7, icon: 'trap', color: '#ef9a9a', title: '陷阱！', text: '咔哒一声，你踩到了什么东西。',
    choices: [{ t: '糟了！', def: true, fn: () => { const st = Adv.stats(); if (Math.random() < Math.min(0.6, st.spd / 60)) return '小橘敏捷地跳开了！'; return `飞出了一排尖刺！HP -${hurt(0.12)}`; } }] },
  { id: 'dmerchant', where: 'dungeon', w: 6, icon: 'merchant', color: '#ffb74d', title: '地下商人', setup: ctx => { ctx.price = 250 * DUNGEONS.find(x => x.id === Game.S.dungeon.id).tier; }, text: ctx => `“探险辛苦啦，要来点鱼干吗？”3 条烤鱼只要 🪙${fmtFull(ctx.price)}。`,
    choices: [
      { t: '买下', fn: ctx => { if (!Game.pay(ctx.price)) return '金币不够。'; const S = Game.S; for (let i = 0; i < 3; i++) S.bag.push({ uid: S.uid++, id: 'carp', size: 60, value: 16 }); return '获得了 3 条烤鲤鱼（口粮）。'; } },
      { t: '不用了', def: true, fn: () => '商人缩回了阴影里。' },
    ] },
  { id: 'statue', where: 'dungeon', w: 5, icon: 'cat', color: '#b0bec5', title: '猫神像', text: '一座猫的石像，表情有点得意。',
    choices: [{ t: '摸摸它的头', def: true, fn: () => {
      const r = Math.random();
      if (r < 0.4) { const h = Adv.heal(Adv.stats().maxHp * 0.5); return `石像的眼睛亮了一下。HP +${h}`; }
      if (r < 0.7) { const e = 30 * Adv.progressTier(); Game.gainExp(e); return `你觉得自己变聪明了。经验 +${e}`; }
      return '什么也没发生。石像好像在笑你。';
    } }] },
];

const Events = {
  cur: null,
  timer: 150,
  blocking() { return this.cur && !this.cur.done && this.cur.where !== 'fish' ? this.cur : null; },
  pick(where) {
    const S = Game.S;
    const list = EVENT_DEFS.filter(e => e.where === where && (!e.cond || e.cond(S)));
    if (!list.length) return null;
    return weightedPick(list.map(e => [e, e.w]));
  },
  trigger(where, offline, forceId) {
    const def = forceId ? EVENT_DEFS.find(e => e.id === forceId) : this.pick(where);
    if (!def) return false;
    if (this.cur && !this.cur.done) return false;
    const ctx = {};
    if (def.setup) def.setup(ctx);
    if (offline) { // 离线：直接选默认选项
      const ch = def.choices.find(c => c.def) || def.choices[def.choices.length - 1];
      this._off = true;
      try { ch.fn(ctx, true); } catch (e) { console.warn(e); }
      this._off = false;
      this.afterResolve(def.where, true);
      return true;
    }
    this.cur = { def, ctx, where: def.where, left: def.where === 'fish' ? 25 : 15, max: def.where === 'fish' ? 25 : 15, done: false };
    Game.emit('event', this.cur);
    Sound.tone(880, 0.1, 'triangle', 0.08); Sound.tone(1320, 0.15, 'triangle', 0.08, null, 0.1);
    return true;
  },
  // 副本每层的岔路
  branch(offline) {
    const def = {
      id: 'branch', where: 'dungeon', icon: 'path', color: '#ffe082', title: '岔路口', text: '前方分成了三条路。',
      choices: [
        { t: '🛡️ 平稳的小路', def: true, fn: () => { Game.S.dungeon.path = 'safe'; return '你选择了平稳的小路。'; } },
        { t: '💀 危险的深处（怪物 +3 级，宝箱更多，经验 ×1.5）', fn: () => { Game.S.dungeon.path = 'danger'; return '你走向了黑暗的深处……'; } },
        { t: '❓ 神秘的门（必定遇到事件）', fn: () => { Game.S.dungeon.path = 'mystery'; return '你推开了那扇奇怪的门。'; } },
      ],
    };
    if (offline) { def.choices[0].fn(); this.afterResolve('dungeon', true); return; }
    this.cur = { def, ctx: {}, where: 'dungeon', left: 15, max: 15, done: false };
    Game.emit('event', this.cur);
  },
  choose(i) {
    const c = this.cur; if (!c || c.done) return;
    const ch = c.def.choices[i]; if (!ch) return;
    let msg = '';
    try { msg = ch.fn(c.ctx, false) || ''; } catch (e) { console.error(e); }
    c.done = true; c.result = msg; c.left = 3.5;
    this.afterResolve(c.where, false);
    Game.emit('event', c); Game.changed();
  },
  afterResolve(where) {
    const S = Game.S;
    if (where === 'voyage' && S.voyage) S.voyage.inEvent = false;
    if (where === 'dungeon' && S.dungeon && ['event', 'choice'].includes(S.dungeon.phase)) { S.dungeon.phase = 'walk'; S.dungeon.t = 0; }
  },
  // 事件中引发的战斗
  fight(mon, lvAdd, onWin) {
    const S = Game.S;
    if (S.mode === 'voyage' && S.voyage) {
      S.voyage.inBattle = true;
      Adv.startBattle(monsterStats(mon, S.voyage.lv[1] + lvAdd), { where: 'voyage', tier: Adv.progressTier(), onWin }, !!this._off);
    } else if (S.mode === 'dungeon' && S.dungeon) {
      const def = DUNGEONS.find(x => x.id === S.dungeon.id);
      S.dungeon.phase = 'battle';
      Adv.startBattle(monsterStats(mon, def.lv[1] + lvAdd), { where: 'dungeon', tier: def.tier, onWin }, !!this._off);
    } else Adv.eventBattle(mon, regionLv() + lvAdd, onWin);
  },
  steal() {
    const S = Game.S;
    const fish = S.bag.filter(x => !FISH_BY_ID[x.id].treasure);
    if (!fish.length) return '海鸥扑了个空。';
    const f = fish[Math.floor(Math.random() * fish.length)];
    S.bag.splice(S.bag.indexOf(f), 1);
    return `海鸥叼走了一条${FISH_BY_ID[f.id].name}！`;
  },
  clear() { this.cur = null; Game.emit('event', null); },
  tick(dt) {
    const S = Game.S;
    if (this.cur) {
      this.cur.left -= dt;
      if (this.cur.left <= 0) {
        if (this.cur.done) this.clear();
        else { const i = Math.max(0, this.cur.def.choices.findIndex(c => c.def)); this.choose(i); }
      }
      return;
    }
    if (S.mode !== 'fish' || Adv.battle || Adv.storyActive()) return;
    this.timer -= dt;
    if (this.timer <= 0) { this.timer = rand(150, 300); this.trigger('fish'); }
  },
};
