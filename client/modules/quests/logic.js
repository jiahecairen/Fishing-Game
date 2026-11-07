// ===== 任务 · 逻辑：线索 → 步骤 → 图纸；委托 =====
// 线索从哪里来，全部写在这里（监听别的模块的事件），别的模块不需要知道任务的存在：
//   藏宝图寻宝到达终点 → 「老渔夫的日记」(q1)
//   第一次通关潮汐洞窟 → 「破损的潮汐石板」(q2)
//   第一次通关冰晶迷宫 / 流星事件 20% → 「坠落的星图」(q3)
'use strict';

const Quests = {
  get Q() { return Game.S.quests; },
  def(qid) { return QUESTS.find(q => q.id === qid); },
  step(qid) { const q = this.def(qid), i = this.Q.active[qid]; return i === undefined ? null : q.steps[i]; },
  giveClue(qid) {
    const Q = this.Q;
    if (Q.active[qid] !== undefined || Q.done[qid]) return false;
    Q.active[qid] = 0; Q.prog[qid] = 0;
    Story.run('clue_' + qid);
    Game.toast(`📜 获得任务线索：${this.def(qid).clue.name}`, 'good');
    Game.changed();
    return true;
  },
  advance(qid) {
    const Q = this.Q, q = this.def(qid), st = this.step(qid);
    if (!st) return;
    if (st.recipe) { Game.S.setRecipes[st.recipe] = true; Game.toast(`📐 获得套装图纸：${UNIQUES[st.recipe].name}（去找工匠打造）`, 'good'); }
    Story.run(st.story);
    Q.active[qid]++; Q.prog[qid] = 0;
    if (Q.active[qid] >= q.steps.length) { delete Q.active[qid]; Q.done[qid] = true; Game.toast(`✅ 任务线「${q.name}」完成！`, 'good'); }
    Game.changed(); Game.save();
  },
  act(qid) {
    const st = this.step(qid); if (!st) return;
    if (st.type === 'talk') return this.advance(qid);
    if (st.type === 'submit') {
      if (!Inv.canPay(st.need)) { Game.toast('东西还不够', 'warn'); return; }
      Inv.payNeed(st.need); this.advance(qid);
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
    if (!Inv.canPay(r.need)) { Game.toast('东西还不够', 'warn'); return; }
    Inv.payNeed(r.need);
    const w = r.reward, got = [];
    if (w.coins) { Game.addCoins(w.coins); got.push(`🪙${fmtFull(w.coins)}`); }
    if (w.cook && typeof Cook !== 'undefined') { Cook.learn(w.cook); got.push(`料理配方「${DISHES[w.cook].name}」`); }
    if (w.mats) for (const [m, n] of Object.entries(w.mats)) { Inv.give('mat', m, n); got.push(`${MATERIALS[m].name}×${n}`); }
    if (w.perm) { if (!S.perms[w.perm]) { S.perms[w.perm] = true; got.push(ITEM_BY_ID[w.perm].name); } else { Game.addCoins(3000); got.push('🪙3,000'); } }
    if (w.repair && typeof Voyage !== 'undefined') { S.boatHp = Voyage.maxHp(); got.push('船只修好了'); }
    if (w.kitchen && S.kitchen) { S.kitchen.slots = Math.min(3, S.kitchen.slots + 1); got.push('厨房 +1 口锅'); }
    S.reqDone[rid] = true;
    Game.emit('story', { id: '_req', cb: null, lines: [[r.npc, '谢谢你！这些是给你的回礼。'], ['narr', '* 获得：' + got.join('、')]] });
    Game.changed(); Game.save();
  },
  // 有可以交的委托/任务时，导航上显示红点
  anyReady() {
    for (const qid of Object.keys(this.Q.active)) { const st = this.step(qid); if (st && (st.type === 'talk' || (st.type === 'submit' && Inv.canPay(st.need)))) return true; }
    return REQUESTS.some(r => this.reqAvailable(r) && Inv.canPay(r.need));
  },
};

CF.module({
  id: 'quests',
  state: () => ({ quests: { active: {}, done: {}, prog: {} }, reqDone: {} }),
  init() {
    CF.on('fish:caught', d => Quests.onCatch(d.item));
    CF.on('dungeon:clear', d => {
      Quests.onClear(d.id);
      if (d.id === 'tide' && d.first) setTimeout(() => Quests.giveClue('q2'), 0);
      if (d.id === 'crystal' && d.first) setTimeout(() => Quests.giveClue('q3'), 0);
    });
    CF.on('voyage:arrive', v => { if (v.kind === 'hunt') Quests.giveClue('q1'); });
    CF.on('event:done', e => { if (e.id === 'meteor' && Math.random() < 0.2) Quests.giveClue('q3'); });
  },
});
