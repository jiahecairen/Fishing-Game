// ===== 突发事件 · 引擎 =====
// 一个事件 = 一张卡片：标题、描述、几个选项。离线时自动选「默认」选项（def: true）。
//
// CF.content.define('event', 'myevent', {
//   where: 'fish',            // 在哪里触发：fish 钓鱼中 / voyage 航海中 / dungeon 副本中 / 你的新模式 id
//   w: 8,                     // 权重
//   icon: 'gull', color: '#fff', spr: 'lakemon',   // 卡片图标（game-icons 名字）或像素立绘
//   title: '标题', text: '描述' 或 ctx => '描述',
//   cond: S => true,          // 什么时候可以出现
//   setup(ctx) {},            // 出现前准备（例如随机一件商品）
//   choices: [{ t: '选项', def: true, fn(ctx, offline) { return '结果文字'; } }],
// });
//
// 事件里要打一架：Events.fight('怪物 id', 等级加成, onWin) —— 当前模式会决定在哪儿打
// 事件：event（卡片更新）、event:done（玩家选完了，{ id, where, choice }）、event:resolved
'use strict';

const EVENT_DEFS = [];
CF.content.type('event', { list: EVENT_DEFS });

// 当前地点的怪物等级
function regionLv() { const r = Game.scene().monLv || [3, 6]; return Math.round((r[0] + r[1]) / 2); }
// 按最大生命百分比受伤（航海时船体加固会减伤）
function hurt(pct) { return Hero.hurt(pct, CF.filter('events.hurtFactor', 1)); }
function cheapestFish() {
  const arr = Game.S.bag.filter(x => !FISH_BY_ID[x.id].treasure && FISH_BY_ID[x.id].rarity !== 'junk');
  return arr.sort((a, b) => a.value - b.value)[0];
}

const Events = {
  cur: null,
  timer: 150,
  labels: { fish: '突发事件', voyage: '海上事件', dungeon: '副本事件' },
  // 会挡住冒险进度的事件（钓鱼时的事件不挡）
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
    return this.show(def, offline);
  },
  // 直接显示一个事件（也可以是临时拼出来的，例如副本的岔路）
  show(def, offline) {
    if (this.cur && !this.cur.done) return false;
    const ctx = {};
    if (def.setup) def.setup(ctx);
    if (offline) { // 离线：直接选默认选项
      const i = Math.max(0, def.choices.findIndex(c => c.def));
      this._off = true;
      try { def.choices[i].fn(ctx, true); } catch (e) { console.warn(e); }
      this._off = false;
      CF.emit('event:done', { id: def.id, where: def.where, choice: i, offline: true });
      this.afterResolve(def.where, true);
      return true;
    }
    const t = def.where === 'fish' ? 25 : 15;
    this.cur = { def, ctx, where: def.where, left: t, max: t, done: false };
    Game.emit('event', this.cur);
    Sound.tone(880, 0.1, 'triangle', 0.08); Sound.tone(1320, 0.15, 'triangle', 0.08, null, 0.1);
    return true;
  },
  choose(i) {
    const c = this.cur; if (!c || c.done) return;
    const ch = c.def.choices[i]; if (!ch) return;
    let msg = '';
    try { msg = ch.fn(c.ctx, false) || ''; } catch (e) { console.error(e); }
    c.done = true; c.result = msg; c.left = 3.5;
    CF.emit('event:done', { id: c.def.id, where: c.where, choice: i });
    this.afterResolve(c.where, false);
    Game.emit('event', c); Game.changed();
  },
  afterResolve(where, offline) { CF.emit('event:resolved', { where, offline }); },
  // 事件中引发的战斗：交给当前模式决定（航海中在海上打，副本里在洞里打，码头上就地打）
  fight(mon, lvAdd, onWin) {
    const m = CF.modes.cur();
    if (m.fight) return m.fight(mon, lvAdd, onWin, !!this._off);
    if (Battle.battle) return;
    Battle.fight(mon, regionLv() + lvAdd, { where: 'event', tier: Game.progressTier(), onWin }, false);
  },
  clear() { this.cur = null; Game.emit('event', null); },
  tick(dt) {
    if (this.cur) {
      this.cur.left -= dt;
      if (this.cur.left <= 0) {
        if (this.cur.done) this.clear();
        else this.choose(Math.max(0, this.cur.def.choices.findIndex(c => c.def)));
      }
      return;
    }
    if (CF.modes.busy() || Battle.battle || Story.active) return;
    this.timer -= dt;
    if (this.timer <= 0) { this.timer = rand(CF.tune('events.min', 150), Math.max(CF.tune('events.min', 150), CF.tune('events.max', 300))); this.trigger('fish'); }
  },
};

CF.module({
  id: 'events',
  init() {
    CF.hook('mode.blocked', () => !!Events.blocking());
    CF.on('mode', () => { if (Events.cur) Events.clear(); }); // 换了模式，之前的事件就不算数了
  },
  tick: dt => Events.tick(dt),
  reset() { Events.cur = null; },
});
