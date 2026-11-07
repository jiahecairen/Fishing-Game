// ===== 副本 · 通用流程 =====
// 每个副本是 dungeons/ 下的一个文件，用 CF.dungeon(id, {...}) 注册。这里只管「通用的走法」：
//   一层有 3 个房间；每层开头有岔路（平稳 / 危险 / 神秘）；房间里随机是战斗、宝箱、泉水、事件；
//   走完所有层就是 Boss；打赢 Boss 拿通关宝箱。
//
// 副本文件可以写的钩子（都可选）：
//   unlock(S)             隐藏副本：返回 true 才会出现（配合 hidden: true、hint: '提示'）
//   room(D, offline)      自定义房间：返回 true 表示这个房间已经处理（不走默认的随机房间）
//   bossIntro(go, off)    Boss 出场方式（默认播放 story.boss 再开打）；go() 开始 Boss 战
//   waitForPlayer: true   离线时停在 Boss 门前，等玩家回来再打
//   onClear(c)            通关时：c = { first, spared, uniques: [], list: [奖励], offline }，可以往 uniques / list 里加东西
//   ending(c, show)       通关后的剧情（默认第一次通关播放 story.win）；show() 弹出奖励
//   story: { enter, boss, win }   台词，会注册成 enter_<id> / boss_<id> / win_<id>
// 事件：dungeon:enter / dungeon:clear { id, first, spared }
'use strict';

const DUNGEON_WALK = 4;
const ROOMS_PER_FLOOR = 3;
const DUNGEONS = [];
CF.content.type('dungeon', { list: DUNGEONS });
CF.dungeon = (id, def) => {
  if (def.story) for (const [k, lines] of Object.entries(def.story)) STORY[k + '_' + id] = lines;
  return CF.content.define('dungeon', id, def);
};

const Dungeon = {
  get S() { return Game.S; },
  get D() { return Game.S.dungeon; },
  def(id) { return DUNGEONS.find(x => x.id === (id || (this.D && this.D.id))); },
  open(d) { return Game.reached(d.region) && this.S.boat >= 1 && (!d.hidden || (d.unlock && d.unlock(this.S))); },
  enter(id, mode) {
    const S = this.S, d = this.def(id);
    if (CF.modes.busy() || !d || !this.open(d)) return;
    if (S.hero.hp < Hero.stats().maxHp * 0.3) { Game.toast('HP 太低了，先休息一下或吃条鱼吧', 'warn'); return; }
    S.dungeon = { id, floor: 1, room: 0, phase: 'walk', t: 0, path: 'safe', buff: 0, mode: mode || S.settings.battleMode, loot: { coins: 0, gear: 0, exp: 0 } };
    CF.modes.enter('dungeon');
    CF.emit('dungeon:enter', { id });
    Story.run('enter_' + id);
  },
  log(msg) { this.lastLog = msg; },
  lvNow() {
    const D = this.D, def = this.def();
    return Math.round(def.lv[0] + (def.lv[1] - def.lv[0]) * ((D.floor - 1) / Math.max(1, def.floors - 1)) + rand(-0.5, 0.5) + (D.path === 'danger' ? 3 : 0));
  },
  room(offline) {
    const S = this.S, D = this.D, def = this.def();
    D.room++;
    if (D.room > ROOMS_PER_FLOOR) {
      D.floor++; D.room = 0;
      if (D.floor > def.floors) { D.phase = 'boss'; return this.boss(offline); }
      this.log(`* 你走下了台阶。第 ${D.floor} 层。`);
      D.phase = 'choice'; this.branch(offline);
      return;
    }
    if (def.room && def.room(D, offline)) return;
    const danger = D.path === 'danger', lv = this.lvNow();
    let ev = weightedPick([['battle', 58], ['chest', danger ? 20 : 11], ['spring', 8], ['event', 16], ['none', 7]]);
    if (D.path === 'mystery' && D.room === 1) ev = 'event';
    if (ev === 'event') {
      D.phase = 'event';
      if (Events.trigger('dungeon', offline)) return;
      D.phase = 'walk';
    }
    if (ev === 'battle' || ev === 'event') {
      D.phase = 'battle';
      Battle.fight(def.mons[Math.floor(Math.random() * def.mons.length)], lv, { where: 'dungeon', tier: def.tier, expMul: danger ? 1.5 : 1 }, offline);
    } else if (ev === 'chest') {
      const c = Math.round(lv * rand(15, 30) * (danger ? 1.5 : 1));
      Game.addCoins(c); D.loot.coins += c;
      let msg = `* 你发现了一个小箱子。里面有 🪙${c}。`;
      if (Math.random() < 0.35) { const g = Hero.newGear(def.tier, danger ? 2 : 1); if (Hero.addGear(g, true)) { D.loot.gear++; msg += ` 还有 ${gearName(g)}！`; } }
      if (Math.random() < 0.15) { S.treasure.key++; msg += ' 还有一把钥匙！'; }
      this.log(msg);
    } else if (ev === 'spring') {
      const r = Hero.heal(Hero.stats().maxHp * 0.4);
      this.log(`* 一汪清澈的泉水。你喝了几口。HP +${r}`);
    } else this.log(['* 什么也没有。只有风声。', '* 墙上刻着一条鱼的图案。', '* 你踩到了一块会叫的石头。', '* 泡泡在水桶里打了个喷嚏。'][Math.floor(Math.random() * 4)]);
  },
  // 每层开头的岔路
  branch(offline) {
    Events.show({
      id: 'branch', where: 'dungeon', icon: 'path', color: '#ffe082', title: '岔路口', text: '前方分成了三条路。',
      choices: [
        { t: '🛡️ 平稳的小路', def: true, fn: () => { Game.S.dungeon.path = 'safe'; return '你选择了平稳的小路。'; } },
        { t: '💀 危险的深处（怪物 +3 级，宝箱更多，经验 ×1.5）', fn: () => { Game.S.dungeon.path = 'danger'; return '你走向了黑暗的深处……'; } },
        { t: '❓ 神秘的门（必定遇到事件）', fn: () => { Game.S.dungeon.path = 'mystery'; return '你推开了那扇奇怪的门。'; } },
      ],
    }, offline);
  },
  boss(offline) {
    const D = this.D, def = this.def();
    if (offline && def.waitForPlayer) { D.phase = 'bossWait'; return; }
    D.phase = 'bossTalk';
    const go = () => {
      if (!this.S.dungeon) return;
      D.phase = 'battle';
      Battle.fight(def.boss, def.bossLv, { where: 'dungeon', tier: def.tier, boss: true }, offline);
    };
    if (def.bossIntro) def.bossIntro(go, offline);
    else if (offline) { Story.run('boss_' + def.id); go(); }
    else Story.run('boss_' + def.id, go);
  },
  clear(spared, offline) {
    const S = this.S, def = this.def();
    const first = !S.cleared[def.id];
    S.cleared[def.id] = (S.cleared[def.id] || 0) + 1;
    const list = Treasure.rollLoot(4, def.tier);
    if (first) list.push({ type: 'treasure', id: 'key', n: 2 });
    const c = { id: def.id, first, spared, uniques: [], list, offline };
    if (def.onClear) def.onClear(c);
    for (const u of c.uniques) { const g = Hero.giveUnique(u, true); if (g) list.push({ type: 'gear', g, kept: true }); }
    Treasure.applyLoot(list);
    CF.modes.leave();
    const show = () => Game.emit('loot', { title: `🏆 ${def.name} 通关宝箱`, list, offline });
    if (def.ending) def.ending(c, show);
    else if (first) Story.run('win_' + def.id, show);
    else show();
    CF.emit('dungeon:clear', { id: def.id, first, spared });
    Game.changed(); Game.save();
  },
  retreat() { Game.toast('撤出了副本', 'warn'); CF.modes.leave(); Game.changed(); Game.save(); },
  tick(dt, offline) {
    const D = this.D;
    if (!D) { CF.modes.leave(); return; }
    Hero.regen(dt, 0.002);
    if (D.phase === 'walk') { D.t += dt; if (D.t >= DUNGEON_WALK) { D.t = 0; this.room(offline); } }
    else if (D.phase === 'bossWait' && !offline) this.boss(false);
  },
};

CF.module({
  id: 'dungeon',
  state: () => ({ dungeon: null, cleared: {} }),
  migrate(S) {
    if (S.mode === 'dungeon' && !S.dungeon) S.mode = 'fish';
    if (S.dungeon && ['battle', 'event', 'choice', 'bossTalk'].includes(S.dungeon.phase)) { S.dungeon.phase = 'walk'; S.dungeon.t = 0; }
  },
  init() {
    // 祭坛之力：本次副本攻击 +25%
    CF.hook('hero.buffs', () => Game.S.dungeon && Game.S.dungeon.buff ? { atkMul: Game.S.dungeon.buff } : null);
    CF.hook('battle.tags', () => Game.S.dungeon && Game.S.dungeon.buff ? '祭坛之力' : '');
    CF.on('event:resolved', e => { const D = Game.S.dungeon; if (e.where === 'dungeon' && D && ['event', 'choice'].includes(D.phase)) { D.phase = 'walk'; D.t = 0; } });
    CF.on('mode', () => { Dungeon.lastLog = ''; });
    CF.modes.define('dungeon', {
      name: '副本',
      offlineText: '小橘还在副本里探索……',
      enter() { Fishing.resetFsm(); },
      exit() { Game.S.dungeon = null; },
      tick: dt => Dungeon.tick(dt, false),
      render: dt => DungeonRender.frame(dt),
      bar: () => DungeonUI.bar(),
      retreat: () => Dungeon.retreat(),
      fight(mon, lvAdd, onWin, offline) {
        const D = Game.S.dungeon, def = Dungeon.def(); if (!D) return;
        D.phase = 'battle';
        Battle.fight(mon, def.lv[1] + lvAdd, { where: 'dungeon', tier: def.tier, onWin }, offline);
      },
      offline(ctx) {
        Adventure.offline(ctx, (dt, off) => Dungeon.tick(dt, off), rep => {
          if (Game.S.dungeon && Game.S.dungeon.phase === 'bossWait') { rep.bossWait = true; return true; }
        });
      },
    });
    Battle.context('dungeon', {
      mode: () => Game.S.dungeon && Game.S.dungeon.mode,
      theme: () => { const def = Dungeon.def(); return { kind: 'cave', st: (def && def.style) || DUNGEONS[0].style }; },
      win(B, offline) {
        const D = Game.S.dungeon; if (!D) return;
        if (B.reward) { D.loot.exp += B.reward.exp; D.loot.coins += B.reward.coins; if (B.reward.gear) D.loot.gear++; }
        if (B.ctx.boss) return Dungeon.clear(B.result === 'spare', offline);
        D.phase = 'walk'; D.t = 0;
      },
      lose() { Game.toast('在副本中倒下了……', 'warn'); CF.modes.leave(); Game.save(); },
    });
  },
});
