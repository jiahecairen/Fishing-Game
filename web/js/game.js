// ===== 游戏逻辑：状态、钓鱼循环、商店、仓库、存档、离线挂机 =====
'use strict';

const SAVE_KEY = 'catfish_save_v1';
const TIME_SCALE = 1;            // 现实 1 秒 = 游戏 1 分钟（一天 24 分钟）
const OFFLINE_CAP_SEC = 8 * 3600; // 离线收益最多 8 小时

const rand = (a, b) => a + Math.random() * (b - a);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
function weightedPick(entries) { // [[key, weight]]
  const total = entries.reduce((s, e) => s + e[1], 0);
  if (total <= 0) return entries[0] && entries[0][0];
  let r = Math.random() * total;
  for (const [k, w] of entries) { if ((r -= w) <= 0) return k; }
  return entries[entries.length - 1][0];
}

function newState() {
  return {
    v: 1,
    coins: 300,
    level: 1, exp: 0,
    gameMinutes: 6 * 60, // 第 1 天 06:00
    weather: 'sunny', weatherUntil: 9 * 60,
    scene: 'lake', unlockedScenes: ['lake'],
    rods: ['bamboo'], rod: 'bamboo',
    lines: ['basic'], line: 'basic',
    baits: { worm: 20 }, bait: 'dough',
    items: { luckbell: 1 }, perms: {},
    bagCap: 25, bagLv: 0,
    bag: [], whs: { lake: [] }, whCaps: { lake: 60 }, whLvs: { lake: 0 }, hold: [],
    dex: {},
    buffs: { luckUntil: 0 },
    settings: { auto: true, autoSell: true, sound: true, cheatBtn: true },
    stats: { casts: 0, caught: 0, escaped: 0, earned: 0 },
    uid: 1,
    lastSave: Date.now(),
  };
}

// 仓库是「每个地点各一个」：S.warehouse / S.whCap / S.whLv 总是指向当前所在地点
function defineLocalStorage(S) {
  const def = (k, store, dflt) => Object.defineProperty(S, k, {
    get() { if (this[store][this.scene] === undefined) this[store][this.scene] = (typeof dflt === 'function' ? dflt() : dflt); return this[store][this.scene]; },
    set(v) { this[store][this.scene] = v; }, enumerable: false, configurable: true,
  });
  def('warehouse', 'whs', () => []); def('whCap', 'whCaps', 60); def('whLv', 'whLvs', 0);
}

const Game = {
  S: null,
  fsm: { phase: 'idle', t: 0, dur: 0 },
  listeners: {},
  _dirty: false,

  on(ev, fn) { (this.listeners[ev] = this.listeners[ev] || []).push(fn); },
  emit(ev, data) { (this.listeners[ev] || []).forEach(fn => { try { fn(data); } catch (e) { console.error(e); } }); },
  toast(msg, kind) { this.emit('toast', { msg, kind }); },
  changed() { this._dirty = true; this.emit('change'); },

  // ---------- 存档 ----------
  load() {
    let raw = null;
    try {
      if (window.__NATIVE_SAVE_B64__) {
        const bin = atob(window.__NATIVE_SAVE_B64__);
        raw = new TextDecoder().decode(Uint8Array.from(bin, c => c.charCodeAt(0)));
      }
    } catch (e) { console.warn('native save decode failed', e); }
    if (!raw) { try { raw = localStorage.getItem(SAVE_KEY); } catch (e) { /* ignore */ } }
    let s = null;
    if (raw) { try { s = JSON.parse(raw); } catch (e) { s = null; } }
    const base = newState();
    if (s && !s.whs) { // 旧存档：只有一个仓库 → 放到当前所在地点
      const sc = s.scene || 'lake';
      s.whs = { [sc]: s.warehouse || [] }; s.whCaps = { [sc]: s.whCap || 100 }; s.whLvs = { [sc]: s.whLv || 0 };
    }
    if (s) { delete s.warehouse; delete s.whCap; delete s.whLv; }
    this.S = s ? Object.assign(base, s) : base;
    defineLocalStorage(this.S);
    // 补齐嵌套字段
    this.S.settings = Object.assign(newState().settings, this.S.settings || {});
    this.S.stats = Object.assign(newState().stats, this.S.stats || {});
    this.S.buffs = Object.assign({ luckUntil: 0 }, this.S.buffs || {});
    Adv.migrate(this.S);
    return !!s;
  },
  save() {
    const S = this.S;
    S.lastSave = Date.now();
    const json = JSON.stringify(S);
    try { localStorage.setItem(SAVE_KEY, json); } catch (e) { /* ignore */ }
    try {
      if (window.webkit && window.webkit.messageHandlers && window.webkit.messageHandlers.save) {
        window.webkit.messageHandlers.save.postMessage(json);
      }
    } catch (e) { /* ignore */ }
    this._dirty = false;
  },
  reset() {
    try { localStorage.removeItem(SAVE_KEY); } catch (e) { /* ignore */ }
    window.__NATIVE_SAVE_B64__ = null;
    this.S = newState();
    defineLocalStorage(this.S);
    Adv.migrate(this.S);
    Adv.battle = null;
    this.fsm = { phase: 'idle', t: 0, dur: 0 };
    this.save();
    this.changed();
  },

  // ---------- 查询 ----------
  rod() { return findById(RODS, this.S.rod); },
  line() { return findById(LINES, this.S.line); },
  bait() { return findById(BAITS, this.S.bait); },
  scene() { return findById(SCENES, this.S.scene); },
  hour(gm) { return ((gm === undefined ? this.S.gameMinutes : gm) / 60) % 24; },
  day(gm) { return Math.floor((gm === undefined ? this.S.gameMinutes : gm) / 1440) + 1; },
  phase(gm) { return phaseOf(this.hour(gm)); },
  dayIndex(gm) { return Math.floor((gm === undefined ? this.S.gameMinutes : gm) / 1440); },
  date(gm) {
    const d = this.dayIndex(gm), mi = Math.floor(d / MONTH_DAYS);
    return { d, year: Math.floor(mi / 12) + 1, month: mi % 12 + 1, dom: d % MONTH_DAYS + 1, monthIndex: mi, season: Math.floor((mi % 12) / 3) };
  },
  season(gm) { return SEASONS[this.date(gm).season].id; },
  dateStr() { const t = this.date(); return `第${t.year}年 ${SEASONS[t.season].icon}${SEASONS[t.season].name} ${t.month}月${t.dom}日`; },
  weatherName() {
    const w = WEATHERS[this.S.weather];
    return (this.phase() === 'night' && w.nightName) ? w.nightName : w.name;
  },
  weatherIcon() {
    const w = WEATHERS[this.S.weather];
    return (this.phase() === 'night' && w.nightIcon) ? w.nightIcon : w.icon;
  },
  timeStr() {
    const m = Math.floor(this.S.gameMinutes) % 1440;
    return String(Math.floor(m / 60)).padStart(2, '0') + ':' + String(m % 60).padStart(2, '0');
  },
  luckBuffLeft(now) { return Math.max(0, (this.S.buffs.luckUntil || 0) - (now || Date.now())); },
  luck(now) { return this.rod().luck + Adv.gearLuck() + (this.luckBuffLeft(now) > 0 ? 0.3 : 0); },
  control() { return this.rod().control + this.line().control; },
  expNeed(lv) { return Math.floor(40 * Math.pow(lv || this.S.level, 1.6)); },
  baitCount(id) { const b = findById(BAITS, id); return b.infinite ? Infinity : (this.S.baits[id] || 0); },
  upgradeCost(type) {
    const u = UPGRADES[type], lv = type === 'bag' ? this.S.bagLv : this.S.whLv;
    return Math.round(u.base * Math.pow(u.growth, lv) / 10) * 10;
  },
  autoSellActive() { return !!(this.S.perms.luckycat && this.S.settings.autoSell); },
  canStore() {
    const S = this.S;
    return S.bag.length < S.bagCap || (S.perms.autostore && S.warehouse.length < S.whCap) || this.autoSellActive();
  },

  // ---------- 天气与时间 ----------
  rollWeather(scene, gm) {
    const sc = findById(SCENES, scene || this.S.scene), se = SEASON_WEATHER[this.season(gm)] || {};
    const w = Object.entries(sc.weather).map(([k, v]) => [k, v * (se[k] || 1)]);
    if (this.season(gm) === 'winter' && !sc.weather.snow && !['coral', 'abyss'].includes(sc.id)) w.push(['snow', 22]);
    this.S.weather = weightedPick(w);
    this.S.weatherUntil = (gm === undefined ? this.S.gameMinutes : gm) + rand(120, 360);
  },
  setWeather(w, quiet) {
    this.S.weather = w;
    this.S.weatherUntil = this.S.gameMinutes + rand(180, 300);
    if (!quiet) this.emit('weather');
    this.changed();
  },

  // ---------- 钓鱼核心公式 ----------
  biteTime(phase, weather) {
    const p = phase || this.phase();
    const w = WEATHERS[weather || this.S.weather];
    let phaseMod = 1;
    if (p === 'dawn' || p === 'dusk') phaseMod = 0.9;
    if (p === 'night') phaseMod = this.S.perms.glowfloat ? 0.85 : 1.2;
    const frenzy = (this.S.buffs.frenzyUntil || 0) > Date.now() ? 0.5 : 1;
    return 7 * this.rod().speed * this.bait().bite * w.bite * phaseMod * frenzy * (1 - Adv.fishMod('bite')) * rand(0.55, 1.45);
  },
  fishPool(scene, phase, weather, tier) {
    return FISH.filter(f => f.scenes.includes(scene)
      && (!f.times || f.times.includes(phase))
      && (!f.weathers || f.weathers.includes(weather))
      && (!f.seasons || f.seasons.includes(this.season()))
      && (f.tier || 1) <= tier);
  },
  rollFish(opts) {
    const o = Object.assign({ scene: this.S.scene, phase: this.phase(), weather: this.S.weather, luck: this.luck() }, opts || {});
    const tr = o.noTreasure ? null : Adv.rollTreasure(o.luck);
    if (tr) return tr;
    const rod = this.rod(), bait = this.bait(), w = WEATHERS[o.weather];
    const pool = this.fishPool(o.scene, o.phase, o.weather, rod.tier);
    const entries = pool.map(f => {
      let wt = RARITY[f.rarity].weight * bait.mult[f.rarity];
      if (f.rarity === 'junk') wt *= Math.max(0.2, 1 - rod.luck * 1.5);
      if (f.rarity === 'rare') wt *= w.rare * (1 + o.luck);
      if (f.rarity === 'epic') wt *= w.rare * (1 + o.luck * 2);
      if (f.rarity === 'legendary') wt *= w.rare * (1 + o.luck * 3);
      if (['rare', 'epic', 'legendary'].includes(f.rarity)) wt *= 1 + Adv.fishMod('rare');
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
    if (fish.treasure) return { uid: this.S.uid++, id: fish.id, size: 0, value: 0, treasure: true, ts: Date.now() };
    const r = Math.pow(Math.random(), perfect ? 0.7 : 1.5);
    const size = Math.round((fish.min + (fish.max - fish.min) * r) * 10) / 10;
    const value = Math.max(1, Math.round(fish.price * (0.6 + 0.8 * r) * (1 + 0.02 * (this.S.level - 1)) * (1 + Adv.fishMod('price'))));
    return { uid: this.S.uid++, id: fish.id, size, value, star: r > 0.9, ts: Date.now() };
  },
  // 收下渔获；返回 {stored:'bag'|'wh'|'sold', isNew}
  receive(item, quiet) {
    const S = this.S, fish = FISH_BY_ID[item.id];
    if (fish.treasure) { Adv.gainTreasure(item.id, quiet); return { stored: 'treasure', isNew: false }; }
    const d = S.dex[item.id] || (S.dex[item.id] = { count: 0, max: 0, first: Date.now() });
    const isNew = d.count === 0;
    if (isNew && item.id === 'lakegod') setTimeout(() => Adv.checkHidden(), 0);
    d.count++; d.max = Math.max(d.max, item.size);
    Quests.onCatch(item);
    S.stats.caught++;
    this.gainExp(RARITY[fish.rarity].exp * (isNew ? 2 : 1), quiet);

    let stored = null;
    if (S.bag.length < S.bagCap) { S.bag.push(item); stored = 'bag'; }
    else if (S.perms.autostore && S.warehouse.length < S.whCap) { S.warehouse.push(item); stored = 'wh'; }
    else if (this.autoSellActive()) {
      // 招财猫：满仓时把普通鱼/杂物自动挂到寄卖行（没开通或挂满时就放生）
      const cheapIdx = S.bag.findIndex(x => ['junk', 'common'].includes(FISH_BY_ID[x.id].rarity));
      let out = item;
      if (!['junk', 'common'].includes(fish.rarity) && cheapIdx >= 0) { out = S.bag.splice(cheapIdx, 1)[0]; S.bag.push(item); }
      if (typeof Market !== 'undefined' && Market.autoList(out)) stored = out === item ? 'listed' : 'bag';
      else { this.gainExp(Math.max(1, Math.round(RARITY[FISH_BY_ID[out.id].rarity].exp * 0.5)), true); stored = out === item ? 'released' : 'bag'; }
    }
    return { stored, isNew };
  },
  addCoins(n) { this.S.coins += n; this.S.stats.earned += n; },
  gainExp(n, quiet) {
    const S = this.S;
    S.exp += n;
    while (S.exp >= this.expNeed(S.level)) {
      S.exp -= this.expNeed(S.level);
      S.level++;
      const bonus = S.level * 50;
      S.coins += bonus;
      if (!quiet) this.emit('levelup', { level: S.level, bonus });
    }
  },
  consumeBait(quiet) {
    const S = this.S, b = this.bait();
    if (b.infinite) return;
    if ((S.baits[b.id] || 0) > 0) {
      S.baits[b.id]--;
      if (S.baits[b.id] === 0) {
        S.bait = 'dough';
        if (!quiet) this.toast(`${b.name}用完了，已换回面团`, 'warn');
      }
    } else {
      S.bait = 'dough';
    }
  },

  // ---------- 实时钓鱼状态机 ----------
  // idle → casting → waiting → bite → reeling → result → (auto) casting
  startCast() {
    if (!this.canStore()) {
      this.fsm = { phase: 'idle', t: 0, dur: 0, blocked: true };
      this.emit('status');
      return false;
    }
    this.consumeBait();
    this.S.stats.casts++;
    this.fsm = { phase: 'casting', t: 0, dur: 1.1, bait: this.S.bait };
    this.emit('cast');
    this.changed();
    return true;
  },
  // 玩家点击（按钮/空格/画面）
  action() {
    if (this.S.mode !== 'fish') return;
    const f = this.fsm;
    if (f.phase === 'idle' || f.phase === 'result' && !this.S.settings.auto) { this.startCast(); return; }
    if (f.phase === 'bite') { this.reel(true); return; }
    if (f.phase === 'waiting' && !this.S.settings.auto) { // 手动模式提前收竿
      this.fsm = { phase: 'idle', t: 0, dur: 0 };
      this.toast('收回了鱼线');
      this.emit('status');
    }
  },
  reel(perfect) {
    const f = this.fsm;
    const fish = f.fish;
    const esc = this.escapeChance(fish) * (perfect ? 0.35 : 1);
    const escaped = Math.random() < esc;
    this.fsm = { phase: 'reeling', t: 0, dur: 1.3, fish, perfect, escaped };
    this.emit('reel', { perfect });
  },
  update(dt) {
    const S = this.S;
    S.gameMinutes += dt * TIME_SCALE;
    if (S.gameMinutes >= S.weatherUntil) { this.rollWeather(); this.emit('weather'); this.changed(); }
    Adv.update(dt);
    if (S.mode !== 'fish' || Adv.battle) return;

    const f = this.fsm;
    f.t += dt;
    switch (f.phase) {
      case 'idle':
        if (S.settings.auto) {
          f.wait = (f.wait || 0) + dt;
          if (f.wait > (f.blocked ? 3 : 0.6)) this.startCast();
        }
        break;
      case 'casting':
        if (f.t >= f.dur) {
          const fish = this.rollFish();
          this.fsm = { phase: 'waiting', t: 0, dur: this.biteTime(), fish };
          this.emit('status');
        }
        break;
      case 'waiting':
        if (f.t >= f.dur) {
          this.fsm = { phase: 'bite', t: 0, dur: 1.6, fish: f.fish, autoAt: rand(0.55, 1.0) };
          this.emit('bite');
        }
        break;
      case 'bite':
        if (S.settings.auto && f.t >= f.autoAt) this.reel(false);
        else if (f.t >= f.dur) {
          S.stats.escaped++;
          this.fsm = { phase: 'result', t: 0, dur: 1.2, escaped: true, missed: true };
          this.emit('escape', { missed: true });
        }
        break;
      case 'reeling':
        if (f.t >= f.dur) {
          if (f.escaped) {
            S.stats.escaped++;
            this.fsm = { phase: 'result', t: 0, dur: 1.2, escaped: true };
            this.emit('escape', { fish: f.fish });
          } else {
            const item = this.makeCatch(f.fish, f.perfect);
            const res = this.receive(item);
            this.fsm = { phase: 'result', t: 0, dur: 1.6, item, fish: f.fish };
            this.emit('catch', { item, fish: f.fish, perfect: f.perfect, ...res });
          }
          this.changed();
        }
        break;
      case 'result':
        if (f.t >= f.dur) {
          if (S.settings.auto) this.startCast();
          else { this.fsm = { phase: 'idle', t: 0, dur: 0 }; this.emit('status'); }
        }
        break;
    }
  },

  // ---------- 离线挂机 ----------
  simulateOffline(seconds) {
    const S = this.S;
    const report = { seconds, casts: 0, caught: 0, escaped: 0, sold: 0, coins: 0, newFish: [], best: null, stopped: false, levelFrom: S.level, startCoins: S.coins };
    if (seconds < 30) return null;
    seconds = Math.min(seconds, OFFLINE_CAP_SEC);
    report.seconds = seconds;
    report.market = Market.offline(seconds);
    const tr0 = Object.assign({}, S.treasure);
    if (S.mode !== 'fish') {
      const gm0 = S.gameMinutes;
      report.adv = Adv.simulateOffline(seconds);
      S.gameMinutes = gm0 + (seconds - report.adv.left) * TIME_SCALE;
      if (S.gameMinutes >= S.weatherUntil) this.rollWeather();
      seconds = report.adv.left;
      report.levelTo = S.level;
      if (seconds < 30 || S.mode !== 'fish') { S.gameMinutes += seconds * TIME_SCALE; return report; }
    }
    const startGM = S.gameMinutes, startTs = S.lastSave || Date.now();
    if (!S.settings.auto) {
      S.gameMinutes += seconds * TIME_SCALE;
      this.rollWeather();
      report.idleOff = true;
      return report;
    }
    let t = 0, iter = 0;
    while (t < seconds && iter < 8000) {
      iter++;
      const gm = startGM + t * TIME_SCALE;
      S.gameMinutes = gm;
      if (gm >= S.weatherUntil) this.rollWeather(S.scene, gm);
      if (!this.canStore()) { report.stopped = true; break; }
      const phase = phaseOf((gm / 60) % 24);
      const cycle = 1.1 + this.biteTime(phase, S.weather) + 0.8 + 1.3 + 1.6;
      t += cycle;
      if (t > seconds) break;
      this.consumeBait(true);
      S.stats.casts++; report.casts++;
      const luck = this.rod().luck + Adv.gearLuck() + ((startTs + t * 1000) < S.buffs.luckUntil ? 0.3 : 0);
      const fish = this.rollFish({ phase, weather: S.weather, luck });
      if (Math.random() < this.escapeChance(fish, S.weather)) { S.stats.escaped++; report.escaped++; continue; }
      const item = this.makeCatch(fish, false);
      const before = S.coins;
      const res = this.receive(item, true);
      if (fish.treasure) continue;
      report.caught++;
      if (res.stored === 'sold') report.sold++;
      report.coins += S.coins - before;
      if (res.isNew) report.newFish.push(fish.id);
      if (!report.best || RARITY_ORDER.indexOf(fish.rarity) > RARITY_ORDER.indexOf(FISH_BY_ID[report.best.id].rarity)
        || (fish.rarity === FISH_BY_ID[report.best.id].rarity && item.value > report.best.value)) report.best = item;
    }
    S.gameMinutes = startGM + seconds * TIME_SCALE;
    if (S.gameMinutes >= S.weatherUntil) this.rollWeather();
    report.levelTo = S.level;
    report.treasures = Object.keys(S.treasure).filter(k => S.treasure[k] > (tr0[k] || 0)).map(k => [k, S.treasure[k] - (tr0[k] || 0)]);
    return report;
  },

  // ---------- 背包 / 仓库 ----------
  _take(from, uids) {
    const arr = from === 'bag' ? this.S.bag : this.S.warehouse;
    const set = new Set(uids), taken = [];
    for (let i = arr.length - 1; i >= 0; i--) if (set.has(arr[i].uid)) taken.push(arr.splice(i, 1)[0]);
    return taken.reverse();
  },
  store(k) { const S = this.S; return k === 'bag' ? S.bag : k === 'hold' ? S.hold : S.warehouse; },
  storeCap(k) { const S = this.S; return k === 'bag' ? S.bagCap : k === 'hold' ? Adv.holdCap() : S.whCap; },
  storeName(k) { return { bag: '背包', wh: '仓库', hold: '船舱' }[k]; },
  _take(from, uids) {
    const arr = this.store(from);
    const set = new Set(uids), taken = [];
    for (let i = arr.length - 1; i >= 0; i--) if (set.has(arr[i].uid)) taken.push(arr.splice(i, 1)[0]);
    return taken.reverse();
  },
  // 放生：鱼回到水里，获得少量经验（取代以前的“一键出售”）
  release(from, uids) {
    const items = this._take(from, uids);
    let exp = 0;
    for (const x of items) exp += Math.max(1, Math.round(RARITY[FISH_BY_ID[x.id].rarity].exp * 0.5));
    if (items.length) { this.gainExp(exp); this.emit('released', { count: items.length, exp }); }
    this.afterStorageChange();
    return items.length;
  },
  releaseWhere(from, pred) { return this.release(from, this.store(from).filter(x => pred(FISH_BY_ID[x.id], x)).map(x => x.uid)); },
  move(from, uids, toKey) {
    const S = this.S;
    toKey = toKey || (from === 'bag' ? 'wh' : 'bag');
    if (toKey === 'hold' && S.boat < 1) { this.toast('还没有船', 'warn'); return 0; }
    const to = this.store(toKey), room = this.storeCap(toKey) - to.length;
    if (room <= 0) { this.toast(`${this.storeName(toKey)}已满`, 'warn'); return 0; }
    const items = this._take(from, uids.slice(0, room));
    to.push(...items);
    if (uids.length > room) this.toast(`空间不足，只移动了 ${room} 条`, 'warn');
    this.afterStorageChange();
    return items.length;
  },
  afterStorageChange() {
    if (this.fsm.blocked && this.canStore()) this.fsm.blocked = false;
    this.changed();
  },

  // ---------- 商店 ----------
  pay(price) {
    if (this.S.coins < price) { this.toast('金币不足喵～', 'warn'); return false; }
    this.S.coins -= price; return true;
  },
  buyRod(id) {
    const r = findById(RODS, id);
    if (this.S.rods.includes(id) || !this.pay(r.price)) return false;
    this.S.rods.push(id); this.S.rod = id;
    this.toast(`购买并装备了 ${r.name}`, 'good'); this.changed(); this.save(); return true;
  },
  equipRod(id) { if (this.S.rods.includes(id)) { this.S.rod = id; this.changed(); } },
  buyLine(id) {
    const l = findById(LINES, id);
    if (this.S.lines.includes(id) || !this.pay(l.price)) return false;
    this.S.lines.push(id); this.S.line = id;
    this.toast(`购买并装备了 ${l.name}`, 'good'); this.changed(); this.save(); return true;
  },
  equipLine(id) { if (this.S.lines.includes(id)) { this.S.line = id; this.changed(); } },
  buyBait(id, qty) {
    const b = findById(BAITS, id);
    if (b.infinite || !this.pay(b.price * qty)) return false;
    this.S.baits[id] = (this.S.baits[id] || 0) + qty;
    this.toast(`购买了 ${b.name} ×${qty}`, 'good'); this.changed(); return true;
  },
  equipBait(id) {
    if (this.baitCount(id) > 0) { this.S.bait = id; this.changed(); }
    else this.toast('这种鱼饵已经没有了', 'warn');
  },
  buyItem(id, qty) {
    const it = ITEM_BY_ID[id];
    qty = qty || 1;
    if (it.type === 'permanent') {
      if (this.S.perms[id] || !this.pay(it.price)) return false;
      this.S.perms[id] = true;
      this.toast(`获得了 ${it.name}！`, 'good');
      this.afterStorageChange(); this.save(); return true;
    }
    if (!this.pay(it.price * qty)) return false;
    this.S.items[id] = (this.S.items[id] || 0) + qty;
    this.toast(`购买了 ${it.name} ×${qty}`, 'good'); this.changed(); return true;
  },
  useItem(id, quiet) {
    const S = this.S, it = ITEM_BY_ID[id];
    if (!(S.items[id] > 0)) return false;
    const isIce = S.scene === 'ice';
    switch (id) {
      case 'luckbell':
        S.buffs.luckUntil = Math.max(Date.now(), S.buffs.luckUntil || 0) + 10 * 60 * 1000;
        if (!quiet) this.toast(`叮铃～ 幸运 +30%（剩余 ${Math.round(this.luckBuffLeft() / 60000)} 分钟）`, 'good'); break;
      case 'raincharm': this.setWeather(isIce ? 'snow' : 'rain'); this.toast(isIce ? '雪花飘落下来了' : '下起了小雨', 'good'); break;
      case 'sundoll': this.setWeather('sunny'); this.toast('天空放晴了', 'good'); break;
      case 'fogbottle': this.setWeather('fog'); this.toast('四周弥漫起大雾……', 'good'); break;
      default: return false;
    }
    S.items[id]--;
    this.changed(); if (!quiet) this.save();
    return true;
  },
  buyUpgrade(type) {
    const S = this.S, u = UPGRADES[type];
    const cur = type === 'bag' ? S.bagCap : S.whCap;
    if (cur >= u.max) { this.toast('已经是最大容量了', 'warn'); return false; }
    if (!this.pay(this.upgradeCost(type))) return false;
    if (type === 'bag') { S.bagCap += u.step; S.bagLv++; } else { S.whCap += u.step; S.whLv++; }
    this.toast(`${u.name}成功！`, 'good');
    this.afterStorageChange(); this.save(); return true;
  },
  unlockScene(id) {
    const sc = findById(SCENES, id);
    if (this.S.unlockedScenes.includes(id) || !this.pay(sc.price)) return false;
    this.S.unlockedScenes.push(id);
    this.toast(`解锁了新场景：${sc.name}`, 'good');
    this.switchScene(id); return true;
  },
  switchScene(id) {
    if (this.S.mode !== 'fish') return;
    if (!this.S.unlockedScenes.includes(id) || this.S.scene === id) return;
    this.S.scene = id;
    const sc = findById(SCENES, id);
    if (!sc.weather[this.S.weather]) this.rollWeather();
    this.fsm = { phase: 'idle', t: 0, dur: 0 };
    this.emit('scene');
    if (id === 'abyss' && this.S.story.ending === 'spare') Adv.story('abyssFish');
    this.changed(); this.save();
  },
};
