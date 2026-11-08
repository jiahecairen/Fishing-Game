// ===== 角色 · 逻辑：属性、天赋、装备、套装效果、生命 =====
// 对外提供的钩子：
//   hero.buffs()      → 返回 { atk, def, spd, luck, regen, atkMul } 之类的临时加成（料理、副本祭坛……）
//   hero.skills()     → 返回额外的技能 id 数组（新模块可以给小橘加技能）
// 对外加成：fish.luck / fish.bite / fish.rare / fish.price / treasure.rate
'use strict';

const Hero = {
  get S() { return Game.S; },

  // ---------- 套装 ----------
  setCounts() {
    const c = {};
    for (const g of this.equipped()) { const U = g.u && UNIQUES[g.u]; if (U && U.set) c[U.set] = (c[U.set] || 0) + 1; }
    return c;
  },
  setBonus() {
    const c = this.setCounts(), b = { luck: 0, bite: 0, apRegen: 0, atkPct: 0, hpPct: 0, regen: 0, thorns: 0, crit: 0, critDmg: 0, critAp: 0 };
    for (const [k, n] of Object.entries(c)) {
      const set = SETS[k]; if (!set || !set.bonus) continue;
      for (const [need, bonus] of Object.entries(set.bonus)) if (n >= +need) for (const [stat, v] of Object.entries(bonus)) b[stat] = (b[stat] || 0) + v;
    }
    return b;
  },
  buffs() { return CF.call('hero.buffs').filter(Boolean); },
  buffSum(k) { return this.buffs().reduce((s, b) => s + (b[k] || 0), 0); },

  // ---------- 属性 ----------
  equipped() { const e = this.S.hero.equip; return SLOT_ORDER.map(s => this.S.gear.find(g => g.uid === e[s])).filter(Boolean); },
  // 装备特效（吸血、冻结、反伤……），战斗系统会读取
  effects() {
    const fx = {};
    for (const g of this.equipped()) if (g.u) { const U = UNIQUES[g.u]; if (U && U.effect) fx[U.effect] = (fx[U.effect] || 0) + U.eff; }
    const sb = this.setBonus();
    if (sb.regen) fx.regen = (fx.regen || 0) + sb.regen;
    if (sb.thorns) fx.thorns = (fx.thorns || 0) + sb.thorns;
    if (sb.apRegen) fx.apRegen = sb.apRegen;
    if (sb.critAp) fx.critAp = sb.critAp;
    const r = this.buffSum('regen'); if (r) fx.regen = (fx.regen || 0) + r;
    return fx;
  },
  talentRank(id) { return this.S.talents[id] || 0; },
  talentVal(id) { const t = TALENTS.find(x => x.id === id); return t ? this.talentRank(id) * t.per : 0; },
  stats() {
    const S = this.S, s = Object.assign({}, HERO_BASE, { luck: 0 });
    for (const [k, n] of Object.entries(S.attrs)) if (n && ATTRS[k]) ATTRS[k].apply(s, n);
    for (const g of this.equipped()) { const gs = gearStats(g); for (const k in gs) s[k] = (s[k] || 0) + gs[k]; }
    const sb = this.setBonus(), bs = this.buffs();
    const sum = k => bs.reduce((a, b) => a + (b[k] || 0), 0);
    s.atk *= 1 + this.talentVal('c1') + sb.atkPct + sum('atk');
    s.maxHp *= 1 + sb.hpPct; s.crit += sb.crit; s.critDmg += sb.critDmg;
    if (sum('def')) s.def *= 1 + sum('def');
    if (sum('spd')) s.spd *= 1 + sum('spd');
    s.def *= 1 + this.talentVal('s1'); s.maxHp *= 1 + this.talentVal('s1') * 0.8;
    s.crit += this.talentVal('c3'); s.critDmg += this.talentVal('c3') * 2.5;
    const fx = this.effects();
    if (fx.critDmg) s.critDmg += fx.critDmg;
    s.apStart += this.talentRank('c5') + (fx.apStart || 0);
    for (const b of bs) if (b.atkMul) s.atk *= 1 + b.atkMul;
    s.maxHp = Math.round(s.maxHp); s.atk = Math.round(s.atk); s.def = Math.round(s.def); s.spd = Math.round(s.spd * 10) / 10;
    s.crit = Math.min(0.75, s.crit);
    this._maxHp = s.maxHp;
    return s;
  },
  power() { const s = this.stats(); return Math.round(s.atk * 2 + s.def * 1.5 + s.maxHp / 5 + s.spd * 2 + s.crit * 100); },
  gearLuck() {
    let l = 0; for (const g of this.equipped()) l += gearStats(g).luck || 0;
    return l + this.setBonus().luck + this.buffSum('luck');
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
  // 小橘会的技能 id（技能本身由战斗模块定义）
  skills() {
    const list = ['punch', 'claw'];
    for (const t of TALENTS) if (t.skill && this.talentRank(t.id)) list.push(t.skill);
    for (const extra of CF.call('hero.skills')) if (Array.isArray(extra)) list.push(...extra);
    return [...new Set(list)];
  },
  heal(hp) {
    const st = this.stats(), H = this.S.hero, h0 = H.hp;
    H.hp = Math.min(st.maxHp, H.hp + (hp || 0));
    return Math.round(H.hp - h0);
  },
  regen(dt, rate) { this.heal(this.stats().maxHp * rate * dt); },
  hurt(pct, k) { // 按最大生命的百分比扣血（不会致死），返回扣了多少
    const H = this.S.hero, d = Math.round(this.stats().maxHp * pct * (k === undefined ? 1 : k));
    H.hp = Math.max(1, H.hp - d); return d;
  },
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
    Inv.afterChange();
    return n;
  },

  // ---------- 装备 ----------
  newGear(tier, rolls, slot) {
    let q = 0;
    for (let i = 0; i < (rolls || 1); i++) q = Math.max(q, QUALITY.indexOf(weightedPick(QUALITY.map(x => [x, x.w]))));
    return { uid: Game.nextUid(), slot: slot || SLOT_ORDER[Math.floor(Math.random() * 5)], tier: clamp(Math.round(tier), 1, 5), q, e: 0 };
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
    if (!U || CF.first('hero.uniqueBlocked', u)) return null; // 后台下架的装备不再发放
    const g = { uid: Game.nextUid(), u, slot: U.slot, tier: U.tier, q: 4, e: 0 };
    this.S.gear.push(g);
    if (!quiet) Game.toast(`✨ 获得隐藏装备「${U.name}」！`, 'good');
    return g;
  },
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
};

CF.module({
  id: 'hero',
  state: () => ({
    hero: { hp: 100, equip: { weapon: null, hat: null, armor: null, boots: null, charm: null } },
    attrs: { str: 0, vit: 0, tou: 0, agi: 0 }, talents: {}, bonusAttr: 0, bonusTal: 0,
    gear: [], gearCap: 80,
  }),
  migrate(S) {
    S.hero.equip = Object.assign({ weapon: null, hat: null, armor: null, boots: null, charm: null }, S.hero.equip);
    delete S.hero.mp;
    for (const g of S.gear) { if (g.e === undefined) g.e = 0; if (g.q === undefined) g.q = 0; }
    // 新角色送一套最基础的装备
    if (!S.gear.length && !S.story.seen._starter) {
      S.story.seen._starter = true;
      for (const slot of SLOT_ORDER) { const g = { uid: S.uid++, slot, tier: 1, q: 0, e: 0 }; S.gear.push(g); S.hero.equip[slot] = g.uid; }
    }
    Hero.clampHero();
  },
  init() {
    // 给钓鱼提供加成
    CF.hook('fish.luck', () => Hero.gearLuck());
    CF.hook('fish.bite', () => Hero.talentVal('f1') + Hero.setBonus().bite);
    CF.hook('fish.rare', () => Hero.talentVal('f4'));
    CF.hook('fish.price', () => Hero.talentVal('f3'));
    CF.hook('treasure.rate', () => Hero.talentVal('f2') + (Hero.effects().treasure || 0));
    // 能吃的鱼：放进物品栏
    CF.hook('inv.card', it => { const fv = foodValue(it); return fv ? `<div class="food">❤️${fv.hp}${fv.ap ? ` ⚡+${fv.ap}` : ''}</div>` : ''; });
    CF.hook('inv.buttons', (key, si) => key === 'bag' ? `<button class="btn sm red" data-act="eat" ${si.n ? '' : 'disabled'}>🍽️ 吃掉</button>` : '');
  },
  tick(dt) { if (!CF.modes.busy() && !CF.first('fish.paused')) Hero.regen(dt, 0.01); },
});
