// ===== 厨房：挂机烹饪，做出的料理可以吃（回血/加 buff）也可以拿去寄卖 =====
'use strict';

const Cook = {
  get K() { return Game.S.kitchen; },
  migrate(S) {
    S.kitchen = Object.assign({ slots: 1, queue: [], known: Object.keys(DISHES).filter(k => DISHES[k].known) }, S.kitchen || {});
    S.dishes = S.dishes || {};
  },
  needText(n) {
    if (n.bait) return `${findById(BAITS, n.bait).name}×${n.n}`;
    if (n.id) return `${FISH_BY_ID[n.id].name}×${n.n}`;
    return `${n.scene ? PLACES[n.scene].name + '的' : ''}${RARITY[n.rarity].name}鱼×${n.n}`;
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
    for (const pk of p.picks) Game._take(pk.from, [pk.uid]);
    for (const [b, n] of Object.entries(p.baits)) Game.S.baits[b] -= n;
    const now = Date.now();
    K.queue.push({ id, n: times, start: now, end: now + D.time * 1000 * times });
    Game.toast(`开始烹饪：${D.name} ×${times}`, 'good');
    Game.afterStorageChange(); Game.save();
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
    const st = Adv.stats(), hp = Adv.heal(st.maxHp * D.heal);
    if (D.buff) S.buffs.food = Object.assign({}, D.buff, { id, until: Date.now() + D.buff.min * 60000 });
    if (!inBattle) Game.toast(`吃了${D.name}：HP +${hp}${D.buff ? '，' + this.buffText(D.buff) : ''}`, 'good');
    Game.changed();
    return { hp, ap: D.ap || 0 };
  },
  buffText(b) { return Object.entries(b).filter(([k]) => BUFF_NAMES[k]).map(([k, v]) => `${BUFF_NAMES[k]}+${Math.round(v * 100)}%`).join(' ') + `（${b.min} 分钟）`; },
  activeBuff() { const b = Game.S.buffs.food; return b && b.until > Date.now() ? b : null; },
};
