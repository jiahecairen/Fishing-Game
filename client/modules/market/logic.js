// ===== 寄卖行 · 逻辑：挂单、行情、会员 =====
// 价格「像股票」：每个东西有一个基准价；每个月有一个中心价（基准价 ±8% 以内），每天在中心价附近 ±3.5% 小幅波动。
// 价格完全由「东西 + 日期」决定（哈希），所以离线回来也是同样的行情。
'use strict';

const MARKET_OPEN_FEE = 200;
const MARKET_TIERS = [
  { name: '普通', req: 0, fee: 0, cut: 0.12, slots: 10, color: '#a39a86', perks: '只能看到当天价格，一次挂一件' },
  { name: '铜卡', req: 3000, fee: 200, cut: 0.09, slots: 25, chart: true, color: '#c0803a', perks: '行情走势图（实时监控 30 天价格）' },
  { name: '银卡', req: 20000, fee: 1200, cut: 0.07, slots: 50, chart: true, batch: true, color: '#9fb4c8', perks: '+ 批量定价' },
  { name: '金卡', req: 100000, fee: 5000, cut: 0.05, slots: 100, chart: true, batch: true, band: true, color: '#ffc93c', perks: '+ 显示本月价格区间' },
  { name: '钻石', req: 500000, fee: 20000, cut: 0.03, slots: 200, chart: true, batch: true, band: true, color: '#7fe7ff', perks: '+ 最低手续费' },
];

const Market = {
  acc: 0,
  kinds: {},
  // 能挂卖的东西的种类：Market.kind('dish', { base: id => 价格, name: id => 名字, sellable: id => bool, give: (id, n) => {} })
  kind(k, def) { this.kinds[k] = def; },
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
  base(kind, id) { return this.kinds[kind].base(id); },
  itemName(kind, id) { return this.kinds[kind].name(id); },
  price(kind, id, d) { return Math.round(this.base(kind, id) * this.idx(this.key(kind, id), d === undefined ? this.today() : d)); },
  history(kind, id, days) {
    const d0 = this.today(), out = [];
    for (let d = d0 - (days - 1); d <= d0; d++) out.push({ d, p: this.price(kind, id, d) });
    return out;
  },
  sellable(kind, id) { const k = this.kinds[kind]; return !!k && k.sellable(id); },
  // 某件鱼按今天行情值多少钱
  marketValue(kind, idOrItem) {
    if (kind !== 'fish') return this.price(kind, idOrItem);
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
      const arr = Inv.store(p.from), i = arr.findIndex(x => x.uid === p.uid); if (i < 0) continue;
      const it = arr[i];
      if (!this.sellable('fish', it.id)) continue;
      arr.splice(i, 1);
      M.listings.push({ lid: M.lid++, kind: 'fish', id: it.id, item: it, price: Math.max(1, Math.round(this.marketValue('fish', it) * mult)), day: this.today() });
      n++;
    }
    if (n) Game.toast(`挂出了 ${n} 件`, 'good');
    Inv.afterChange(); return n;
  },
  // 挂卖按「个数」计的东西（料理……）：kind 需要提供 have / take
  listCount(kind, id, count, mult) {
    const M = this.M, K = this.kinds[kind];
    if (!M.open) { Game.toast('先开通寄卖行账户', 'warn'); return 0; }
    if (count > 1 && !this.tierDef().batch) { Game.toast('批量定价需要「银卡」会员', 'warn'); count = 1; }
    let n = 0;
    while (n < count && K.have(id) > 0 && this.slotsLeft() > 0) {
      K.take(id, 1); n++;
      M.listings.push({ lid: M.lid++, kind, id, price: Math.max(1, Math.round(this.price(kind, id) * mult)), day: this.today() });
    }
    if (n) Game.toast(`挂出了 ${n} 份${K.name(id)}`, 'good');
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
    if (L.kind !== 'fish') this.kinds[L.kind].give(L.id, 1);
    else if (!Inv.put(L.item)) { Game.toast('背包和仓库都满了，撤不回来', 'warn'); return; }
    M.listings.splice(i, 1); Game.changed();
  },
  delistAll() { for (const L of this.M.listings.slice()) this.delist(L.lid); },

  // ---------- 成交 ----------
  saleProb(L, hours) {
    const mv = L.kind !== 'fish' ? this.price(L.kind, L.id) : this.marketValue('fish', L.item);
    const ratio = L.price / Math.max(1, mv);
    const rar = L.kind !== 'fish' ? 0.9 : { junk: 1, common: 1, rare: 0.8, epic: 0.6 }[FISH_BY_ID[L.id].rarity] || 0.7;
    const p = clamp(0.3 * Math.exp(-7 * (ratio - 1)) * rar, 0.004, 0.95);
    return 1 - Math.pow(1 - p, hours);
  },
  sell(L, quiet) {
    const M = this.M, cut = this.tierDef().cut, get = Math.round(L.price * (1 - cut));
    Game.addCoins(get);
    M.monthSales += L.price; M.total += L.price;
    const name = this.itemName(L.kind, L.id);
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

Market.kind('fish', {
  base: id => FISH_BY_ID[id].price,
  name: id => FISH_BY_ID[id].name,
  sellable: id => { const f = FISH_BY_ID[id]; return !!f && !f.treasure && f.rarity !== 'legendary'; },
});

CF.module({
  id: 'market',
  state: () => ({ market: Market.defaults() }),
  offlinePriority: 10,
  migrate(S) { if (S.market.month < 0) S.market.month = Math.floor(Math.floor(S.gameMinutes / 1440) / MONTH_DAYS); },
  init() {
    // 招财猫：背包仓库都满时自动按市价挂单
    CF.hook('fish.overflow', item => Market.autoList(item));
  },
  tick: dt => Market.tick(dt),
  offline(ctx) { ctx.report.market = Market.offline(ctx.seconds); if (ctx.report.market.n) ctx.report.notable = true; },
});
