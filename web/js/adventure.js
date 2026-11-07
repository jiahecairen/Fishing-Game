// ===== 冒险系统 v0.3：属性/天赋、装备强化与合成、行动点战斗、航行、副本、隐藏内容 =====
'use strict';

const STEP_TIME = 0.8;
const DUNGEON_WALK = 4;
const ROOMS_PER_FLOOR = 3;

const Adv = {
  battle: null,
  _endTimer: 0,
  get S() { return Game.S; },
  storyActive() { return typeof Story !== 'undefined' && !!Story.active; },
  eventActive() { return typeof Events !== 'undefined' && !!Events.blocking(); },

  // ---------- 存档 ----------
  defaults() {
    return {
      hero: { hp: 100, equip: { weapon: null, hat: null, armor: null, boots: null, charm: null } },
      attrs: { str: 0, vit: 0, tou: 0, agi: 0 }, talents: {}, bonusAttr: 0, bonusTal: 0,
      gear: [], gearCap: 80,
      treasure: { key: 0, chest_wood: 0, chest_silver: 0, chest_gold: 0, map: 0, mapPiece: 0 },
      boat: 0, boatUps: { sail: 0, hold: 0, hull: 0 }, addr: [], visited: [],
      mode: 'fish', voyage: null, dungeon: null,
      cleared: {}, story: { seen: {}, ending: null },
      advStats: { battles: 0, wins: 0, kills: 0 },
      hiddenOpen: {}, flags: { paoFed: 0, letters: 0 }, cheat: { god: false, oneHit: false },
    };
  },
  migrate(S) {
    const d = this.defaults();
    for (const k of Object.keys(d)) if (S[k] === undefined) S[k] = d[k];
    S.hero = Object.assign(d.hero, S.hero); S.hero.equip = Object.assign(d.hero.equip, S.hero.equip); delete S.hero.mp;
    for (const k of ['attrs', 'treasure', 'boatUps', 'story', 'advStats', 'flags', 'cheat']) S[k] = Object.assign(d[k], S[k]);
    S.story.seen = S.story.seen || {};
    if (S.settings.autoEat === undefined) S.settings.autoEat = true;
    if (!S.settings.battleSpeed) S.settings.battleSpeed = 1;
    for (const g of S.gear) { if (g.e === undefined) g.e = 0; if (g.q === undefined) g.q = 0; }
    for (const sc of S.unlockedScenes) if (sc !== 'lake' && !S.addr.includes(sc)) S.addr.push(sc);
    if (S.visited.includes('abyss') && !S.unlockedScenes.includes('abyss')) S.unlockedScenes.push('abyss');
    if (S.mode === 'voyage' && !S.voyage) S.mode = 'fish';
    if (S.mode === 'dungeon' && !S.dungeon) S.mode = 'fish';
    if (S.dungeon && ['battle', 'event', 'choice', 'bossTalk'].includes(S.dungeon.phase)) { S.dungeon.phase = 'walk'; S.dungeon.t = 0; }
    if (S.voyage) { S.voyage.inBattle = false; S.voyage.inEvent = false; }
    if (!S.gear.length && !S.story.seen._starter) {
      S.story.seen._starter = true;
      for (const slot of SLOT_ORDER) { const g = { uid: S.uid++, slot, tier: 1, q: 0, e: 0 }; S.gear.push(g); S.hero.equip[slot] = g.uid; }
    }
    if (S.boatHp === undefined) S.boatHp = this.maxBoatHp();
    if (!S.settings.battleMode) S.settings.battleMode = 'auto';
    Market.migrate(S); Cook.migrate(S); Quests.migrate(S);
    this.clampHero();
  },

  // ---------- 套装 ----------
  setCounts() {
    const c = {};
    for (const g of this.equipped()) if (g.u && UNIQUES[g.u].set) c[UNIQUES[g.u].set] = (c[UNIQUES[g.u].set] || 0) + 1;
    return c;
  },
  setBonus() {
    const c = this.setCounts(), b = { luck: 0, bite: 0, apRegen: 0, atkPct: 0, hpPct: 0, regen: 0, thorns: 0, crit: 0, critDmg: 0, critAp: 0 };
    if (c.angler >= 2) { b.luck += 0.2; b.bite += 0.15; }
    if (c.angler >= 3) { b.apRegen += 1; b.atkPct += 0.1; }
    if (c.tide >= 2) b.hpPct += 0.15;
    if (c.tide >= 3) { b.regen += 0.05; b.thorns += 0.15; }
    if (c.star >= 2) b.crit += 0.12;
    if (c.star >= 3) { b.critDmg += 0.6; b.critAp += 1; }
    return b;
  },

  // ---------- 属性 ----------
  equipped() { const e = this.S.hero.equip; return SLOT_ORDER.map(s => this.S.gear.find(g => g.uid === e[s])).filter(Boolean); },
  effects() {
    const fx = {};
    for (const g of this.equipped()) if (g.u) { const U = UNIQUES[g.u]; if (U.effect) fx[U.effect] = (fx[U.effect] || 0) + U.eff; }
    const sb = this.setBonus();
    if (sb.regen) fx.regen = (fx.regen || 0) + sb.regen;
    if (sb.thorns) fx.thorns = (fx.thorns || 0) + sb.thorns;
    if (sb.apRegen) fx.apRegen = sb.apRegen;
    if (sb.critAp) fx.critAp = sb.critAp;
    const fb = typeof Cook !== 'undefined' && Cook.activeBuff();
    if (fb && fb.regen) fx.regen = (fx.regen || 0) + fb.regen;
    return fx;
  },
  talentRank(id) { return this.S.talents[id] || 0; },
  talentVal(id) { const t = TALENTS.find(x => x.id === id); return t ? this.talentRank(id) * t.per : 0; },
  stats() {
    const S = this.S, s = Object.assign({}, HERO_BASE, { luck: 0 });
    for (const [k, n] of Object.entries(S.attrs)) if (n) ATTRS[k].apply(s, n);
    for (const g of this.equipped()) { const gs = gearStats(g); for (const k in gs) s[k] = (s[k] || 0) + gs[k]; }
    const sb = this.setBonus(), fb = typeof Cook !== 'undefined' ? Cook.activeBuff() : null;
    s.atk *= 1 + this.talentVal('c1') + sb.atkPct + (fb && fb.atk || 0);
    s.maxHp *= 1 + sb.hpPct; s.crit += sb.crit; s.critDmg += sb.critDmg;
    if (fb && fb.def) s.def *= 1 + fb.def;
    if (fb && fb.spd) s.spd *= 1 + fb.spd;
    s.def *= 1 + this.talentVal('s1'); s.maxHp *= 1 + this.talentVal('s1') * 0.8;
    s.crit += this.talentVal('c3'); s.critDmg += this.talentVal('c3') * 2.5;
    const fx = this.effects();
    if (fx.critDmg) s.critDmg += fx.critDmg;
    s.apStart += this.talentRank('c5') + (fx.apStart || 0);
    if (S.dungeon && S.dungeon.buff) s.atk *= 1 + S.dungeon.buff;
    s.maxHp = Math.round(s.maxHp); s.atk = Math.round(s.atk); s.def = Math.round(s.def); s.spd = Math.round(s.spd * 10) / 10;
    s.crit = Math.min(0.75, s.crit);
    this._maxHp = s.maxHp;
    return s;
  },
  power() { const s = this.stats(); return Math.round(s.atk * 2 + s.def * 1.5 + s.maxHp / 5 + s.spd * 2 + s.crit * 100); },
  gearLuck() {
    try {
      let l = 0; for (const g of this.equipped()) l += gearStats(g).luck || 0;
      const fb = Cook.activeBuff();
      return l + this.setBonus().luck + (fb && fb.luck || 0);
    } catch (e) { return 0; }
  },
  // 钓鱼相关的天赋/装备加成（game.js 使用）
  fishMod(k) {
    if (!this.S || !this.S.talents) return 0;
    if (k === 'bite') return Math.min(0.6, this.talentVal('f1') + this.setBonus().bite);
    if (k === 'treasure') return this.talentVal('f2') + (this.effects().treasure || 0);
    if (k === 'price') return this.talentVal('f3');
    if (k === 'rare') return this.talentVal('f4');
    return 0;
  },
  attrPoints() { const S = this.S; return Math.max(0, S.level - 1 + S.bonusAttr - Object.values(S.attrs).reduce((a, b) => a + b, 0)); },
  talentPoints() { const S = this.S; return Math.max(0, Math.floor(S.level / 2) + S.bonusTal - Object.values(S.talents).reduce((a, b) => a + b, 0)); },
  branchSpent(br) { return TALENTS.filter(t => t.br === br).reduce((s, t) => s + this.talentRank(t.id), 0); },
  addAttr(k, n) {
    n = Math.min(n || 1, this.attrPoints()); if (n <= 0) return;
    this.S.attrs[k] += n; this.clampHero(); Game.changed();
  },
  canLearn(t) { return this.talentPoints() > 0 && this.talentRank(t.id) < t.max && this.branchSpent(t.br) >= t.req; },
  learn(id) {
    const t = TALENTS.find(x => x.id === id); if (!t || !this.canLearn(t)) return;
    this.S.talents[id] = this.talentRank(id) + 1;
    Game.toast(`习得天赋：${t.name}${t.max > 1 ? ' Lv.' + this.S.talents[id] : ''}`, 'good');
    this.clampHero(); Game.changed();
  },
  resetCost() { return 300 + 100 * this.S.level; },
  resetAttrs() {
    if (!Object.values(this.S.attrs).some(v => v)) return;
    if (!Game.pay(this.resetCost())) return;
    this.S.attrs = { str: 0, vit: 0, tou: 0, agi: 0 }; this.clampHero();
    Game.toast('属性点已重置', 'good'); Game.changed(); Game.save();
  },
  resetTalents() {
    if (!Object.keys(this.S.talents).length) return;
    if (!Game.pay(this.resetCost())) return;
    this.S.talents = {}; this.clampHero();
    Game.toast('天赋已重置', 'good'); Game.changed(); Game.save();
  },
  skills() {
    const list = ['punch', 'claw'];
    for (const t of TALENTS) if (t.skill && this.talentRank(t.id)) list.push(t.skill);
    return list;
  },
  heal(hp) {
    const st = this.stats(), H = this.S.hero, h0 = H.hp;
    H.hp = Math.min(st.maxHp, H.hp + (hp || 0));
    return Math.round(H.hp - h0);
  },
  regen(dt, rate) { this.heal(this.stats().maxHp * rate * dt); },
  clampHero() { const st = this.stats(); this.S.hero.hp = Math.min(Math.max(1, this.S.hero.hp || 1), st.maxHp); },

  // ---------- 吃鱼 ----------
  eat(uids) {
    const S = this.S; let hp = 0, n = 0;
    for (const uid of uids) {
      const i = S.bag.findIndex(x => x.uid === uid); if (i < 0) continue;
      const fv = foodValue(S.bag[i]); if (!fv) continue;
      S.bag.splice(i, 1); hp += this.heal(fv.hp); n++;
    }
    if (n) Game.toast(`吃了 ${n} 条鱼：HP +${hp}`, 'good');
    Game.afterStorageChange();
    return n;
  },
  pickFood(missingHp, wantAp) {
    let best = null, bestScore = -Infinity;
    for (const it of this.S.bag) {
      const fv = foodValue(it); if (!fv) continue;
      const score = Math.min(fv.hp, missingHp) - Math.max(0, fv.hp - missingHp) * 0.6 - it.value * 0.002 + (wantAp ? fv.ap * 15 : 0);
      if (score > bestScore) { bestScore = score; best = it; }
    }
    return best;
  },

  // ---------- 宝藏 ----------
  rollTreasure(luck) {
    const k = (1 + (luck || 0)) * (1 + this.fishMod('treasure'));
    const r = Math.random();
    if (r < TREASURE_RATE.map * k) return FISH_BY_ID.map;
    if (r < (TREASURE_RATE.map + TREASURE_RATE.chest) * k) return FISH_BY_ID[SCENE_CHEST[this.S.scene] || 'chest_wood'];
    if (r < (TREASURE_RATE.map + TREASURE_RATE.chest + TREASURE_RATE.key) * k) return FISH_BY_ID.key;
    return null;
  },
  gainTreasure(id, quiet, n) {
    this.S.treasure[id] = (this.S.treasure[id] || 0) + (n || 1);
    if (!quiet) this.story('firstTreasure');
    this.checkHidden();
  },
  progressTier() { return Math.max(1, ...this.S.unlockedScenes.map(s => SCENE_TIER[s] || 1)); },
  newGear(tier, rolls, slot) {
    let q = 0;
    for (let i = 0; i < (rolls || 1); i++) q = Math.max(q, QUALITY.indexOf(weightedPick(QUALITY.map(x => [x, x.w]))));
    return { uid: this.S.uid++, slot: slot || SLOT_ORDER[Math.floor(Math.random() * 5)], tier: clamp(Math.round(tier), 1, 5), q, e: 0 };
  },
  addGear(g, quiet) {
    const S = this.S;
    if (!g.u && S.gear.length >= S.gearCap) {
      const v = gearValue(g); Game.addCoins(v);
      if (!quiet) Game.toast(`装备栏已满，${gearName(g)} 自动卖出 🪙${v}`, 'warn');
      return false;
    }
    S.gear.push(g); return true;
  },
  ownsUnique(u) { return this.S.gear.some(g => g.u === u); },
  giveUnique(u, quiet) {
    if (this.ownsUnique(u)) return null;
    const U = UNIQUES[u];
    const g = { uid: this.S.uid++, u, slot: U.slot, tier: U.tier, q: 4, e: 0 };
    this.S.gear.push(g);
    if (!quiet) Game.toast(`✨ 获得隐藏装备「${U.name}」！`, 'good');
    return g;
  },
  rollLoot(tier, gearTier) {
    const cap = gearTier || this.progressTier(), out = [];
    const coin = [0, rand(200, 600), rand(1000, 3000), rand(4000, 12000), rand(6000, 15000)][tier] * (0.6 + cap * 0.25);
    out.push({ type: 'coins', n: Math.round(coin / 10) * 10 });
    const gearChance = [0, 0.45, 0.65, 0.85, 1][tier];
    for (let i = 0; i < (tier === 4 ? 2 : 1); i++) if (Math.random() < gearChance) {
      const t = tier === 1 ? cap - (Math.random() < 0.5 ? 1 : 0) : tier === 4 ? cap : cap + (tier === 3 && Math.random() < 0.25 ? 1 : 0);
      out.push({ type: 'gear', g: this.newGear(Math.max(1, t), [0, 1, 2, 2, 3][tier]) });
    }
    const pool = [['bait:lure:10', 3], ['bait:shrimp:20', 3], ['bait:catnip:5', tier], ['item:luckbell:1', 2], ['item:raincharm:1', 1], ['item:fogbottle:1', 1],
      ['treasure:key:1', 2], ['treasure:map:1', tier >= 2 ? 1.2 : 0.4]];
    for (let i = 0; i < (tier === 1 ? 1 : 2); i++) { const [type, id, c] = weightedPick(pool).split(':'); out.push({ type, id, n: +c }); }
    return out;
  },
  applyLoot(list) {
    const S = this.S;
    for (const l of list) {
      if (l.type === 'coins') Game.addCoins(l.n);
      else if (l.type === 'gear') l.kept = this.addGear(l.g, true);
      else if (l.type === 'bait') S.baits[l.id] = (S.baits[l.id] || 0) + l.n;
      else if (l.type === 'item') S.items[l.id] = (S.items[l.id] || 0) + l.n;
      else if (l.type === 'treasure') S.treasure[l.id] = (S.treasure[l.id] || 0) + l.n;
    }
    this.checkHidden();
  },
  // 合并同类奖励，方便批量开箱时展示
  mergeLoot(list) {
    const out = [], idx = {};
    for (const l of list) {
      if (l.type === 'gear' || l.type === 'unique') { out.push(l); continue; }
      const k = l.type + ':' + (l.id || '');
      if (idx[k] !== undefined) out[idx[k]].n += l.n; else { idx[k] = out.length; out.push(Object.assign({}, l)); }
    }
    return out;
  },
  openChest(id, count) {
    const S = this.S;
    const n = Math.min(count || 1, S.treasure[id] || 0, S.treasure.key || 0);
    if (n <= 0) { Game.toast(S.treasure.key ? '没有这种宝箱' : '需要钥匙才能打开喵', 'warn'); return; }
    let all = [];
    for (let i = 0; i < n; i++) {
      S.treasure[id]--; S.treasure.key--;
      const list = this.rollLoot(FISH_BY_ID[id].tier);
      this.applyLoot(list); all = all.concat(list);
    }
    Game.emit('loot', { title: n > 1 ? `一口气打开了 ${n} 个${FISH_BY_ID[id].name}！` : `打开了${FISH_BY_ID[id].name}！`, list: this.mergeLoot(all) });
    Game.changed(); Game.save();
  },

  // ---------- 装备：穿戴 / 出售 / 强化 / 合成 / 配方 ----------
  equip(uid) { const g = this.S.gear.find(x => x.uid === uid); if (!g) return; this.S.hero.equip[g.slot] = uid; this.clampHero(); Game.changed(); },
  unequip(slot) { this.S.hero.equip[slot] = null; this.clampHero(); Game.changed(); },
  isEquipped(uid) { return Object.values(this.S.hero.equip).includes(uid); },
  sellGear(uids) {
    const S = this.S; let total = 0, n = 0;
    for (const uid of uids) {
      if (this.isEquipped(uid)) continue;
      const i = S.gear.findIndex(x => x.uid === uid); if (i < 0 || S.gear[i].u) continue;
      total += Math.round(gearValue(S.gear[i]) * 0.4); S.gear.splice(i, 1); n++;
    }
    if (n) { Game.addCoins(total); Game.toast(`分解了 ${n} 件装备，回收 🪙${fmtFull(total)}`, 'good'); }
    Game.changed();
  },
  // 一键合成：把所有能凑成 3 件的同级同品质装备，从低到高依次合成
  autoSynth(maxQ) {
    const S = this.S, made = []; let spent = 0, guard = 0;
    while (guard++ < 200) {
      const groups = {};
      for (const g of S.gear) {
        if (g.u || this.isEquipped(g.uid) || g.q >= (maxQ === undefined ? 4 : maxQ)) continue;
        if (g.tier === 5 && g.q === 4) continue;
        (groups[g.tier + ':' + g.q] = groups[g.tier + ':' + g.q] || []).push(g);
      }
      const key = Object.keys(groups).filter(k => groups[k].length >= 3).sort((a, b) => { const [ta, qa] = a.split(':').map(Number), [tb, qb] = b.split(':').map(Number); return qa - qb || ta - tb; })[0];
      if (!key) break;
      const items = groups[key].sort((a, b) => a.e - b.e).slice(0, 3), c = this.synthCheck(items.map(g => g.uid));
      if (c.why || S.coins < c.cost) break;
      S.coins -= c.cost; spent += c.cost;
      const set = new Set(items.map(g => g.uid));
      S.gear = S.gear.filter(g => !set.has(g.uid));
      const ng = { uid: S.uid++, slot: items[0].slot, tier: c.out.tier, q: c.out.q, e: 0 };
      S.gear.push(ng); made.push(ng);
    }
    // 只展示最终还留着的成品
    const final = made.filter(g => S.gear.includes(g));
    if (made.length) Game.emit('loot', { title: `一键合成 ${made.length} 次（花费 🪙${fmtFull(spent)}）`, list: final.map(g => ({ type: 'gear', g, kept: true })) });
    else Game.toast('没有可以合成的装备（需要 3 件同等级同品质）', 'warn');
    Game.changed(); Game.save();
  },
  craftSet(key) {
    const S = this.S, R = SET_RECIPES[key];
    if (!S.setRecipes[key]) { Game.toast('还没有这张图纸', 'warn'); return; }
    if (this.ownsUnique(key)) { Game.toast('已经打造过了', 'warn'); return; }
    const need = this.setNeed(key);
    if (!Quests.canSubmit(need)) { Game.toast('材料不足', 'warn'); return; }
    Quests.take(need);
    const g = this.giveUnique(key, true);
    Game.emit('loot', { title: '🔨 工匠打造成功！', list: [{ type: 'gear', g, kept: true }] });
    Game.save();
  },
  setNeed(key) {
    const R = SET_RECIPES[key], need = [];
    for (const [m, n] of Object.entries(R.mats || {})) need.push(['mat', m, n]);
    for (const [f, n] of R.fish || []) need.push(['fish', f, n]);
    for (const [it, n] of Object.entries(R.items || {})) need.push(['item', it, n]);
    need.push(['coins', '', R.coins]);
    return need;
  },
  gearScore(g) {
    const s = gearStats(g);
    let v = (s.atk || 0) * 2 + (s.def || 0) * 1.5 + (s.maxHp || 0) / 5 + (s.spd || 0) * 2 + (s.crit || 0) * 200 + (s.luck || 0) * 60;
    if (g.u) v *= 1.25;
    return v;
  },
  autoEquip() {
    for (const slot of SLOT_ORDER) {
      const best = this.S.gear.filter(g => g.slot === slot).sort((a, b) => this.gearScore(b) - this.gearScore(a))[0];
      if (best) this.S.hero.equip[slot] = best.uid;
    }
    this.clampHero(); Game.changed();
  },
  enhance(uid) {
    const g = this.S.gear.find(x => x.uid === uid); if (!g) return null;
    if (g.e >= 10) { Game.toast('已经强化到 +10 了', 'warn'); return null; }
    const cost = enhCost(g);
    if (!Game.pay(cost)) return null;
    const ok = Math.random() < ENH_RATE[g.e];
    let res;
    if (ok) { g.e++; res = { ok: true, msg: `强化成功！${gearName(g)}` }; }
    else if (g.e >= 7) { g.e--; res = { ok: false, msg: `强化失败……掉到了 +${g.e}` }; }
    else res = { ok: false, msg: '强化失败……金币打了水漂' };
    Game.toast(res.msg, res.ok ? 'good' : 'warn');
    this.clampHero(); Game.changed(); Game.save();
    return res;
  },
  // 3 件同等级、同品质的普通装备 → 1 件更高品质
  synthCheck(uids) {
    const items = uids.map(u => this.S.gear.find(g => g.uid === u)).filter(Boolean);
    if (items.length !== 3) return { why: '请选择 3 件装备' };
    if (items.some(g => g.u)) return { why: '隐藏装备不能合成' };
    if (items.some(g => this.isEquipped(g.uid))) return { why: '不能使用正在穿着的装备' };
    const t = items[0].tier, q = items[0].q;
    if (items.some(g => g.tier !== t || g.q !== q)) return { why: '需要等级和品质都相同' };
    if (t === 5 && q === 4) return { why: '已经是最高等级的传说装备' };
    return { items, cost: synthCost(items[0]), out: q < 4 ? { tier: t, q: q + 1 } : { tier: t + 1, q: 1 } };
  },
  synth(uids, slot) {
    const c = this.synthCheck(uids); if (c.why) { Game.toast(c.why, 'warn'); return null; }
    if (!Game.pay(c.cost)) return null;
    const set = new Set(uids);
    this.S.gear = this.S.gear.filter(g => !set.has(g.uid));
    const g = { uid: this.S.uid++, slot: slot || c.items[0].slot, tier: c.out.tier, q: c.out.q, e: 0 };
    this.S.gear.push(g);
    Game.toast(`合成成功：${gearName(g)}`, 'good');
    Game.changed(); Game.save();
    return g;
  },
  recipeHave(r) {
    const S = this.S;
    return r.need.map(([id, n]) => [id, n, [...S.bag, ...S.warehouse].filter(x => x.id === id).length]);
  },
  craft(rid) {
    const r = RECIPES.find(x => x.id === rid); if (!r) return;
    if (this.ownsUnique(r.out)) { Game.toast('已经拥有了', 'warn'); return; }
    if (this.recipeHave(r).some(([, n, h]) => h < n)) { Game.toast('材料不足', 'warn'); return; }
    if (!Game.pay(r.coins)) return;
    const S = this.S;
    for (const [id, n] of r.need) {
      let left = n;
      for (const arr of [S.warehouse, S.bag]) for (let i = arr.length - 1; i >= 0 && left > 0; i--) if (arr[i].id === id) { arr.splice(i, 1); left--; }
    }
    const g = this.giveUnique(r.out);
    if (g) Game.emit('loot', { title: '🔨 锻造成功！', list: [{ type: 'gear', g, kept: true }] });
    Game.afterStorageChange(); Game.save();
  },

  // ---------- 图鉴 → 地址 ----------
  dexNeed(scene) { return FISH.filter(f => f.scenes.includes(scene) && f.rarity !== 'legendary' && !f.seasons); },
  dexDone(scene) { return this.dexNeed(scene).filter(f => this.S.dex[f.id]).length; },
  dexComplete(scene) { return this.dexDone(scene) >= this.dexNeed(scene).length; },
  routeTo(to) { return ROUTES.find(r => r.to === to); },
  reached(place) { return this.S.unlockedScenes.includes(place); },
  claimAddress(to) {
    const r = this.routeTo(to);
    if (!r || this.S.addr.includes(to) || !this.dexComplete(r.from)) return;
    this.S.addr.push(to);
    this.story('addr_' + to);
    Game.toast(`获得了「${PLACES[to].name}」的地址！`, 'good');
    Game.changed(); Game.save();
  },
  buyBoat(tier) {
    if (this.S.boat >= tier || this.S.boat < tier - 1) return;
    if (!Game.pay(BOATS[tier].price)) return;
    this.S.boat = tier;
    Game.toast(`获得了${BOATS[tier].name}！`, 'good');
    if (tier === 1) this.story('boat');
    Game.changed(); Game.save();
  },
  upgradeBoat(k) {
    const u = BOAT_UPS[k], lv = this.S.boatUps[k];
    if (this.S.boat < 1) { Game.toast('先买一条船吧', 'warn'); return; }
    if (lv >= u.max) return;
    if (!Game.pay(u.cost(lv))) return;
    this.S.boatUps[k]++;
    Game.toast(`${u.name}完成：${u.desc(lv + 1)}`, 'good'); Game.changed(); Game.save();
  },
  boatSpeed() { return (BOATS[this.S.boat].speed || 1) * (1 + 0.12 * this.S.boatUps.sail) * (this.S.boatHp <= 0 ? 0.4 : 1); },
  provisions(r) { return r.fish; },
  holdCap() { const S = this.S; return S.boat ? (BOATS[S.boat].holdBase || 10) + 10 * S.boatUps.hold : 0; },
  maxBoatHp() { const S = this.S; return S.boat ? (BOATS[S.boat].hp || 100) + 40 * S.boatUps.hull : 0; },
  wearCost(r) { return Math.ceil(r.dur / 10); },
  repairCost() { return Math.max(0, Math.ceil((this.maxBoatHp() - this.S.boatHp) * REPAIR_PER_HP * this.S.boat)); },
  repair() {
    const c = this.repairCost(); if (!c) return;
    if (!Game.pay(c)) return;
    this.S.boatHp = this.maxBoatHp(); Game.toast('🔧 船坞把船修好了', 'good'); Game.changed(); Game.save();
  },
  damageBoat(n) { const S = this.S; S.boatHp = Math.max(0, S.boatHp - n); if (S.boatHp <= 0 && S.mode === 'voyage') Game.toast('船漏水了！航速大幅下降……', 'warn'); },
  fishTotal() { return this.S.bag.length + this.S.warehouse.length + this.S.hold.length; },
  takeProvisions(n) {
    const S = this.S;
    const all = [...S.warehouse, ...S.hold, ...S.bag].filter(x => !FISH_BY_ID[x.id].treasure).sort((a, b) => a.value - b.value);
    const set = new Set(all.slice(0, n).map(x => x.uid));
    S.warehouse = S.warehouse.filter(x => !set.has(x.uid)); S.bag = S.bag.filter(x => !set.has(x.uid)); S.hold = S.hold.filter(x => !set.has(x.uid));
  },
  canFerry(to) {
    const S = this.S;
    if (S.mode !== 'fish') return '正在冒险中';
    if (!this.reached(to) || S.scene === to) return '无法前往';
    if (S.boat < 1) return '需要一条船';
    if (S.boatHp < 5) return '船的耐久太低了，先去船坞修理';
    return null;
  },
  startFerry(to, mode) {
    const why = this.canFerry(to); if (why) { Game.toast(why, 'warn'); return; }
    const S = this.S;
    S.voyage = { kind: 'ferry', from: S.scene, to, t: 0, dur: FERRY_TIME, nextEnc: rand(20, 40), encLeft: Math.random() < 0.4 ? 1 : 0, lv: REGION_LV[to], mons: HUNT_MONS[to], region: to, wear: 4, worn: 0, mode };
    this.enterMode('voyage', `⛵ 出发前往 ${PLACES[to].name}（短途航行）`);
  },
  canSail(r) {
    const S = this.S;
    if (S.mode !== 'fish') return '正在冒险中';
    if (!S.addr.includes(r.to)) return '还没有地址';
    if (S.boat < r.boat) return `需要${BOATS[r.boat].name}`;
    if (S.scene !== r.from) return `需要从${PLACES[r.from].name}出发`;
    if (S.boatHp < this.wearCost(r)) return `船的耐久不足（需要 ${this.wearCost(r)}），先去船坞修理`;
    if (this.fishTotal() < this.provisions(r)) return `补给不足（需要 ${this.provisions(r)} 条鱼）`;
    return null;
  },
  startVoyage(to, mode) {
    const r = this.routeTo(to), why = this.canSail(r);
    if (why) { Game.toast(why, 'warn'); return; }
    this.takeProvisions(this.provisions(r));
    const S = this.S;
    S.voyage = { kind: 'route', from: r.from, to, t: 0, dur: r.dur, nextEnc: rand(25, 45), lv: r.lv, mons: r.mons, region: r.from, wear: this.wearCost(r), worn: 0, mode };
    this.enterMode('voyage', `⛵ 起航！目标：${PLACES[to].name}`);
  },
  startHunt(mode) {
    const S = this.S;
    if (S.mode !== 'fish') return;
    if (S.boat < 1) { Game.toast('需要先有一条船', 'warn'); return; }
    if (!(S.treasure.map > 0)) return;
    S.treasure.map--;
    const region = S.scene;
    S.voyage = { kind: 'hunt', from: region, to: region, t: 0, dur: 90, nextEnc: 30, encLeft: 2, lv: REGION_LV[region], mons: HUNT_MONS[region], region, wear: 6, worn: 0, mode };
    this.enterMode('voyage', '🗺️ 按照藏宝图出发寻宝！');
  },
  enterMode(m, msg) {
    this.S.mode = m; Game.fsm = { phase: 'idle', t: 0, dur: 0 };
    if (msg) Game.toast(msg, 'good');
    Game.emit('mode'); Game.changed(); Game.save();
  },
  leaveMode() { const S = this.S; this.battle = null; S.voyage = null; S.dungeon = null; S.mode = 'fish'; Game.fsm = { phase: 'idle', t: 0, dur: 0 }; Game.emit('mode'); },
  arrive(offline) {
    const S = this.S, v = S.voyage;
    this.leaveMode();
    if (v.worn < v.wear) this.damageBoat(v.wear - v.worn);
    if (v.kind === 'hunt') {
      const list = this.rollLoot(3); list.push({ type: 'treasure', id: 'key', n: 1 });
      this.applyLoot(list);
      Game.emit('loot', { title: '🗺️ 找到了藏宝图上的宝藏！', list, offline });
      Quests.giveClue('q1');
    } else if (v.kind === 'ferry') {
      Game.switchScene(v.to);
      Game.toast(`⚓ 到达了 ${PLACES[v.to].name}`, 'good');
    } else {
      if (!S.unlockedScenes.includes(v.to)) S.unlockedScenes.push(v.to);
      Game.switchScene(v.to);
      Game.toast(`⚓ 抵达了 ${PLACES[v.to].name}！`, 'good');
      this.story('arrive_' + v.to);
    }
    Game.changed(); Game.save();
  },
  retreat() {
    const S = this.S;
    if (S.mode === 'voyage') Game.toast(S.voyage.kind === 'hunt' ? '放弃了寻宝' : '返航了……补给已经吃掉了', 'warn');
    if (S.mode === 'dungeon') Game.toast('撤出了副本', 'warn');
    if (typeof Events !== 'undefined') Events.clear();
    this.leaveMode(); Game.emit('battleEnd', {}); Game.changed(); Game.save();
  },

  // ---------- 副本 ----------
  dungeonOpen(d) { return this.reached(d.region) && this.S.boat >= 1 && (!d.hidden || d.unlock(this.S)); },
  enterDungeon(id, mode) {
    const S = this.S, d = DUNGEONS.find(x => x.id === id);
    if (S.mode !== 'fish' || !this.dungeonOpen(d)) return;
    if (S.hero.hp < this.stats().maxHp * 0.3) { Game.toast('HP 太低了，先休息一下或吃条鱼吧', 'warn'); return; }
    S.dungeon = { id, floor: 1, room: 0, phase: 'walk', t: 0, path: 'safe', buff: 0, mode: mode || S.settings.battleMode, loot: { coins: 0, gear: 0, exp: 0 } };
    this.enterMode('dungeon');
    this.story('enter_' + id);
  },
  dungeonRoom(offline) {
    const S = this.S, D = S.dungeon, def = DUNGEONS.find(x => x.id === D.id);
    D.room++;
    if (D.room > ROOMS_PER_FLOOR) {
      D.floor++; D.room = 0;
      if (D.floor > def.floors) { D.phase = 'boss'; return this.dungeonBoss(offline); }
      this.dlog(`* 你走下了台阶。第 ${D.floor} 层。`);
      if (typeof Events !== 'undefined') { D.phase = 'choice'; Events.branch(offline); }
      return;
    }
    const danger = D.path === 'danger';
    const lv = Math.round(def.lv[0] + (def.lv[1] - def.lv[0]) * ((D.floor - 1) / Math.max(1, def.floors - 1)) + rand(-0.5, 0.5) + (danger ? 3 : 0));
    let ev = weightedPick([['battle', 58], ['chest', danger ? 20 : 11], ['spring', 8], ['event', 16], ['none', 7]]);
    if (D.path === 'mystery' && D.room === 1) ev = 'event';
    if (ev === 'event' && typeof Events !== 'undefined') {
      D.phase = 'event';
      if (Events.trigger('dungeon', offline)) return;
      D.phase = 'walk';
    }
    if (ev === 'battle' || ev === 'event') {
      D.phase = 'battle';
      this.startBattle(monsterStats(def.mons[Math.floor(Math.random() * def.mons.length)], lv), { where: 'dungeon', tier: def.tier, expMul: danger ? 1.5 : 1 }, offline);
    } else if (ev === 'chest') {
      const c = Math.round(lv * rand(15, 30) * (danger ? 1.5 : 1));
      Game.addCoins(c); D.loot.coins += c;
      let msg = `* 你发现了一个小箱子。里面有 🪙${c}。`;
      if (Math.random() < 0.35) { const g = this.newGear(def.tier, danger ? 2 : 1); if (this.addGear(g, true)) { D.loot.gear++; msg += ` 还有 ${gearName(g)}！`; } }
      if (Math.random() < 0.15) { S.treasure.key++; msg += ' 还有一把钥匙！'; }
      this.dlog(msg);
    } else if (ev === 'spring') {
      const r = this.heal(this.stats().maxHp * 0.4);
      this.dlog(`* 一汪清澈的泉水。你喝了几口。HP +${r}`);
    } else this.dlog(['* 什么也没有。只有风声。', '* 墙上刻着一条鱼的图案。', '* 你踩到了一块会叫的石头。', '* 泡泡在水桶里打了个喷嚏。'][Math.floor(Math.random() * 4)]);
  },
  dungeonBoss(offline) {
    const S = this.S, D = S.dungeon, def = DUNGEONS.find(x => x.id === D.id);
    const sid = (def.boss === 'mo' && S.story.seen.boss_abyss) ? null : 'boss_' + def.id;
    if (offline && def.boss === 'mo') { D.phase = 'bossWait'; return; }
    D.phase = 'bossTalk';
    const go = () => {
      if (!S.dungeon) return;
      D.phase = 'battle';
      this.startBattle(monsterStats(def.boss, def.bossLv), { where: 'dungeon', tier: def.tier, boss: true }, offline);
    };
    if (def.boss === 'mo' && S.story.seen.boss_abyss) this.story('again_abyss', go, true);
    else if (offline) { this.story(sid); go(); }
    else this.story(sid, go);
  },
  dungeonClear(spared, offline) {
    const S = this.S, D = S.dungeon, def = DUNGEONS.find(x => x.id === D.id);
    const first = !S.cleared[def.id];
    S.cleared[def.id] = (S.cleared[def.id] || 0) + 1;
    const list = this.rollLoot(4, def.tier);
    if (first) list.push({ type: 'treasure', id: 'key', n: 2 });
    // 隐藏装备
    const uni = [];
    if (def.id === 'pirate' && first) uni.push('u_blade');
    if (def.id === 'dream') { if (first) uni.push('u_rod'); else if (Math.random() < 0.35) uni.push('u_hat'); }
    if (def.id === 'abyss' && spared && !this.ownsUnique('u_tear')) uni.push('u_tear');
    for (const u of uni) { const g = this.giveUnique(u, true); if (g) list.push({ type: 'gear', g, kept: true }); }
    this.applyLoot(list);
    this.leaveMode();
    Quests.onClear(def.id);
    if (def.id === 'tide' && first) setTimeout(() => Quests.giveClue('q2'), 0);
    if (def.id === 'crystal' && first) setTimeout(() => Quests.giveClue('q3'), 0);
    const show = () => Game.emit('loot', { title: `🏆 ${def.name} 通关宝箱`, list, offline });
    if (def.boss === 'mo') {
      S.story.ending = spared ? 'spare' : (S.story.ending === 'spare' ? 'spare' : 'fight');
      this.story(spared ? 'end_spare' : 'end_fight', () => { this.checkHidden(); show(); }, true);
    } else if (first) this.story('win_' + def.id, show);
    else show();
    Game.changed(); Game.save();
  },
  dlog(msg) { Game.emit('advlog', msg); },

  // ---------- 隐藏内容解锁 ----------
  checkHidden() {
    const S = this.S;
    if (!S || !S.treasure) return;
    if (!S.hiddenOpen.pirate && S.treasure.mapPiece >= 3) {
      S.treasure.mapPiece -= 3; S.hiddenOpen.pirate = true;
      this.story('unlock_pirate');
    }
    if (!S.hiddenOpen.dream && S.story.ending === 'spare' && S.dex.lakegod) {
      S.hiddenOpen.dream = true;
      this.story('unlock_dream');
    }
  },

  // ---------- 战斗 ----------
  // 当前这场冒险的战斗模式：auto 自动 / manual 纯手动 / boss Boss 战手动
  battleMode() { const S = this.S; return (S.dungeon && S.dungeon.mode) || (S.voyage && S.voyage.mode) || S.settings.battleMode || 'auto'; },
  isManual(B) {
    if (B.offline || B.forceAuto) return false;
    const m = this.battleMode();
    return m === 'manual' || (m === 'boss' && B.foe.boss);
  },
  startBattle(foe, ctx, offline) {
    const S = this.S, st = this.stats();
    S.advStats.battles++;
    const B = {
      foe: Object.assign({}, foe, { hp: foe.maxHp }), ctx, log: [], over: false, result: null, offline: !!offline,
      ht: 100 / st.spd, ft: 100 / foe.spd * 1.05, foeTurns: 0, timer: 0, fx: null, mercy: false,
      ap: Math.min(st.apStart, st.apMax), guard: 0, freeze: 0, nine: false, turn: 0,
    };
    B.log.push(MONSTERS[foe.id].check);
    B.log.push(`* ${foe.name}（Lv.${foe.lv}）出现了！`);
    this.battle = B;
    if (!offline) { Game.emit('battleStart', B); if (!S.story.seen.firstBattle) this.story('firstBattle'); }
    else this.runBattle(B);
  },
  dmg(atk, def, mult) { return Math.max(1, Math.round(atk * mult * rand(0.9, 1.1) * 100 / (100 + def))); },
  heroHit(B, st, fx, mult) {
    let d = this.dmg(st.atk, B.foe.def, mult), crit = false;
    if (Math.random() < st.crit) { d = Math.round(d * st.critDmg); crit = true; }
    if (fx.rage && this.S.hero.hp < st.maxHp * 0.4) d = Math.round(d * (1 + fx.rage));
    if (this.S.cheat.oneHit) d = B.foe.hp;
    return { d, crit };
  },
  // 战斗中能吃的东西（料理优先）
  battleFoods() {
    const S = this.S, out = [];
    for (const [id, n] of Object.entries(S.dishes || {})) if (n > 0) out.push({ kind: 'dish', id, n, name: DISHES[id].name, heal: DISHES[id].heal, ap: DISHES[id].ap || 0 });
    const st = this.stats(), seen = {};
    for (const it of S.bag) {
      const fv = foodValue(it); if (!fv) continue;
      const k = it.id; if (seen[k]) { seen[k].n++; continue; }
      seen[k] = { kind: 'fish', id: it.id, uid: it.uid, n: 1, name: FISH_BY_ID[it.id].name, heal: fv.hp / st.maxHp, ap: fv.ap };
      out.push(seen[k]);
    }
    return out;
  },
  // 自动战斗 AI：返回本回合要做的事
  autoAction(B, st) {
    const S = this.S, H = S.hero, F = B.foe, known = this.skills(), has = k => known.includes(k);
    if (H.hp < st.maxHp * 0.35 && S.settings.autoEat) {
      const miss = (st.maxHp - H.hp) / st.maxHp;
      const foods = this.battleFoods();
      if (foods.length) {
        foods.sort((a, b) => Math.abs(a.heal - miss) - Math.abs(b.heal - miss) - (b.ap - a.ap) * (B.ap < 3 ? 0.05 : 0));
        return { type: 'eat', food: foods[0] };
      }
    }
    if (has('heal') && H.hp < st.maxHp * 0.45 && B.ap >= SKILLS.heal.ap) return { type: 'skill', id: 'heal' };
    if (has('guard') && !B.guard && F.skill && (B.foeTurns + 1) % F.skill.every === 0 && B.ap >= SKILLS.guard.ap && B.ft <= B.ht + 100 / st.spd) return { type: 'skill', id: 'guard' };
    if (has('sweep') && B.ap >= 5) return { type: 'skill', id: 'sweep' };
    if (has('bone') && B.ap >= 2 && (!has('sweep') || B.ap >= 7)) return { type: 'skill', id: 'bone' };
    if (!has('bone') && !has('sweep') && B.ap >= 1) return { type: 'skill', id: 'claw' };
    return { type: 'skill', id: 'punch' };
  },
  // 手动操作：界面调用
  heroAct(action) {
    const B = this.battle; if (!B || !B.await) return;
    if (action.type === 'skill') {
      const K = SKILLS[action.id];
      if (!this.skills().includes(action.id) || B.ap < K.ap) { Game.toast('行动点不够', 'warn'); return; }
    }
    if (action.type === 'auto') { B.forceAuto = true; action = null; }
    B.await = false; B.pending = action;
    B.timer = STEP_TIME; // 立即执行
  },
  doHero(B, st, fx, act) {
    const S = this.S, H = S.hero, F = B.foe;
    B.ht += 100 / st.spd; B.turnStarted = false; B.turn++;
    if (act.type === 'eat') {
      const fd = act.food;
      let hp = 0, ap = 0;
      if (fd.kind === 'dish') { const r = Cook.eat(fd.id, true); if (r) { hp = r.hp; ap = r.ap; } }
      else {
        const it = S.bag.find(x => x.uid === fd.uid) || S.bag.find(x => x.id === fd.id);
        if (it) { S.bag.splice(S.bag.indexOf(it), 1); const fv = foodValue(it); hp = this.heal(fv.hp); ap = fv.ap; }
      }
      if (ap) B.ap = Math.min(st.apMax, B.ap + ap);
      B.log.push(`* 小橘吃掉了${fd.name}。HP +${hp}${ap ? `，行动点 +${ap}` : ''}`);
      B.fx = { who: 'hero', kind: 'heal', skill: 'eat' };
      return;
    }
    const id = act.id, K = SKILLS[id];
    B.ap -= K.ap;
    if (K.heal) { const r = this.heal(st.maxHp * K.heal); B.log.push(`${K.text} HP +${r}`); B.fx = { who: 'hero', kind: 'heal', skill: id }; return; }
    if (K.guard) { B.guard = K.guard; B.log.push(K.text); B.fx = { who: 'hero', kind: 'buff', skill: id }; return; }
    let total = 0, crit = false;
    for (let i = 0; i < K.hits; i++) { const h = this.heroHit(B, st, fx, K.mult); total += h.d; crit = crit || h.crit; }
    let extra = '';
    if (fx.double && Math.random() < fx.double) { const h = this.heroHit(B, st, fx, 1); total += h.d; extra = '（追加攻击！）'; }
    if (crit && fx.critAp) B.ap = Math.min(st.apMax, B.ap + fx.critAp);
    F.hp = Math.max(0, F.hp - total);
    if (fx.lifesteal) this.heal(total * fx.lifesteal);
    if (fx.freeze && F.hp > 0 && Math.random() < fx.freeze) { B.freeze = 1; extra += '（冻住了！）'; }
    B.log.push(`${K.text} 造成 ${total} 点伤害${crit ? '（会心一击！）' : ''}${extra}`);
    B.fx = { who: 'foe', kind: 'hit', n: total, crit, skill: id, hits: K.hits };
    if (F.final && !B.mercy && F.hp > 0 && F.hp <= F.maxHp * 0.15) { B.mercy = true; B.pause = 'mercy'; }
  },
  step(B) {
    if (B.over || B.pause || B.await) return;
    const S = this.S, H = S.hero, st = this.stats(), F = B.foe, fx = this.effects();
    B.fx = null;
    if (B.ht <= B.ft) {
      // —— 小橘的回合 ——
      if (!B.turnStarted) {
        B.turnStarted = true;
        B.ap = Math.min(st.apMax, B.ap + 1 + (fx.apRegen || 0));
        if (fx.regen) this.heal(st.maxHp * fx.regen);
      }
      let act = B.pending; B.pending = null;
      if (!act) {
        if (this.isManual(B)) { B.await = true; Game.emit('battleAwait', B); return; }
        act = this.autoAction(B, st);
      }
      this.doHero(B, st, fx, act);
    } else {
      // —— 怪物的回合 ——
      B.ft += 100 / F.spd;
      if (B.freeze) { B.freeze = 0; B.log.push(`* ${F.name}被冻住了，动弹不得！`); B.fx = { who: 'foe', kind: 'frozen' }; return this.afterStep(B); }
      B.foeTurns++;
      const useSk = F.skill && B.foeTurns % F.skill.every === 0;
      if (fx.dodge && Math.random() < fx.dodge) { B.log.push(`* ${F.name}${useSk ? `使出了「${F.skill.name}」` : '发起了攻击'}……小橘轻盈地闪开了！`); B.fx = { who: 'hero', kind: 'dodge', foeSkill: useSk }; return this.afterStep(B); }
      let d = this.dmg(F.atk, st.def, useSk ? F.skill.mult : 1);
      let note = '';
      if (B.guard) { d = Math.round(d / 2); B.guard--; note = '（炸毛减伤）'; }
      if (S.cheat.god) d = 0;
      H.hp -= d;
      if (H.hp <= 0 && this.talentRank('s5') && !B.nine) { H.hp = 1; B.nine = true; note += ' 九命猫发动，小橘咬牙撑住了！'; }
      H.hp = Math.max(0, H.hp);
      if (fx.thorns && d > 0) { const r = Math.round(d * fx.thorns); F.hp = Math.max(0, F.hp - r); note += ` 反弹 ${r}`; }
      B.log.push((useSk ? `* ${F.name}使出了「${F.skill.name}」！小橘受到 ${d} 点伤害` : `* ${F.name}发起了攻击。小橘受到 ${d} 点伤害`) + note);
      B.fx = { who: 'hero', kind: 'hit', n: d, big: useSk, foeSkill: useSk };
    }
    this.afterStep(B);
  },
  afterStep(B) {
    if (B.log.length > 40) B.log.splice(0, B.log.length - 40);
    if (B.foe.hp <= 0) this.win(B);
    else if (this.S.hero.hp <= 0) this.lose(B);
  },
  win(B) {
    const S = this.S, F = B.foe, fx = this.effects(), M = MONSTERS[F.id];
    B.over = true; B.result = 'win';
    S.advStats.wins++; S.advStats.kills++;
    const exp = Math.round(F.lv * 7 * (F.boss ? 5 : 1) * (B.ctx.expMul || 1));
    const coins = Math.round(F.lv * rand(6, 10) * (F.boss ? 5 : 1) * (1 + (fx.gold || 0)));
    Game.gainExp(exp); Game.addCoins(coins);
    let msg = `* 你赢了！获得 ${exp} 经验和 🪙${coins}。`;
    const tier = B.ctx.tier || this.progressTier();
    if (!F.boss && Math.random() < 0.22) { const g = this.newGear(tier, 1); if (this.addGear(g, true)) { msg += ` 掉落了【${gearName(g)}】！`; B.drop = g; } }
    if (!F.boss && Math.random() < 0.04) { S.treasure.key++; msg += ' 掉落了一把钥匙！'; }
    if (M.drop && Math.random() < M.drop[1]) { S.treasure[M.drop[0]] = (S.treasure[M.drop[0]] || 0) + 1; msg += ` 掉落了【${FISH_BY_ID[M.drop[0]].name}】！`; }
    if (M.unique && Math.random() < M.unique[1] && !this.ownsUnique(M.unique[0])) {
      const g = this.giveUnique(M.unique[0], true); if (g) { msg += ` ✨掉落了隐藏装备【${gearName(g)}】！`; B.drop = g; }
    }
    const mm = MON_MATS[F.id];
    if (mm && Math.random() < mm[1]) { S.mats[mm[0]] = (S.mats[mm[0]] || 0) + mm[2]; msg += ` 获得素材【${MATERIALS[mm[0]].name}×${mm[2]}】`; }
    if (S.voyage) { S.voyage.worn += 2; this.damageBoat(2); }
    B.log.push(msg);
    if (S.dungeon) { S.dungeon.loot.exp += exp; S.dungeon.loot.coins += coins; if (B.drop) S.dungeon.loot.gear++; }
    this.checkHidden();
  },
  lose(B) {
    B.over = true; B.result = 'lose';
    this.S.hero.hp = 1;
    B.log.push('* 小橘眼前一黑……');
    B.log.push('* 但是，泡泡把你拖回了岸边。');
  },
  mercyChoice(c) {
    const B = this.battle; if (!B) return;
    B.pause = null;
    if (c === 'spare') { B.over = true; B.result = 'spare'; B.log.push('* 你放下了鱼竿。'); Game.gainExp(B.foe.lv * 40); }
    else B.log.push('* 你握紧了鱼竿。');
    Game.emit('battleLog', B);
  },
  runBattle(B) { B.offline = true; let n = 0; while (!B.over && n++ < 600) { if (B.pause) B.pause = null; B.await = false; this.step(B); } this.finishBattle(true); },
  finishBattle(offline) {
    const B = this.battle, S = this.S;
    if (!B) return;
    this.battle = null;
    if (!offline) Game.emit('battleEnd', B);
    if (B.result === 'lose') {
      if (B.ctx.where === 'event') { Game.toast('被打败了……', 'warn'); Game.changed(); return; }
      if (S.mode === 'voyage') Game.toast(S.voyage.kind === 'hunt' ? '寻宝失败了……' : `航行失败，被冲回了${PLACES[S.voyage.from].name}`, 'warn');
      else Game.toast('在副本中倒下了……', 'warn');
      if (typeof Events !== 'undefined') Events.clear();
      this.leaveMode(); Game.changed(); Game.save();
      return;
    }
    if (B.ctx.onWin) B.ctx.onWin(offline);
    if (B.ctx.where === 'event') { Game.changed(); return; }
    if (S.mode === 'voyage') S.voyage.inBattle = false;
    if (S.mode === 'dungeon') {
      if (B.ctx.boss) return this.dungeonClear(B.result === 'spare', offline);
      S.dungeon.phase = 'walk'; S.dungeon.t = 0;
    }
    Game.changed();
  },
  // 码头上的突发战斗（不切换模式）
  eventBattle(monId, lv, onWin) {
    if (this.battle) return;
    this.startBattle(monsterStats(monId, lv), { where: 'event', tier: this.progressTier(), onWin }, false);
  },

  // ---------- 每帧 ----------
  update(dt) {
    const S = this.S;
    const B = this.battle;
    if (B) {
      if (this.storyActive() || B.pause) return;
      if (B.over) { this._endTimer += dt; if (this._endTimer > 1.6) { this._endTimer = 0; this.finishBattle(false); } return; }
      B.timer += dt * (S.settings.battleSpeed || 1);
      if (B.await) return;
      while (B.timer >= STEP_TIME && !B.over && !B.pause && !B.await) { B.timer -= STEP_TIME; this.step(B); if (!B.await) Game.emit('battleLog', B); }
      return;
    }
    if (S.mode === 'fish') { this.regen(dt, 0.01); return; }
    if (this.storyActive() || this.eventActive()) return;
    this.tickWorld(dt, false);
  },
  tickWorld(dt, offline) {
    const S = this.S;
    this.regen(dt, 0.002);
    if (S.mode === 'voyage') {
      const v = S.voyage;
      if (v.inBattle || v.inEvent) return;
      v.t += dt * this.boatSpeed() * (v.boost && v.boost > v.t ? 1.3 : 1);
      const due = Math.floor(v.wear * Math.min(1, v.t / v.dur));
      if (due > v.worn) { this.damageBoat(due - v.worn); v.worn = due; }
      if (v.t >= v.dur) return this.arrive(offline);
      const encOk = v.kind !== 'route' ? v.encLeft > 0 : true;
      if (encOk && v.t >= v.nextEnc) {
        if (v.kind !== 'route') { v.encLeft--; v.nextEnc += 30; } else v.nextEnc = v.t + rand(40, 70);
        if (v.kind === 'route' && Math.random() < 0.4 && typeof Events !== 'undefined' && Events.trigger('voyage', offline)) { if (S.voyage) S.voyage.inEvent = !offline && !!Events.blocking(); return; }
        v.inBattle = true;
        const lv = Math.round(rand(v.lv[0], v.lv[1]));
        this.startBattle(monsterStats(v.mons[Math.floor(Math.random() * v.mons.length)], lv), { where: 'voyage', tier: this.progressTier() }, offline);
      }
    } else if (S.mode === 'dungeon') {
      const D = S.dungeon;
      if (D.phase === 'walk') { D.t += dt; if (D.t >= DUNGEON_WALK) { D.t = 0; this.dungeonRoom(offline); } }
      else if (D.phase === 'bossWait' && !offline) this.dungeonBoss(false);
    }
  },
  simulateOffline(seconds) {
    const S = this.S;
    const rep = { kind: S.mode, before: { coins: S.coins, gear: S.gear.length, battles: S.advStats.battles, wins: S.advStats.wins }, left: 0 };
    let t = 0;
    while (t < seconds && S.mode !== 'fish') {
      if (S.mode === 'dungeon' && S.dungeon.phase === 'bossWait') { rep.bossWait = true; break; }
      this.tickWorld(1, true); t += 1;
    }
    rep.left = Math.max(0, seconds - t);
    rep.coins = S.coins - rep.before.coins; rep.gear = S.gear.length - rep.before.gear;
    rep.battles = S.advStats.battles - rep.before.battles; rep.wins = S.advStats.wins - rep.before.wins;
    rep.endMode = S.mode;
    return rep;
  },

  // ---------- 剧情 ----------
  story(id, cb, force) {
    const S = this.S;
    if (!id || !STORY[id] || (S.story.seen[id] && !force)) { if (cb) cb(); return; }
    S.story.seen[id] = true;
    Game.emit('story', { id, cb });
  },
};
