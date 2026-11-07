// ===== 售卖：鱼和料理直接卖掉，按原价立刻到手 =====
// 价格：鱼 = 钓上来时算好的价值（已经包含等级、天赋「鱼市行家」等加成）；料理 = 菜谱上的价格。
// 别的模块可以用钩子参与：
//   CF.hook('sell.price', (item) => 倍率加成)   例如以后做「收购站涨价日」
//   Game.on('sold', d => ...)                    {count, coins, auto}
'use strict';

const Sell = {
  track: null, // 离线结算时统计招财猫卖了多少
  cheap: f => f.rarity === 'junk' || f.rarity === 'common',
  sellable: f => !!f && !f.treasure,
  price(item) { return Math.max(1, Math.round(item.value * (1 + CF.sum('sell.price', item)))); },
  dishPrice: id => (typeof DISHES !== 'undefined' && DISHES[id]) ? DISHES[id].price : 0,

  // 卖掉某个容器里的几条鱼
  fish(from, uids, quiet) {
    const set = new Set(uids);
    const list = Inv.store(from).filter(x => set.has(x.uid) && this.sellable(FISH_BY_ID[x.id]));
    if (!list.length) return 0;
    const items = Inv.take(from, list.map(x => x.uid));
    const coins = items.reduce((s, x) => s + this.price(x), 0);
    this.gain(items.length, coins, quiet);
    Inv.afterChange();
    return coins;
  },
  where(from, pred) { return this.fish(from, Inv.store(from).filter(x => pred(FISH_BY_ID[x.id], x)).map(x => x.uid)); },
  dish(id, n) {
    const S = Game.S, have = (S.dishes && S.dishes[id]) || 0; n = Math.min(n, have);
    if (n <= 0) return 0;
    S.dishes[id] -= n;
    const coins = this.dishPrice(id) * n;
    this.gain(n, coins, false, `${DISHES[id].name} ×${n}`);
    Game.changed();
    return coins;
  },
  gain(count, coins, quiet, what) {
    const S = Game.S;
    Game.addCoins(coins);
    S.stats.sold = (S.stats.sold || 0) + count; S.stats.soldCoins = (S.stats.soldCoins || 0) + coins;
    Game.emit('sold', { count, coins, auto: !!quiet });
    if (!quiet) { UI.toast(`🪙 卖出${what ? ' ' + what : ` ${count} 条`}，到手 🪙${fmtFull(coins)}`, 'good'); Sound.coin(); }
  },
  // 招财猫：满仓时把这条（普通/杂物）鱼按原价卖掉
  auto(item) {
    const f = FISH_BY_ID[item.id];
    if (!this.sellable(f)) return null;
    const coins = this.price(item);
    this.gain(1, coins, true);
    if (this.track) { this.track.n++; this.track.coins += coins; }
    return 'sold';
  },
  // 寄卖行关掉以后：把旧存档里还挂着的东西退回来（放不下就按原价卖掉）
  refundMarket(S) {
    const M = S.market;
    if (!M || !Array.isArray(M.listings) || !M.listings.length) return null;
    let back = 0, sold = 0, coins = 0;
    for (const L of M.listings) {
      if (L.kind === 'fish' && L.item) {
        if (S.bag.length < S.bagCap) { S.bag.push(L.item); back++; }
        else if (S.warehouse.length < S.whCap) { S.warehouse.push(L.item); back++; }
        else { coins += L.item.value || 0; sold++; }
      } else if (S.dishes && L.id) { S.dishes[L.id] = (S.dishes[L.id] || 0) + 1; back++; }
      else { coins += L.price || 0; sold++; }
    }
    S.coins += coins; M.listings = [];
    return { back, sold, coins };
  },
};

// ---------- 背包 / 仓库 / 船舱 的按钮 ----------
CF.hook('inv.buttons', (key, si) => {
  const list = Inv.store(key), cheapN = list.filter(x => Sell.cheap(FISH_BY_ID[x.id])).length;
  const v = list.filter(x => UI.sel.has(x.uid)).reduce((s, x) => s + Sell.price(x), 0);
  return `<button class="btn sm primary" data-act="sellsel" data-from="${key}" ${si.n ? '' : 'disabled'}>🪙 卖出${si.n ? `（🪙${fmtFull(v)}）` : ''}</button>`
    + `<button class="btn sm" data-act="sellcheap" data-from="${key}" ${cheapN ? '' : 'disabled'} title="★ 大个的也会一起卖掉">卖掉杂物和普通鱼</button>`;
});
// ---------- 料理 ----------
CF.hook('kitchen.dishButtons', id => {
  const n = Game.S.dishes[id] || 0, p = Sell.dishPrice(id);
  return `<button class="btn sm" data-act="selldish" data-id="${id}" data-n="1">卖 🪙${fmtFull(p)}</button>${n > 1 ? `<button class="btn sm" data-act="selldish" data-id="${id}" data-n="${n}">全卖</button>` : ''}`;
});
CF.hook('kitchen.recipeInfo', id => ` · 售价 🪙${fmtFull(Sell.dishPrice(id))}`);
// ---------- 招财猫 ----------
CF.hook('fish.overflow', item => Sell.auto(item));
CF.hook('fish.overflowDesc', () => '背包和仓库都满时，招财猫按原价自动卖掉普通鱼和杂物');

UI.actions({
  sellsel(ds) { Sell.fish(ds.from, [...this.sel]); this.sel.clear(); },
  sellcheap(ds) { Sell.where(ds.from, f => Sell.cheap(f)); this.sel.clear(); },
  selldish(ds) { Sell.dish(ds.id, +ds.n); },
});
UI.offline(10, r => r.sell && r.sell.n ? `<div style="margin-top:8px">🐱 招财猫帮你卖掉了 ${r.sell.n} 条鱼，到手 🪙${fmtFull(r.sell.coins)}</div>` : '');

CF.module({
  id: 'sell',
  shared: { stats: { sold: 0, soldCoins: 0 } },
  offlinePriority: 5,
  migrate(S) {
    // 只有寄卖行没开的时候才退回挂单（以后重新开寄卖行，挂单就留着）
    if (typeof Market === 'undefined') Sell.refunded = Sell.refundMarket(S);
  },
  start() {
    const r = Sell.refunded;
    if (r) setTimeout(() => UI.toast(`📦 寄卖行暂停营业：${r.back ? `${r.back} 件挂单退回了背包/仓库` : ''}${r.sold ? `${r.back ? '，' : ''}${r.sold} 件按原价卖掉（🪙${fmtFull(r.coins)}）` : ''}`, 'good'), 1200);
  },
  offline(ctx) {
    Sell.track = ctx.report.sell = { n: 0, coins: 0 };
    ctx.after.push(c => { Sell.track = null; if (c.report.sell.n) c.report.notable = true; });
  },
});
