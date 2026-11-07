// ===== 寄卖行：挂单卖鱼/料理，像股票一样每天变动的行情，会员等级 =====
'use strict';

function hash01(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
  return mulberry32(h >>> 0)();
}

const Market = {
  acc: 0,
  get M() { return Game.S.market; },
  defaults() { return { open: false, tier: 0, listings: [], lid: 1, monthSales: 0, lastMonthSales: 0, total: 0, month: -1, log: [], watch: 'carp' }; },
  migrate(S) {
    S.market = Object.assign(this.defaults(), S.market || {});
    if (S.market.month < 0) S.market.month = Math.floor(Math.floor(S.gameMinutes / 1440) / MONTH_DAYS);
  },
  tierDef(t) { return MARKET_TIERS[t === undefined ? this.M.tier : t]; },
  today() { return Game.dayIndex(); },

  // ---------- 行情 ----------
  // 每月有一个中心价（基准价 ±8% 以内），每天在中心价附近小幅波动（±3.5%）
  idx(key, d) {
    const mi = Math.floor(d / MONTH_DAYS);
    const center = 1 + 0.08 * (hash01(key + '|m' + mi) * 2 - 1);
    const n0 = hash01(key + '|d' + d) * 2 - 1, n1 = hash01(key + '|d' + (d - 1)) * 2 - 1;
    return center + 0.035 * (n0 * 0.7 + n1 * 0.3);
  },
  monthRange(key, d) {
    const mi = Math.floor(d / MONTH_DAYS), center = 1 + 0.08 * (hash01(key + '|m' + mi) * 2 - 1);
    return [center - 0.035, center + 0.035];
  },
  key(kind, id) { return kind + ':' + id; },
  base(kind, id) { return kind === 'dish' ? DISHES[id].price : FISH_BY_ID[id].price; },
  price(kind, id, d) { return Math.round(this.base(kind, id) * this.idx(this.key(kind, id), d === undefined ? this.today() : d)); },
  history(kind, id, days) {
    const d0 = this.today(), out = [];
    for (let d = d0 - (days - 1); d <= d0; d++) out.push({ d, p: this.price(kind, id, d) });
    return out;
  },
  sellable(kind, id) {
    if (kind === 'dish') return !!DISHES[id];
    const f = FISH_BY_ID[id];
    return f && !f.treasure && f.rarity !== 'legendary';
  },
  // 某件鱼按今天行情值多少钱
  marketValue(kind, idOrItem) {
    if (kind === 'dish') return this.price('dish', idOrItem);
    const it = idOrItem;
    return Math.round(it.value * this.idx(this.key('fish', it.id), this.today()));
  },

  // ---------- 账户 ----------
  openAccount() {
    if (this.M.open) return;
    if (!Game.pay(MARKET_OPEN_FEE)) return;
    this.M.open = true; this.M.month = Game.date().monthIndex;
    Game.toast('寄卖行账户开通了！', 'good'); Game.changed(); Game.save();
  },
  slotsLeft() { return this.tierDef().slots - this.M.listings.length; },
  bestSales() { return Math.max(this.M.monthSales, this.M.lastMonthSales); },
  buyTier(t) {
    const T = MARKET_TIERS[t];
    if (!this.M.open || t <= this.M.tier) return;
    if (this.bestSales() < T.req) { Game.toast(`需要月销售额达到 🪙${fmtFull(T.req)}`, 'warn'); return; }
    if (!Game.pay(T.fee)) return;
    this.M.tier = t;
    Game.toast(`升级为寄卖行「${T.name}」会员！`, 'good'); Game.changed(); Game.save();
  },
  // 月结：检查是否达到会员要求的销售额，并扣会费
  monthCheck(quiet) {
    const M = this.M, mi = Game.date().monthIndex;
    if (!M.open) { M.month = mi; return; }
    while (M.month < mi) {
      M.month++;
      M.lastMonthSales = M.monthSales; M.monthSales = 0;
      if (M.tier > 0) {
        let t = M.tier;
        while (t > 0 && M.lastMonthSales < MARKET_TIERS[t].req) t--;
        if (t > 0 && Game.S.coins < MARKET_TIERS[t].fee) t = 0;
        if (t > 0) Game.S.coins -= MARKET_TIERS[t].fee;
        if (!quiet) Game.toast(t === M.tier ? `寄卖行月结：缴纳会费 🪙${fmtFull(MARKET_TIERS[t].fee)}` : `上月销售额不足或会费不够，会员降为「${MARKET_TIERS[t].name}」`, t === M.tier ? '' : 'warn');
        M.tier = t;
      }
    }
  },

  // ---------- 挂单 ----------
  // picks: [{from:'bag'|'wh'|'hold', uid}]；mult：相对今日行情的定价倍率
  listFish(picks, mult) {
    const M = this.M;
    if (!M.open) { Game.toast('先开通寄卖行账户', 'warn'); return 0; }
    if (picks.length > 1 && !this.tierDef().batch) { Game.toast('批量定价需要「银卡」会员', 'warn'); return 0; }
    let n = 0;
    for (const p of picks) {
      if (this.slotsLeft() <= 0) { Game.toast('挂单已满，升级会员可以挂更多', 'warn'); break; }
      const arr = Game.store(p.from), i = arr.findIndex(x => x.uid === p.uid); if (i < 0) continue;
      const it = arr[i];
      if (!this.sellable('fish', it.id)) continue;
      arr.splice(i, 1);
      M.listings.push({ lid: M.lid++, kind: 'fish', id: it.id, item: it, price: Math.max(1, Math.round(this.marketValue('fish', it) * mult)), day: this.today() });
      n++;
    }
    if (n) Game.toast(`挂出了 ${n} 件`, 'good');
    Game.afterStorageChange(); return n;
  },
  listDish(id, count, mult) {
    const M = this.M, S = Game.S;
    if (!M.open) { Game.toast('先开通寄卖行账户', 'warn'); return 0; }
    if (count > 1 && !this.tierDef().batch) { Game.toast('批量定价需要「银卡」会员', 'warn'); count = 1; }
    let n = 0;
    while (n < count && (S.dishes[id] || 0) > 0 && this.slotsLeft() > 0) {
      S.dishes[id]--; n++;
      M.listings.push({ lid: M.lid++, kind: 'dish', id, price: Math.max(1, Math.round(this.price('dish', id) * mult)), day: this.today() });
    }
    if (n) Game.toast(`挂出了 ${n} 份${DISHES[id].name}`, 'good');
    Game.changed(); return n;
  },
  autoList(item) { // 招财猫：按市价自动挂单
    if (!this.M.open || this.slotsLeft() <= 0 || !this.sellable('fish', item.id)) return false;
    this.M.listings.push({ lid: this.M.lid++, kind: 'fish', id: item.id, item, price: this.marketValue('fish', item), day: this.today(), auto: true });
    return true;
  },
  delist(lid) {
    const M = this.M, S = Game.S, i = M.listings.findIndex(l => l.lid === lid); if (i < 0) return;
    const L = M.listings[i];
    if (L.kind === 'dish') S.dishes[L.id] = (S.dishes[L.id] || 0) + 1;
    else if (S.bag.length < S.bagCap) S.bag.push(L.item);
    else if (S.warehouse.length < S.whCap) S.warehouse.push(L.item);
    else { Game.toast('背包和仓库都满了，撤不回来', 'warn'); return; }
    M.listings.splice(i, 1); Game.changed();
  },
  delistAll() { for (const L of this.M.listings.slice()) this.delist(L.lid); },

  // ---------- 成交 ----------
  saleProb(L, hours) {
    const mv = L.kind === 'dish' ? this.price('dish', L.id) : this.marketValue('fish', L.item);
    const ratio = L.price / Math.max(1, mv);
    const rar = L.kind === 'dish' ? 0.9 : { junk: 1, common: 1, rare: 0.8, epic: 0.6 }[FISH_BY_ID[L.id].rarity] || 0.7;
    const p = clamp(0.3 * Math.exp(-7 * (ratio - 1)) * rar, 0.004, 0.95);
    return 1 - Math.pow(1 - p, hours);
  },
  sell(L, quiet) {
    const M = this.M, cut = this.tierDef().cut, get = Math.round(L.price * (1 - cut));
    Game.addCoins(get);
    M.monthSales += L.price; M.total += L.price;
    const name = L.kind === 'dish' ? DISHES[L.id].name : FISH_BY_ID[L.id].name;
    M.log.unshift({ name, price: L.price, get, day: this.today() }); if (M.log.length > 30) M.log.length = 30;
    if (!quiet) Game.emit('marketSale', { name, get });
  },
  process(hours, quiet) {
    const M = this.M; if (!M.open || !M.listings.length) return { n: 0, coins: 0 };
    let n = 0, coins = 0; const keep = [];
    for (const L of M.listings) {
      if (Math.random() < this.saleProb(L, hours)) { const c0 = Game.S.coins; this.sell(L, quiet); coins += Game.S.coins - c0; n++; }
      else keep.push(L);
    }
    M.listings = keep;
    if (n) Game.changed();
    return { n, coins };
  },
  tick(dt) { // 每 1 游戏小时（现实 60 秒）结算一次
    this.acc += dt;
    if (this.acc >= 60) { this.acc -= 60; this.process(1); this.monthCheck(); }
  },
  offline(seconds) { const r = this.process(seconds / 60, true); this.monthCheck(true); return r; },
};
