// ===== 物品栏 · 逻辑 =====
// 鱼放在三种「容器」里：bag 背包、wh 当前地点的仓库、hold 船舱（跟着船走）。
// 其他东西（道具、鱼饵、素材、宝藏、料理……）按「种类」计数。各模块用 Inv.kind() 注册自己的种类，
// 这样任务、委托、锻造只要写 ['dish', 'grill', 2] 这样的需求，就能检查和扣除，不用关心东西存在哪。
'use strict';

const UPGRADES = {
  bag: { name: '背包扩容', icon: '🎒', step: 10, base: 300, growth: 1.6, max: 120 },
  wh: { name: '仓库扩容', icon: '🏠', step: 50, base: 1000, growth: 1.5, max: 1000 },
};
// 素材：各模块用 CF.content.define('material', id, {...}) 注册
const MATERIALS = {};
CF.content.type('material', { map: MATERIALS });

// 仓库是「每个地点各一个」：S.warehouse / S.whCap / S.whLv 总是指向当前所在地点
function defineLocalStorage(S) {
  const def = (k, store, dflt) => Object.defineProperty(S, k, {
    get() { if (this[store][this.scene] === undefined) this[store][this.scene] = (typeof dflt === 'function' ? dflt() : dflt); return this[store][this.scene]; },
    set(v) { this[store][this.scene] = v; }, enumerable: false, configurable: true,
  });
  def('warehouse', 'whs', () => []); def('whCap', 'whCaps', 60); def('whLv', 'whLvs', 0);
}

const Inv = {
  get S() { return Game.S; },
  kinds: {},
  // ---------- 容器 ----------
  store(k) { const S = this.S; return k === 'bag' ? S.bag : k === 'hold' ? S.hold : S.warehouse; },
  storeCap(k) { const S = this.S; return k === 'bag' ? S.bagCap : k === 'hold' ? (CF.first('inv.holdCap') || 0) : S.whCap; },
  storeName(k) { return { bag: '背包', wh: '仓库', hold: '船舱' }[k]; },
  allFish() { const S = this.S; return [...S.bag, ...S.warehouse]; },
  take(from, uids) {
    const arr = this.store(from);
    const set = new Set(uids), taken = [];
    for (let i = arr.length - 1; i >= 0; i--) if (set.has(arr[i].uid)) taken.push(arr.splice(i, 1)[0]);
    return taken.reverse();
  },
  // 放生：鱼回到水里，获得少量经验
  release(from, uids) {
    const items = this.take(from, uids);
    let exp = 0;
    for (const x of items) exp += Fishing.releaseExp(x);
    if (items.length) { Game.gainExp(exp); Game.emit('released', { count: items.length, exp }); }
    this.afterChange();
    return items.length;
  },
  releaseWhere(from, pred) { return this.release(from, this.store(from).filter(x => pred(FISH_BY_ID[x.id], x)).map(x => x.uid)); },
  move(from, uids, toKey) {
    toKey = toKey || (from === 'bag' ? 'wh' : 'bag');
    if (toKey === 'hold' && !this.storeCap('hold')) { Game.toast('还没有船', 'warn'); return 0; }
    const to = this.store(toKey), room = this.storeCap(toKey) - to.length;
    if (room <= 0) { Game.toast(`${this.storeName(toKey)}已满`, 'warn'); return 0; }
    const items = this.take(from, uids.slice(0, room));
    to.push(...items);
    if (uids.length > room) Game.toast(`空间不足，只移动了 ${room} 条`, 'warn');
    this.afterChange();
    return items.length;
  },
  // 放进背包，满了放仓库；都满返回 false
  put(item) {
    const S = this.S;
    if (S.bag.length < S.bagCap) { S.bag.push(item); return true; }
    if (S.warehouse.length < S.whCap) { S.warehouse.push(item); return true; }
    return false;
  },
  afterChange() { CF.emit('inv:change'); Game.changed(); },

  // ---------- 扩容 ----------
  upgradeCost(type) {
    const u = UPGRADES[type], lv = type === 'bag' ? this.S.bagLv : this.S.whLv;
    return Math.round(u.base * Math.pow(u.growth, lv) / 10) * 10;
  },
  buyUpgrade(type) {
    const S = this.S, u = UPGRADES[type];
    const cur = type === 'bag' ? S.bagCap : S.whCap;
    if (cur >= u.max) { Game.toast('已经是最大容量了', 'warn'); return false; }
    if (!Game.pay(this.upgradeCost(type))) return false;
    if (type === 'bag') { S.bagCap += u.step; S.bagLv++; } else { S.whCap += u.step; S.whLv++; }
    Game.toast(`${u.name}成功！`, 'good');
    this.afterChange(); Game.save(); return true;
  },

  // ---------- 「需要」检查：need = [[种类, id, 数量], ...] ----------
  // 种类由各模块注册：Inv.kind('dish', { have: id => n, take: (id, n) => {}, name: id => '烤鱼串' })
  kind(k, def) { this.kinds[k] = def; },
  have(k, id) { const d = this.kinds[k]; return d ? d.have(id) : 0; },
  needName(k, id) { const d = this.kinds[k]; return d ? d.name(id) : id; },
  canPay(need) { return need.every(([k, id, n]) => this.have(k, id) >= n); },
  payNeed(need) {
    for (const [k, id, n] of need) { const d = this.kinds[k]; if (d) d.take(id, n); }
    this.afterChange();
  },
  give(k, id, n) { const d = this.kinds[k]; if (d && d.give) d.give(id, n); },
};

// 内置的几种
const counter = (bag, nameFn) => ({
  have: id => Game.S[bag][id] || 0,
  take: (id, n) => { Game.S[bag][id] = (Game.S[bag][id] || 0) - n; },
  give: (id, n) => { Game.S[bag][id] = (Game.S[bag][id] || 0) + n; },
  name: nameFn,
});
Inv.kind('fish', {
  have: id => Inv.allFish().filter(x => x.id === id).length,
  take: (id, n) => { const S = Game.S; let left = n; for (const arr of [S.warehouse, S.bag]) for (let i = arr.length - 1; i >= 0 && left > 0; i--) if (arr[i].id === id) { arr.splice(i, 1); left--; } },
  give: (id, n) => { for (let i = 0; i < n; i++) Inv.put(Fishing.makeCatch(FISH_BY_ID[id])); },
  name: id => FISH_BY_ID[id].name,
});
Inv.kind('item', counter('items', id => ITEM_BY_ID[id].name));
Inv.kind('bait', counter('baits', id => findById(BAITS, id).name));
Inv.kind('mat', counter('mats', id => MATERIALS[id].name));
Inv.kind('coins', { have: () => Game.S.coins, take: (id, n) => { Game.S.coins -= n; }, give: (id, n) => Game.addCoins(n), name: () => '金币' });

CF.module({
  id: 'inventory',
  state: () => ({ bag: [], bagCap: 25, bagLv: 0, whs: { lake: [] }, whCaps: { lake: 60 }, whLvs: { lake: 0 }, hold: [], mats: {} }),
  migrate(S) {
    // 旧存档：只有一个仓库 → 放到当前所在地点
    const d = Object.getOwnPropertyDescriptor(S, 'warehouse');
    if (d && 'value' in d) {
      const sc = S.scene || 'lake';
      S.whs = { [sc]: S.warehouse || [] }; S.whCaps = { [sc]: S.whCap || 100 }; S.whLvs = { [sc]: S.whLv || 0 };
      delete S.warehouse; delete S.whCap; delete S.whLv;
    }
    defineLocalStorage(S);
  },
});
