// ===== 厨房 · 界面：灶台、菜谱、背包里的「料理」页 =====
// 钩子：CF.hook('kitchen.dishButtons', id => html) 料理后面多几个按钮（卖掉、挂卖……）
//       CF.hook('kitchen.recipeInfo', id => html)  菜谱名字后面多一点信息（售价、行情……）
'use strict';

function dishList() {
  const S = Game.S, ids = Object.keys(S.dishes).filter(k => S.dishes[k] > 0);
  const fb = Cook.activeBuff();
  let h = fb ? `<div class="hint">🍽️ 正在生效：${DISHES[fb.id].name} · ${Cook.buffText(fb)} · 剩余 ${dur(fb.until - Date.now())}</div>` : '';
  h += ids.length ? '<div class="shop-list">' + ids.map(id => { const D = DISHES[id]; return `<div class="scard"><span class="gframe">${gi(D.gi, '#ffb74d', '34px')}</span><div class="bd"><div class="nm">${D.name} ×${S.dishes[id]}</div><div class="ds">${D.desc}</div><div class="st">回复 ${Math.round(D.heal * 100)}% 生命${D.ap ? ` · 战斗中行动点 +${D.ap}` : ''}${D.buff ? ' · ' + Cook.buffText(D.buff) : ''}</div></div>
    <div class="act"><button class="btn sm green" data-act="eatdish" data-id="${id}">吃</button>${CF.call('kitchen.dishButtons', id).join('')}</div></div>`; }).join('') + '</div>' : '<div class="empty">还没有料理。去「厨房」做一些吧！战斗中会优先自动吃料理。</div>';
  return [h, ''];
}

CF.panel('kitchen', {
  title: '🍳 厨房', live: 1,
  tabs: [['cook', '🍳 灶台'], ['dishes', '🍱 料理']],
  render(p) {
    const S = Game.S, K = Cook.K;
    if (p.tab === 'dishes') return dishList();
    let h = '<div class="section-title">灶台</div><div class="stoves">';
    for (let i = 0; i < 3; i++) {
      const q = K.queue[i];
      if (i >= K.slots) { h += `<div class="stove lock">${gi('lock', '#c9bda4', '28px')}<small>找工匠加一口锅</small></div>`; continue; }
      if (!q) { h += `<div class="stove idle">${gi('kitchen', '#8a7a63', '36px')}<small>空闲</small></div>`; continue; }
      const D = DISHES[q.id], k = clamp((Date.now() - q.start) / (q.end - q.start), 0, 1);
      h += `<div class="stove busy">${gi(D.gi, '#ffb74d', '36px')}<b>${D.name} ×${q.n}</b><div class="pbar"><div style="width:${(k * 100).toFixed(1)}%"></div></div><small>剩余 ${dur(q.end - Date.now())}</small><button class="btn sm red" data-act="cookcancel" data-v="${i}">倒掉</button></div>`;
    }
    h += '</div><div class="hint">烹饪是挂机进行的，关掉游戏也会继续。食材从背包和本地仓库里自动挑最便宜的。</div><div class="section-title">菜谱</div><div class="shop-list">';
    for (const [id, D] of Object.entries(DISHES)) {
      const known = K.known.includes(id);
      if (!known) { h += `<div class="scard dim"><span class="gframe">${gi(D.gi, '#bbb', '34px')}</span><div class="bd"><div class="nm">？？？</div><div class="ds">通过委托或事件学会</div></div></div>`; continue; }
      const pl = Cook.plan(id, 1);
      h += `<div class="scard"><span class="gframe">${gi(D.gi, '#ffb74d', '34px')}</span><div class="bd"><div class="nm">${D.name} <small>⏱️${dur(D.time * 1000)}${CF.call('kitchen.recipeInfo', id).join('')}</small></div>
        <div class="ds">${D.need.map(n => Cook.needText(n)).join(' + ')}</div><div class="st">回复 ${Math.round(D.heal * 100)}%${D.ap ? ` · 行动点 +${D.ap}` : ''}${D.buff ? ' · ' + Cook.buffText(D.buff) : ''}</div>${pl.ok ? '' : `<div class="bad small">缺：${pl.missing.join('、')}</div>`}</div>
        <div class="act qty"><button class="btn sm primary" data-act="cook" data-id="${id}" data-n="1" ${pl.ok && K.queue.length < K.slots ? '' : 'disabled'}>烹饪</button><button class="btn sm" data-act="cook" data-id="${id}" data-n="5" ${Cook.plan(id, 5).ok && K.queue.length < K.slots ? '' : 'disabled'}>×5</button></div></div>`;
    }
    return [h + '</div>', `<span class="info">灶台 ${K.queue.length}/${K.slots}</span>`];
  },
});
UI.tab('bag', { id: 'dish', label: '🍱 料理', after: 'fish', render: dishList });
UI.nav({ id: 'kitchen', label: '厨房', icon: 'kitchen', order: 50, key: 'k' });
const KITCHEN_POT_COST = [0, 3000, 15000];
CF.hook('artisan.build', () => {
  const S = Game.S, K = Cook.K, kcost = KITCHEN_POT_COST[K.slots] || 0;
  return `<div class="scard"><span class="gframe">${gi('kitchen', '#ffb74d', '34px')}</span><div class="bd"><div class="nm">厨房加一口锅</div><div class="ds">可以同时烹饪更多料理（当前 ${K.slots}/3）</div></div>
    <div class="act">${K.slots >= 3 ? '<span class="owned">已满级</span>' : `<span class="price">🪙 ${fmtFull(kcost)}</span><button class="btn sm primary" data-act="upkitchen" ${S.coins >= kcost ? '' : 'disabled'}>建造</button>`}</div></div>`;
});
UI.actions({
  cook(ds) { Cook.cook(ds.id, +ds.n); },
  cookcancel(ds) { Cook.cancel(+ds.v); },
  eatdish(ds) { Cook.eat(ds.id); },
  upkitchen() { const K = Cook.K, c = KITCHEN_POT_COST[K.slots]; if (K.slots < 3 && Game.pay(c)) { K.slots++; Game.toast('厨房多了一口锅！', 'good'); Game.changed(); } },
});
