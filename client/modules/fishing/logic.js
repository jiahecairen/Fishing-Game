// ===== 钓鱼 · 逻辑：抛竿状态机、概率、渔获、离线挂机、鱼具与道具 =====
// 和别的模块的协作全部通过钩子 / 事件：
//   钩子  fish.luck / fish.bite / fish.rare / fish.price   其他模块提供的加成（数值相加）
//         fish.treasure(luck, scene)   → 返回一件宝藏（宝藏模块）
//         fish.treasureCaught(item)    钓到宝藏时
//         fish.overflow(item)          背包仓库都满时，谁能处理这条鱼（招财猫：售卖模块卖掉 → 'sold'，寄卖行挂单 → true）
//         fish.overflowDesc()          设置里「招财猫」那一行的说明文字
//         fish.paused()                返回 true 时暂停钓鱼（战斗中）
//   事件  cast / bite / reel / catch / escape / fish:caught / released
'use strict';

const Fishing = {
  fsm: { phase: 'idle', t: 0, dur: 0 },
  get S() { return Game.S; },

  // ---------- 查询 ----------
  rod() { return findById(RODS, this.S.rod); },
  line() { return findById(LINES, this.S.line); },
  bait() { return findById(BAITS, this.S.bait); },
  luckBuffLeft(now) { return Math.max(0, (this.S.buffs.luckUntil || 0) - (now || Date.now())); },
  luck(now) { return this.rod().luck + CF.sum('fish.luck') + (this.luckBuffLeft(now) > 0 ? 0.3 : 0); },
  control() { return this.rod().control + this.line().control; },
  baitCount(id) { const b = findById(BAITS, id); return b.infinite ? Infinity : (this.S.baits[id] || 0); },
  autoSellActive() { return !!(this.S.perms.luckycat && this.S.settings.autoSell); },
  canStore() {
    const S = this.S;
    return S.bag.length < S.bagCap || (S.perms.autostore && S.warehouse.length < S.whCap) || this.autoSellActive();
  },

  // ---------- 核心公式 ----------
  biteTime(phase, weather) {
    const p = phase || Game.phase();
    const w = WEATHERS[weather || this.S.weather];
    let phaseMod = 1;
    if (p === 'dawn' || p === 'dusk') phaseMod = 0.9;
    if (p === 'night') phaseMod = this.S.perms.glowfloat ? 0.85 : 1.2;
    const frenzy = (this.S.buffs.frenzyUntil || 0) > Date.now() ? 0.5 : 1;
    const bonus = Math.min(0.6, CF.sum('fish.bite'));
    return 7 * this.rod().speed * this.bait().bite * w.bite * phaseMod * frenzy * (1 - bonus) * rand(0.55, 1.45);
  },
  fishPool(scene, phase, weather, tier) {
    const season = Game.season();
    return FISH.filter(f => f.scenes.includes(scene)
      && (!f.times || f.times.includes(phase))
      && (!f.weathers || f.weathers.includes(weather))
      && (!f.seasons || f.seasons.includes(season))
      && (f.tier || 1) <= tier);
  },
  rollFish(opts) {
    const o = Object.assign({ scene: this.S.scene, phase: Game.phase(), weather: this.S.weather, luck: this.luck() }, opts || {});
    const tr = o.noTreasure ? null : CF.first('fish.treasure', o.luck, o.scene);
    if (tr) return tr;
    const rod = this.rod(), bait = this.bait(), w = WEATHERS[o.weather], rareBonus = CF.sum('fish.rare');
    const pool = this.fishPool(o.scene, o.phase, o.weather, rod.tier);
    const entries = pool.map(f => {
      let wt = RARITY[f.rarity].weight * bait.mult[f.rarity];
      if (f.rarity === 'junk') wt *= Math.max(0.2, 1 - rod.luck * 1.5);
      if (f.rarity === 'rare') wt *= w.rare * (1 + o.luck);
      if (f.rarity === 'epic') wt *= w.rare * (1 + o.luck * 2);
      if (f.rarity === 'legendary') wt *= w.rare * (1 + o.luck * 3);
      if (['rare', 'epic', 'legendary'].includes(f.rarity)) wt *= 1 + rareBonus;
      if (f.times || f.weathers) wt *= 1.3; // 限定条件的鱼在对的时间更容易出现
      return [f, wt];
    });
    return weightedPick(entries);
  },
  escapeChance(fish, weather) {
    if (fish.rarity === 'junk' || fish.treasure) return 0;
    const w = WEATHERS[weather || this.S.weather];
    return clamp(RARITY[fish.rarity].diff - this.control() + w.escape, 0.03, 0.85);
  },
  makeCatch(fish, perfect) {
    if (fish.treasure) return { uid: Game.nextUid(), id: fish.id, size: 0, value: 0, treasure: true, ts: Date.now() };
    const r = Math.pow(Math.random(), perfect ? 0.7 : 1.5);
    const size = Math.round((fish.min + (fish.max - fish.min) * r) * 10) / 10;
    const value = Math.max(1, Math.round(fish.price * (0.6 + 0.8 * r) * (1 + 0.02 * (this.S.level - 1)) * (1 + CF.sum('fish.price'))));
    return { uid: Game.nextUid(), id: fish.id, size, value, star: r > 0.9, ts: Date.now() };
  },
  releaseExp(item) { return Math.max(1, Math.round(RARITY[FISH_BY_ID[item.id].rarity].exp * 0.5)); },
  // 收下渔获；返回 {stored:'bag'|'wh'|'sold'|'listed'|'released'|'treasure', isNew}
  receive(item, quiet) {
    const S = this.S, fish = FISH_BY_ID[item.id];
    if (fish.treasure) { CF.call('fish.treasureCaught', item, quiet); return { stored: 'treasure', isNew: false }; }
    const d = S.dex[item.id] || (S.dex[item.id] = { count: 0, max: 0, first: Date.now() });
    const isNew = d.count === 0;
    d.count++; d.max = Math.max(d.max, item.size);
    S.stats.caught++;
    Game.gainExp(RARITY[fish.rarity].exp * (isNew ? 2 : 1), quiet);

    let stored = null;
    if (S.bag.length < S.bagCap) { S.bag.push(item); stored = 'bag'; }
    else if (S.perms.autostore && S.warehouse.length < S.whCap) { S.warehouse.push(item); stored = 'wh'; }
    else if (this.autoSellActive()) {
      // 招财猫：满仓时把普通鱼/杂物交给别的模块处理（售卖模块直接卖掉，寄卖行自动挂单），没人处理就放生
      const cheapIdx = S.bag.findIndex(x => ['junk', 'common'].includes(FISH_BY_ID[x.id].rarity));
      let out = item;
      if (!['junk', 'common'].includes(fish.rarity) && cheapIdx >= 0) { out = S.bag.splice(cheapIdx, 1)[0]; S.bag.push(item); }
      const how = CF.first('fish.overflow', out);
      if (how) stored = out === item ? (typeof how === 'string' ? how : 'listed') : 'bag';
      else { Game.gainExp(this.releaseExp(out), true); stored = out === item ? 'released' : 'bag'; }
    }
    CF.emit('fish:caught', { item, fish, isNew, quiet: !!quiet });
    return { stored, isNew };
  },
  consumeBait(quiet) {
    const S = this.S, b = this.bait();
    if (b.infinite) return;
    if ((S.baits[b.id] || 0) > 0) {
      S.baits[b.id]--;
      if (S.baits[b.id] === 0) { S.bait = 'dough'; if (!quiet) Game.toast(`${b.name}用完了，已换回面团`, 'warn'); }
    } else S.bait = 'dough';
  },

  // ---------- 实时钓鱼状态机 ----------
  // idle → casting → waiting → bite → reeling → result → (auto) casting
  startCast() {
    if (!this.canStore()) { this.fsm = { phase: 'idle', t: 0, dur: 0, blocked: true }; Game.emit('status'); return false; }
    this.consumeBait();
    this.S.stats.casts++;
    this.fsm = { phase: 'casting', t: 0, dur: 1.1, bait: this.S.bait };
    Game.emit('cast'); Game.changed();
    return true;
  },
  // 玩家点击（按钮/空格/画面）
  action() {
    if (!CF.modes.is('fish')) return;
    const f = this.fsm;
    if (f.phase === 'idle' || f.phase === 'result' && !this.S.settings.auto) { this.startCast(); return; }
    if (f.phase === 'bite') { this.reel(true); return; }
    if (f.phase === 'waiting' && !this.S.settings.auto) { // 手动模式提前收竿
      this.fsm = { phase: 'idle', t: 0, dur: 0 };
      Game.toast('收回了鱼线'); Game.emit('status');
    }
  },
  reel(perfect) {
    const fish = this.fsm.fish;
    const esc = this.escapeChance(fish) * (perfect ? 0.35 : 1);
    this.fsm = { phase: 'reeling', t: 0, dur: 1.3, fish, perfect, escaped: Math.random() < esc };
    Game.emit('reel', { perfect });
  },
  update(dt) {
    const S = this.S, f = this.fsm;
    f.t += dt;
    switch (f.phase) {
      case 'idle':
        if (S.settings.auto) { f.wait = (f.wait || 0) + dt; if (f.wait > (f.blocked ? 3 : 0.6)) this.startCast(); }
        break;
      case 'casting':
        if (f.t >= f.dur) { this.fsm = { phase: 'waiting', t: 0, dur: this.biteTime(), fish: this.rollFish() }; Game.emit('status'); }
        break;
      case 'waiting':
        if (f.t >= f.dur) { this.fsm = { phase: 'bite', t: 0, dur: 1.6, fish: f.fish, autoAt: rand(0.55, 1.0) }; Game.emit('bite'); }
        break;
      case 'bite':
        if (S.settings.auto && f.t >= f.autoAt) this.reel(false);
        else if (f.t >= f.dur) {
          S.stats.escaped++;
          this.fsm = { phase: 'result', t: 0, dur: 1.2, escaped: true, missed: true };
          Game.emit('escape', { missed: true });
        }
        break;
      case 'reeling':
        if (f.t >= f.dur) {
          if (f.escaped) {
            S.stats.escaped++;
            this.fsm = { phase: 'result', t: 0, dur: 1.2, escaped: true };
            Game.emit('escape', { fish: f.fish });
          } else {
            const item = this.makeCatch(f.fish, f.perfect);
            const res = this.receive(item);
            this.fsm = { phase: 'result', t: 0, dur: 1.6, item, fish: f.fish };
            Game.emit('catch', { item, fish: f.fish, perfect: f.perfect, ...res });
          }
          Game.changed();
        }
        break;
      case 'result':
        if (f.t >= f.dur) {
          if (S.settings.auto) this.startCast();
          else { this.fsm = { phase: 'idle', t: 0, dur: 0 }; Game.emit('status'); }
        }
        break;
    }
  },
  resetFsm() { this.fsm = { phase: 'idle', t: 0, dur: 0 }; },

  // ---------- 离线挂机 ----------
  offline(ctx) {
    const S = this.S, report = ctx.report;
    if (CF.modes.busy() || ctx.left < 30) return; // 还在冒险中（或者剩下的时间太短）
    const seconds = ctx.left;
    Object.assign(report, { fishing: true, casts: 0, caught: 0, escaped: 0, coins: 0, newFish: [], best: null, stopped: false });
    if (!S.settings.auto) { Game.advanceTime(seconds); ctx.left = 0; report.idleOff = true; return; }
    const startGM = S.gameMinutes, startTs = S.lastSave || Date.now();
    let t = 0, iter = 0;
    while (t < seconds && iter < 8000) {
      iter++;
      const gm = startGM + t * TIME_SCALE;
      S.gameMinutes = gm;
      if (gm >= S.weatherUntil) Game.rollWeather(S.scene, gm);
      if (!this.canStore()) { report.stopped = true; break; }
      const phase = phaseOf((gm / 60) % 24);
      t += 1.1 + this.biteTime(phase, S.weather) + 0.8 + 1.3 + 1.6;
      if (t > seconds) break;
      this.consumeBait(true);
      S.stats.casts++; report.casts++;
      const luck = this.rod().luck + CF.sum('fish.luck') + ((startTs + t * 1000) < S.buffs.luckUntil ? 0.3 : 0);
      const fish = this.rollFish({ phase, weather: S.weather, luck });
      if (Math.random() < this.escapeChance(fish, S.weather)) { S.stats.escaped++; report.escaped++; continue; }
      const item = this.makeCatch(fish, false);
      const before = S.coins;
      const res = this.receive(item, true);
      if (fish.treasure) continue;
      report.caught++;
      report.coins += S.coins - before;
      if (res.isNew) report.newFish.push(fish.id);
      if (!report.best || RARITY_ORDER.indexOf(fish.rarity) > RARITY_ORDER.indexOf(FISH_BY_ID[report.best.id].rarity)
        || (fish.rarity === FISH_BY_ID[report.best.id].rarity && item.value > report.best.value)) report.best = item;
    }
    S.gameMinutes = startGM + seconds * TIME_SCALE;
    if (S.gameMinutes >= S.weatherUntil) Game.rollWeather();
    ctx.left = 0;
    if (report.caught) report.notable = true;
  },

  // ---------- 鱼具与道具 ----------
  buyRod(id) {
    const r = findById(RODS, id);
    if (this.S.rods.includes(id) || !Game.pay(r.price)) return false;
    this.S.rods.push(id); this.S.rod = id;
    Game.toast(`购买并装备了 ${r.name}`, 'good'); Game.changed(); Game.save(); return true;
  },
  equipRod(id) { if (this.S.rods.includes(id)) { this.S.rod = id; Game.changed(); } },
  buyLine(id) {
    const l = findById(LINES, id);
    if (this.S.lines.includes(id) || !Game.pay(l.price)) return false;
    this.S.lines.push(id); this.S.line = id;
    Game.toast(`购买并装备了 ${l.name}`, 'good'); Game.changed(); Game.save(); return true;
  },
  equipLine(id) { if (this.S.lines.includes(id)) { this.S.line = id; Game.changed(); } },
  buyBait(id, qty) {
    const b = findById(BAITS, id);
    if (b.infinite || !Game.pay(b.price * qty)) return false;
    this.S.baits[id] = (this.S.baits[id] || 0) + qty;
    Game.toast(`购买了 ${b.name} ×${qty}`, 'good'); Game.changed(); return true;
  },
  equipBait(id) {
    if (this.baitCount(id) > 0) { this.S.bait = id; Game.changed(); }
    else Game.toast('这种鱼饵已经没有了', 'warn');
  },
  buyItem(id, qty) {
    const it = ITEM_BY_ID[id];
    qty = qty || 1;
    if (it.type === 'permanent') {
      if (this.S.perms[id] || !Game.pay(it.price)) return false;
      this.S.perms[id] = true;
      Game.toast(`获得了 ${it.name}！`, 'good');
      Inv.afterChange(); Game.save(); return true;
    }
    if (!Game.pay(it.price * qty)) return false;
    this.S.items[id] = (this.S.items[id] || 0) + qty;
    Game.toast(`购买了 ${it.name} ×${qty}`, 'good'); Game.changed(); return true;
  },
  useItem(id, quiet) {
    const S = this.S;
    if (!(S.items[id] > 0)) return false;
    const isIce = S.scene === 'ice';
    switch (id) {
      case 'luckbell':
        S.buffs.luckUntil = Math.max(Date.now(), S.buffs.luckUntil || 0) + 10 * 60 * 1000;
        if (!quiet) Game.toast(`叮铃～ 幸运 +30%（剩余 ${Math.round(this.luckBuffLeft() / 60000)} 分钟）`, 'good'); break;
      case 'raincharm': Game.setWeather(isIce ? 'snow' : 'rain'); Game.toast(isIce ? '雪花飘落下来了' : '下起了小雨', 'good'); break;
      case 'sundoll': Game.setWeather('sunny'); Game.toast('天空放晴了', 'good'); break;
      case 'fogbottle': Game.setWeather('fog'); Game.toast('四周弥漫起大雾……', 'good'); break;
      default: {
        const used = CF.first('item.use', id, quiet); // 别的模块新增的道具，在这里处理
        if (!used) return false;
      }
    }
    S.items[id]--;
    Game.changed(); if (!quiet) Game.save();
    return true;
  },
};

CF.module({
  id: 'fishing',
  state: () => ({
    rods: ['bamboo'], rod: 'bamboo', lines: ['basic'], line: 'basic',
    baits: { worm: 20 }, bait: 'dough',
    items: { luckbell: 1 }, perms: {},
    dex: {},
  }),
  shared: {
    settings: { auto: true, autoSell: true },
    stats: { casts: 0, caught: 0, escaped: 0, earned: 0 },
    buffs: { luckUntil: 0 },
  },
  offlinePriority: 80,
  init() {
    CF.on('coins', n => { if (n > 0) Game.S.stats.earned += n; });
    CF.on('mode', () => Fishing.resetFsm());
    CF.on('scene', () => Fishing.resetFsm());
    CF.modes.define('fish', {
      name: '钓鱼', hud: ['center-ctl', 'log'],
      render: dt => Renderer.frameOutdoor(dt),
      action: () => Fishing.action(),
    });
  },
  tick(dt) {
    if (!CF.modes.is('fish') || CF.first('fish.paused')) return;
    Fishing.update(dt);
  },
  offline(ctx) { Fishing.offline(ctx); },
  reset() { Fishing.resetFsm(); },
});
