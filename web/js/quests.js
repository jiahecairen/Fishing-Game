// ===== 任务：套装任务线（线索 → 步骤 → 图纸）与委托 =====
'use strict';

const Quests = {
  get Q() { return Game.S.quests; },
  migrate(S) {
    S.quests = Object.assign({ active: {}, done: {}, prog: {} }, S.quests || {});
    S.reqDone = S.reqDone || {};
    S.setRecipes = S.setRecipes || {};
    S.mats = S.mats || {};
  },
  def(qid) { return QUESTS.find(q => q.id === qid); },
  step(qid) { const q = this.def(qid), i = this.Q.active[qid]; return i === undefined ? null : q.steps[i]; },
  giveClue(qid) {
    const Q = this.Q;
    if (Q.active[qid] !== undefined || Q.done[qid]) return false;
    Q.active[qid] = 0; Q.prog[qid] = 0;
    Adv.story('clue_' + qid);
    Game.toast(`📜 获得任务线索：${this.def(qid).clue.name}`, 'good');
    Game.changed();
    return true;
  },

  // ---------- 物品检查 ----------
  have(k, id) {
    const S = Game.S;
    switch (k) {
      case 'fish': return [...S.bag, ...S.warehouse].filter(x => x.id === id).length;
      case 'item': return S.items[id] || 0;
      case 'bait': return S.baits[id] || 0;
      case 'mat': return S.mats[id] || 0;
      case 'treasure': return S.treasure[id] || 0;
      case 'dish': return S.dishes[id] || 0;
      case 'coins': return S.coins;
    }
    return 0;
  },
  needName(k, id) {
    switch (k) {
      case 'fish': return FISH_BY_ID[id].name;
      case 'item': return ITEM_BY_ID[id].name;
      case 'bait': return findById(BAITS, id).name;
      case 'mat': return MATERIALS[id].name;
      case 'treasure': return FISH_BY_ID[id].name;
      case 'dish': return DISHES[id].name;
      case 'coins': return '金币';
    }
  },
  canSubmit(need) { return need.every(([k, id, n]) => this.have(k, id) >= n); },
  take(need) {
    const S = Game.S;
    for (const [k, id, n] of need) {
      if (k === 'fish') {
        let left = n;
        for (const arr of [S.warehouse, S.bag]) for (let i = arr.length - 1; i >= 0 && left > 0; i--) if (arr[i].id === id) { arr.splice(i, 1); left--; }
      } else if (k === 'coins') S.coins -= n;
      else { const box = { item: S.items, bait: S.baits, mat: S.mats, treasure: S.treasure, dish: S.dishes }[k]; box[id] -= n; }
    }
    Game.afterStorageChange();
  },

  // ---------- 任务线推进 ----------
  advance(qid) {
    const Q = this.Q, q = this.def(qid), st = this.step(qid);
    if (!st) return;
    if (st.recipe) { Game.S.setRecipes[st.recipe] = true; Game.toast(`📐 获得套装图纸：${UNIQUES[st.recipe].name}（去找工匠打造）`, 'good'); }
    Adv.story(st.story);
    Q.active[qid]++; Q.prog[qid] = 0;
    if (Q.active[qid] >= q.steps.length) { delete Q.active[qid]; Q.done[qid] = true; Game.toast(`✅ 任务线「${q.name}」完成！`, 'good'); }
    Game.changed(); Game.save();
  },
  act(qid) {
    const st = this.step(qid); if (!st) return;
    if (st.type === 'talk') return this.advance(qid);
    if (st.type === 'submit') {
      if (!this.canSubmit(st.need)) { Game.toast('东西还不够', 'warn'); return; }
      this.take(st.need); this.advance(qid);
    }
  },
  onCatch(item) {
    const S = Game.S;
    for (const qid of Object.keys(this.Q.active)) {
      const st = this.step(qid);
      if (!st || st.type !== 'catch' || st.fish !== item.id) continue;
      if (st.weather && S.weather !== st.weather) continue;
      this.Q.prog[qid] = (this.Q.prog[qid] || 0) + 1;
      if (this.Q.prog[qid] >= st.n) this.advance(qid);
      else Game.toast(`📜 任务进度：${st.text} ${this.Q.prog[qid]}/${st.n}`);
    }
  },
  onClear(did) {
    for (const qid of Object.keys(this.Q.active)) { const st = this.step(qid); if (st && st.type === 'clear' && st.dungeon === did) this.advance(qid); }
  },

  // ---------- 委托 ----------
  reqAvailable(r) { return !Game.S.reqDone[r.id] && (!r.cond || r.cond(Game.S)); },
  submitReq(rid) {
    const r = REQUESTS.find(x => x.id === rid), S = Game.S;
    if (!r || !this.reqAvailable(r)) return;
    if (!this.canSubmit(r.need)) { Game.toast('东西还不够', 'warn'); return; }
    this.take(r.need);
    const w = r.reward, got = [];
    if (w.coins) { Game.addCoins(w.coins); got.push(`🪙${fmtFull(w.coins)}`); }
    if (w.cook) { Cook.learn(w.cook); got.push(`料理配方「${DISHES[w.cook].name}」`); }
    if (w.mats) for (const [m, n] of Object.entries(w.mats)) { S.mats[m] = (S.mats[m] || 0) + n; got.push(`${MATERIALS[m].name}×${n}`); }
    if (w.perm) { if (!S.perms[w.perm]) { S.perms[w.perm] = true; got.push(ITEM_BY_ID[w.perm].name); } else { Game.addCoins(3000); got.push('🪙3,000'); } }
    if (w.repair) { S.boatHp = Adv.maxBoatHp(); got.push('船只修好了'); }
    if (w.kitchen) { S.kitchen.slots = Math.min(3, S.kitchen.slots + 1); got.push('厨房 +1 口锅'); }
    S.reqDone[rid] = true;
    Game.emit('story', { id: '_req', cb: null, lines: [[r.npc, '谢谢你！这些是给你的回礼。'], ['narr', '* 获得：' + got.join('、')]] });
    Game.changed(); Game.save();
  },
  // 有可以交的委托/任务时，导航上显示红点
  anyReady() {
    for (const qid of Object.keys(this.Q.active)) { const st = this.step(qid); if (st && (st.type === 'talk' || (st.type === 'submit' && this.canSubmit(st.need)))) return true; }
    return REQUESTS.some(r => this.reqAvailable(r) && this.canSubmit(r.need));
  },
};
