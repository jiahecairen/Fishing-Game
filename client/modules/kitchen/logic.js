// ===== 厨房 · 逻辑：挂机烹饪，做出的料理可以吃（回血 / 加 buff）也可以卖掉 =====
// 烹饪按现实时间计算，所以关掉游戏也会继续做。
// 新料理：CF.content.define('dish', 'id', { name, gi, need: [{ rarity|id|scene|bait, n }], time 秒, heal, ap, buff: { atk, def, spd, luck, regen, min }, price, known })
// 学会新料理：Cook.learn('id')（委托、事件的奖励）
'use strict';

// ---------- 料理 ----------
// need：{ rarity / id / scene / bait , n }；buff 持续 min 分钟
const DISHES = {};
CF.content.type('dish', { map: DISHES });
const DISH_LIST = {
  grill:    { name: '烤鱼串', gi: 'grill', need: [{ rarity: 'common', n: 2 }], time: 90, heal: 0.3, price: 70, known: true, desc: '最简单的美味。' },
  soup:     { name: '鲜鱼汤', gi: 'soup', need: [{ rarity: 'common', n: 3 }, { bait: 'shrimp', n: 2 }], time: 180, heal: 0.4, buff: { atk: 0.1, min: 10 }, price: 180, known: true, desc: '暖暖的，喝了浑身是劲。' },
  sashimi:  { name: '刺身拼盘', gi: 'sashimi', need: [{ rarity: 'rare', n: 2 }], time: 240, heal: 0.55, ap: 2, price: 480, known: true, desc: '新鲜就是正义。' },
  sweet:    { name: '糖醋鲤鱼', gi: 'sweet', need: [{ id: 'carp', n: 3 }], time: 200, heal: 0.45, buff: { def: 0.15, min: 10 }, price: 320, desc: '酸酸甜甜，泡泡的最爱。' },
  kabayaki: { name: '蒲烧鳗鱼', gi: 'kabayaki', need: [{ id: 'eel', n: 1 }, { id: 'ricefield', n: 1 }], time: 300, heal: 0.5, buff: { spd: 0.15, min: 10 }, price: 650, desc: '刷上酱汁，烤得滋滋响。' },
  sanma:    { name: '盐烤秋刀鱼', gi: 'sanma', need: [{ id: 'saury', n: 2 }], time: 240, heal: 0.4, buff: { luck: 0.25, min: 15 }, price: 260, desc: '秋天的味道。' },
  bamboo:   { name: '竹筒鱼饭', gi: 'bamboodish', need: [{ scene: 'bamboo', rarity: 'common', n: 2 }], time: 300, heal: 0.45, buff: { regen: 0.03, min: 10 }, price: 360, desc: '米饭里有竹子的清香。' },
  sushi:    { name: '锦鲤寿司', gi: 'sushi', need: [{ id: 'koi', n: 1 }, { rarity: 'rare', n: 2 }], time: 480, heal: 0.6, buff: { luck: 0.4, min: 20 }, price: 1500, desc: '据说吃了会转运。' },
  stew:     { name: '深渊炖菜', gi: 'stew', need: [{ scene: 'abyss', rarity: 'common', n: 2 }, { scene: 'abyss', rarity: 'rare', n: 1 }], time: 400, heal: 0.7, ap: 3, price: 950, desc: '紫色的汤，意外地好喝。' },
  crabpot:  { name: '帝王蟹火锅', gi: 'crabpot', need: [{ id: 'kingcrab', n: 1 }, { rarity: 'common', n: 3 }, { bait: 'catnip', n: 1 }], time: 600, heal: 1, buff: { atk: 0.2, def: 0.2, min: 15 }, price: 5200, desc: '豪华大餐！' },
};
Object.entries(DISH_LIST).forEach(([k, v]) => CF.content.define('dish', k, v));
const BUFF_NAMES = { atk: '攻击', def: '防御', spd: '速度', luck: '钓鱼幸运', regen: '每回合回血' };

const Cook = {
  get K() { return Game.S.kitchen; },
  needText(n) {
    if (n.bait) return `${findById(BAITS, n.bait).name}×${n.n}`;
    if (n.id) return `${FISH_BY_ID[n.id].name}×${n.n}`;
    return `${n.scene ? Game.sceneDef(n.scene).name + '的' : ''}${RARITY[n.rarity].name}鱼×${n.n}`;
  },
  matches(n, item) {
    const f = FISH_BY_ID[item.id];
    if (!f || f.treasure) return false;
    if (n.id) return item.id === n.id;
    if (n.scene && !f.scenes.includes(n.scene)) return false;
    return f.rarity === n.rarity;
  },
  // 从背包 + 当地仓库里找食材（优先用便宜的）
  plan(id, times) {
    const D = DISHES[id], S = Game.S, used = new Set(), picks = [], baits = {}, missing = [];
    const pool = [...S.bag.map(x => ['bag', x]), ...S.warehouse.map(x => ['wh', x])].sort((a, b) => a[1].value - b[1].value);
    for (const n of D.need) {
      const need = n.n * (times || 1);
      if (n.bait) {
        const have = S.baits[n.bait] || 0;
        if (have < need) missing.push(`${this.needText(n)}（缺 ${need - have}）`); else baits[n.bait] = need;
        continue;
      }
      let got = 0;
      for (const [from, it] of pool) { if (got >= need) break; if (!used.has(it.uid) && this.matches(n, it)) { used.add(it.uid); picks.push({ from, uid: it.uid }); got++; } }
      if (got < need) missing.push(`${this.needText(n)}（缺 ${need - got}）`);
    }
    return { ok: !missing.length, picks, baits, missing };
  },
  cook(id, times) {
    const K = this.K, D = DISHES[id];
    times = Math.max(1, times || 1);
    if (!K.known.includes(id)) return;
    if (K.queue.length >= K.slots) { Game.toast('灶台都在忙，等一等或者找工匠加一口锅', 'warn'); return; }
    const p = this.plan(id, times);
    if (!p.ok) { Game.toast('食材不够：' + p.missing.join('、'), 'warn'); return; }
    for (const pk of p.picks) Inv.take(pk.from, [pk.uid]);
    for (const [b, n] of Object.entries(p.baits)) Game.S.baits[b] -= n;
    const now = Date.now();
    K.queue.push({ id, n: times, start: now, end: now + D.time * 1000 * times });
    Game.toast(`开始烹饪：${D.name} ×${times}`, 'good');
    Inv.afterChange(); Game.save();
  },
  cancel(i) { this.K.queue.splice(i, 1); Game.toast('倒掉了……食材没了', 'warn'); Game.changed(); },
  tick() {
    const K = this.K, now = Date.now(); if (!K.queue.length) return;
    for (let i = K.queue.length - 1; i >= 0; i--) {
      const q = K.queue[i];
      if (q.end <= now) {
        Game.S.dishes[q.id] = (Game.S.dishes[q.id] || 0) + q.n;
        K.queue.splice(i, 1);
        Game.toast(`🍳 ${DISHES[q.id].name} ×${q.n} 做好了！`, 'good');
        Game.changed();
      }
    }
  },
  learn(id) { if (!this.K.known.includes(id)) { this.K.known.push(id); Game.toast(`学会了新料理：${DISHES[id].name}`, 'good'); } },
  // 吃料理：回血 + buff
  eat(id, inBattle) {
    const S = Game.S, D = DISHES[id];
    if (!(S.dishes[id] > 0)) return null;
    S.dishes[id]--;
    const st = Hero.stats(), hp = Hero.heal(st.maxHp * D.heal);
    if (D.buff) S.buffs.food = Object.assign({}, D.buff, { id, until: Date.now() + D.buff.min * 60000 });
    if (!inBattle) Game.toast(`吃了${D.name}：HP +${hp}${D.buff ? '，' + this.buffText(D.buff) : ''}`, 'good');
    Game.changed();
    return { hp, ap: D.ap || 0 };
  },
  buffText(b) { return Object.entries(b).filter(([k]) => BUFF_NAMES[k]).map(([k, v]) => `${BUFF_NAMES[k]}+${Math.round(v * 100)}%`).join(' ') + `（${b.min} 分钟）`; },
  activeBuff() { const b = Game.S.buffs.food; return b && b.until > Date.now() ? b : null; },
};

Inv.kind('dish', {
  have: id => Game.S.dishes[id] || 0,
  take: (id, n) => { Game.S.dishes[id] = (Game.S.dishes[id] || 0) - n; },
  give: (id, n) => { Game.S.dishes[id] = (Game.S.dishes[id] || 0) + n; },
  name: id => DISHES[id].name,
});

CF.module({
  id: 'kitchen',
  state: () => ({ kitchen: { slots: 1, queue: [], known: Object.keys(DISHES).filter(k => DISHES[k].known) }, dishes: {} }),
  init() {
    // 料理的 buff 给角色加成
    CF.hook('hero.buffs', () => Cook.activeBuff());
    // 战斗中可以吃料理（排在鱼前面）
    CF.hook('battle.foods', () => Object.entries(Game.S.dishes).filter(([, n]) => n > 0).map(([id, n]) => ({ kind: 'dish', id, n, name: DISHES[id].name, heal: DISHES[id].heal, ap: DISHES[id].ap || 0, eat: () => Cook.eat(id, true) })));
    CF.hook('battle.tags', () => { const fb = Cook.activeBuff(); return fb ? '🍽' + DISHES[fb.id].name : ''; });
    // 料理也能挂到寄卖行
    if (typeof Market !== 'undefined') {
      Market.kind('dish', { base: id => DISHES[id].price, name: id => DISHES[id].name, sellable: id => !!DISHES[id], have: id => Game.S.dishes[id] || 0, take: (id, n) => { Game.S.dishes[id] -= n; }, give: (id, n) => { Game.S.dishes[id] = (Game.S.dishes[id] || 0) + n; } });
      CF.hook('market.watch', () => Cook.K.known.map(id => ['dish', id, DISHES[id].name]));
    }
  },
  tick: () => Cook.tick(),
});
