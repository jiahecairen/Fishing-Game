// ===== 物品栏 · 界面：背包、仓库/船舱 =====
// 别的模块可以往这里加东西：
//   UI.tab('bag', {...})                       加一页（料理、装备……）
//   CF.hook('inv.card', item => html)          鱼卡片上多显示一行（例如能回多少血）
//   CF.hook('inv.header', key => html)         鱼列表上方（例如寄卖行的定价）
//   CF.hook('inv.buttons', (key, sel) => html) 底部多几个按钮（卖出、吃掉、挂卖……）
'use strict';

Inv.grid = function (list) {
  if (!list.length) return '<div class="empty">空空如也～</div>';
  const sorted = list.slice().sort((a, b) => b.value - a.value);
  return '<div class="grid">' + sorted.map(it => {
    const f = FISH_BY_ID[it.id];
    return `<div class="fcard ${UI.sel.has(it.uid) ? 'sel' : ''}" data-act="sel" data-uid="${it.uid}">
      ${it.star ? '<span class="star">★</span>' : ''}
      <img src="${fishIcon(f.id)}"><div class="nm">${f.name}</div>
      <div class="meta">${rbadge(f.rarity)} ${it.size}cm</div><div class="val">🪙 ${fmtFull(it.value)}</div>${CF.call('inv.card', it).join('')}</div>`;
  }).join('') + '</div>';
};
Inv.foot = function (key, list) {
  const S = Game.S, si = UI.selInfo(list), sel = si.n;
  const moveBtns = { bag: [['wh', '移入仓库'], ['hold', '装上船']], wh: [['bag', '取回背包'], ['hold', '装上船']], hold: [['wh', '卸到仓库'], ['bag', '拿到背包']] }[key];
  const hasBoat = !!Inv.storeCap('hold');
  return `<span class="info">${Inv.storeName(key)} ${list.length}/${Inv.storeCap(key)}${sel ? ` · 已选 ${sel} 条` : ''}</span>
    <button class="btn sm" data-act="selall" data-from="${key}">${sel === list.length && sel ? '取消全选' : '全选'}</button>
    ${moveBtns.map(([to, n]) => `<button class="btn sm" data-act="mv" data-from="${key}" data-to="${to}" ${sel && (to !== 'hold' || hasBoat) ? '' : 'disabled'}>${n}</button>`).join('')}
    ${CF.call('inv.buttons', key, si).join('')}
    <button class="btn sm" data-act="release" data-from="${key}" ${sel ? '' : 'disabled'}>🐟 放生</button>
    <button class="btn sm" data-act="releasecheap" data-from="${key}" ${list.length ? '' : 'disabled'}>放生杂物和普通鱼</button>`;
};
const gearCard = (g, stat, on, act) => `<div class="scard"><div class="ic">${g.icon}</div><div class="bd"><div class="nm">${g.name}</div><div class="ds">${g.desc}</div><div class="st">${stat}</div></div>
  <div class="act">${on ? '<span class="owned">装备中</span>' : `<button class="btn sm primary" data-act="${act}" data-id="${g.id}">装备</button>`}</div></div>`;

CF.panel('bag', {
  title: '🎒 背包',
  tabs: [['fish', '🐟 鱼获'], ['items', '🎁 物品栏'], ['mats', '🧱 素材'], ['gear', '🎣 鱼具']],
  render(p) {
    const S = Game.S;
    if (p.tab === 'fish') {
      const hint = !Fishing.canStore() ? '<div class="hint">背包满了，小猫会停下来休息。可以卖掉、放生、移入仓库，或者扩容。</div>' : '';
      return [hint + CF.call('inv.header', 'bag').join('') + Inv.grid(S.bag), Inv.foot('bag', S.bag)];
    }
    if (p.tab === 'items') {
      let h = '<div class="section-title">鱼饵</div><div class="shop-list">';
      for (const b of BAITS) {
        const c = Fishing.baitCount(b.id);
        if (!b.infinite && c <= 0) continue;
        const on = S.bait === b.id;
        h += `<div class="scard"><div class="ic">${b.icon}</div><div class="bd"><div class="nm">${b.name}</div><div class="ds">${b.desc}</div><div class="st">数量：${b.infinite ? '∞' : c}</div></div>
          <div class="act">${on ? '<span class="owned">使用中</span>' : `<button class="btn sm primary" data-act="equipbait" data-id="${b.id}">使用</button>`}</div></div>`;
      }
      h += '</div><div class="section-title" style="margin-top:16px">道具</div><div class="shop-list">';
      let any = false;
      for (const it of ITEMS) {
        if (it.type === 'consumable' && S.items[it.id] > 0) {
          any = true;
          h += `<div class="scard"><div class="ic">${it.icon}</div><div class="bd"><div class="nm">${it.name} ×${S.items[it.id]}</div><div class="ds">${it.desc}</div></div>
            <div class="act">${it.id === 'luckbell' ? `<div class="qty"><button class="btn sm green" data-act="usen" data-id="${it.id}" data-n="1">使用</button><button class="btn sm" data-act="usen" data-id="${it.id}" data-n="5" ${S.items[it.id] >= 5 ? '' : 'disabled'}>×5</button><button class="btn sm" data-act="usen" data-id="${it.id}" data-n="999">全部</button></div>` : `<button class="btn sm green" data-act="use" data-id="${it.id}">使用</button>`}</div></div>`;
        }
        if (it.type === 'permanent' && S.perms[it.id]) {
          any = true;
          h += `<div class="scard"><div class="ic">${it.icon}</div><div class="bd"><div class="nm">${it.name}</div><div class="ds">${it.desc}</div></div><div class="act"><span class="owned">永久生效</span></div></div>`;
        }
      }
      if (!any) h += '<div class="muted" style="color:var(--ink-muted)">还没有道具，去商店看看吧～</div>';
      return [h + '</div>', ''];
    }
    if (p.tab === 'mats') {
      const list = Object.entries(MATERIALS);
      const h = list.length ? '<div class="shop-list">' + list.map(([k, m]) => `<div class="scard"><span class="gframe">${gi(m.gi, m.color, '34px')}</span><div class="bd"><div class="nm">${m.name} ×${S.mats[k] || 0}</div><div class="ds">${m.desc}</div><div class="st">来源：${m.src}</div></div></div>`).join('') + '</div>' : '<div class="empty">没有素材。</div>';
      return [`<div class="hint">素材用于打造套装（找「工匠」）和完成委托。</div>${h}`, ''];
    }
    // 鱼具
    const rod = Fishing.rod();
    let h = `<div class="hint">当前：${rod.icon}${rod.name} + ${Fishing.line().icon}${Fishing.line().name} ｜ 上钩速度 ×${rod.speed} · 控鱼 ${Math.round(Fishing.control() * 100)}% · 幸运 +${Math.round(Fishing.luck() * 100)}% · 可钓等级 ${rod.tier}</div>`;
    h += '<div class="section-title">鱼竿</div><div class="shop-list">';
    for (const r of RODS) if (S.rods.includes(r.id)) h += gearCard(r, `速度×${r.speed} · 控鱼${Math.round(r.control * 100)}% · 幸运+${Math.round(r.luck * 100)}% · 等级${r.tier}`, S.rod === r.id, 'equiprod');
    h += '</div><div class="section-title" style="margin-top:16px">鱼线</div><div class="shop-list">';
    for (const l of LINES) if (S.lines.includes(l.id)) h += gearCard(l, l.desc, S.line === l.id, 'equipline');
    return [h + '</div>', ''];
  },
});

CF.panel('wh', {
  title: '🏠 仓库',
  tabs: () => [['wh', `🏠 ${Game.scene().name}仓库`], ['hold', '⛵ 船舱']],
  render(p) {
    const S = Game.S, key = p.tab === 'hold' ? 'hold' : 'wh', list = Inv.store(key);
    let hint;
    if (key === 'hold') hint = Inv.storeCap('hold') ? `<div class="hint">⛵ 船舱 ${list.length}/${Inv.storeCap('hold')}：船舱里的东西会跟着你去任何地方。每个地点的仓库是分开的，想把鱼运到别处，就要装上船。可以在船坞「扩建船舱」。</div>` : '<div class="hint">还没有船。</div>';
    else hint = `<div class="hint">🏠 这是「${Game.scene().name}」的仓库（每个地点各有一个）。${S.perms.autostore ? '自动收纳盒生效中：背包满时鱼会送到这里。' : ''}想扩建，去找「工匠」。</div>`;
    return [hint + CF.call('inv.header', key).join('') + Inv.grid(list), Inv.foot(key, list)];
  },
});

UI.nav({ id: 'bag', label: '背包', icon: 'bag', order: 10, key: 'b', count: S => `${S.bag.length}/${S.bagCap}`, full: S => S.bag.length >= S.bagCap });
UI.nav({ id: 'wh', label: '仓库', icon: 'warehouse', order: 20, key: 'w', count: S => `${S.warehouse.length}/${S.whCap}`, full: S => S.warehouse.length >= S.whCap });
UI.loot('mat', l => { const m = MATERIALS[l.id]; return `<div class="loot"><span class="li">${gi(m.gi, m.color, '28px')}</span><b>${m.name} ×${l.n}</b></div>`; });

UI.actions({
  sel(ds) { const uid = +ds.uid; this.sel.has(uid) ? this.sel.delete(uid) : this.sel.add(uid); this.render(true); },
  selall(ds) {
    const list = ds.from === 'any' ? (this._selPool || []) : Inv.store(ds.from);
    if (this.sel.size === list.length) this.sel.clear(); else list.forEach(x => this.sel.add(x.uid));
    this.render(true);
  },
  mv(ds) { Inv.move(ds.from, [...this.sel], ds.to); this.sel.clear(); },
  release(ds) { Inv.release(ds.from, [...this.sel]); this.sel.clear(); },
  releasecheap(ds) { Inv.releaseWhere(ds.from, f => f.rarity === 'junk' || f.rarity === 'common'); this.sel.clear(); },
  equipbait(ds) { Fishing.equipBait(ds.id); },
  equiprod(ds) { Fishing.equipRod(ds.id); },
  equipline(ds) { Fishing.equipLine(ds.id); },
  use(ds) { Fishing.useItem(ds.id); },
  usen(ds) {
    const S = Game.S; let k = 0; const n = Math.min(+ds.n, S.items[ds.id] || 0);
    while (k < n && Fishing.useItem(ds.id, k < n - 1)) k++;
    if (k > 1) Game.toast(`连续使用了 ${k} 个${ITEM_BY_ID[ds.id].name}`, 'good');
  },
});

CF.module({
  id: 'inventory',
  init() { Game.on('released', d => UI.toast(`放生了 ${d.count} 条鱼，经验 +${d.exp}`, 'good')); },
});

// 「需要」清单的显示：绿色够了，红色不够
Inv.needHTML = need => need.map(([k, id, n]) => { const h = Inv.have(k, id); return `<span class="${h >= n ? 'ok' : 'bad'}">${Inv.needName(k, id)} ${k === 'coins' ? fmtFull(Math.min(h, n)) + '/' + fmtFull(n) : `${Math.min(h, n)}/${n}`}</span>`; }).join(' · ');
