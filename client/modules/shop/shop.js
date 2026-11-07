// ===== 杂货铺 =====
// 想卖新东西：在别的模块里 UI.tab('shop', { id, label, render }) 加一页即可。
'use strict';

CF.panel('shop', {
  title: '🛒 杂货铺',
  tabs: [['rod', '鱼竿'], ['line', '鱼线'], ['bait', '鱼饵'], ['item', '道具'], ['upgrade', '扩容']],
  render(p) {
    const S = Game.S;
    const buyBtn = (price, act, id, extra) => `<span class="price">🪙 ${fmtFull(price)}</span><button class="btn sm primary" data-act="${act}" data-id="${id}" ${extra || ''} ${S.coins < price ? 'disabled' : ''}>购买</button>`;
    let h = '<div class="shop-list">';
    if (p.tab === 'rod') {
      for (const r of RODS) {
        const owned = S.rods.includes(r.id);
        h += `<div class="scard"><div class="ic">${r.icon}</div><div class="bd"><div class="nm">${r.name}</div><div class="ds">${r.desc}</div>
          <div class="st">速度×${r.speed} · 控鱼${Math.round(r.control * 100)}% · 幸运+${Math.round(r.luck * 100)}% · 等级${r.tier}</div></div>
          <div class="act">${owned ? (S.rod === r.id ? '<span class="owned">装备中</span>' : `<span class="owned">已拥有</span><button class="btn sm" data-act="equiprod" data-id="${r.id}">装备</button>`) : buyBtn(r.price, 'buyrod', r.id)}</div></div>`;
      }
    } else if (p.tab === 'line') {
      for (const l of LINES) {
        const owned = S.lines.includes(l.id);
        h += `<div class="scard"><div class="ic">${l.icon}</div><div class="bd"><div class="nm">${l.name}</div><div class="ds">${l.desc}</div></div>
          <div class="act">${owned ? (S.line === l.id ? '<span class="owned">装备中</span>' : `<span class="owned">已拥有</span><button class="btn sm" data-act="equipline" data-id="${l.id}">装备</button>`) : buyBtn(l.price, 'buyline', l.id)}</div></div>`;
      }
    } else if (p.tab === 'bait') {
      for (const b of BAITS) {
        if (b.infinite) continue;
        h += `<div class="scard"><div class="ic">${b.icon}</div><div class="bd"><div class="nm">${b.name}</div><div class="ds">${b.desc}</div><div class="st">单价 🪙${b.price} · 持有 ${S.baits[b.id] || 0}</div></div>
          <div class="act"><div class="qty">${[10, 50, 200].map(q => `<button class="btn sm ${q === 10 ? 'primary' : ''}" data-act="buybait" data-id="${b.id}" data-q="${q}" ${S.coins < b.price * q ? 'disabled' : ''}>×${q}</button>`).join('')}</div>
          <span class="price">×10 = 🪙${fmtFull(b.price * 10)}</span></div></div>`;
      }
    } else if (p.tab === 'item') {
      for (const it of ITEMS) {
        if (it.price === undefined || it.noShop) continue;
        const owned = it.type === 'permanent' && S.perms[it.id];
        h += `<div class="scard"><div class="ic">${it.icon}</div><div class="bd"><div class="nm">${it.name}${it.type === 'permanent' ? ' <span class="rbadge r-rare">永久</span>' : ''}</div><div class="ds">${it.desc}</div>
          ${it.type === 'consumable' ? `<div class="st">持有 ${S.items[it.id] || 0}</div>` : ''}</div>
          <div class="act">${owned ? '<span class="owned">已拥有</span>' : buyBtn(it.price, 'buyitem', it.id)}</div></div>`;
      }
    } else if (p.tab === 'upgrade') {
      const u = UPGRADES.bag, cur = S.bagCap, maxed = cur >= u.max, cost = Inv.upgradeCost('bag');
      h += `<div class="scard"><div class="ic">${u.icon}</div><div class="bd"><div class="nm">${u.name}</div><div class="ds">容量 +${u.step}（当前 ${cur} / 上限 ${u.max}）</div></div>
        <div class="act">${maxed ? '<span class="owned">已满级</span>' : buyBtn(cost, 'upgrade', 'bag')}</div></div>
        <div class="hint" style="margin-top:12px">仓库扩建请找「工匠」。</div>`;
    }
    return [h + '</div>', `<span class="info">💰 持有 ${fmtFull(S.coins)} 金币</span>`];
  },
});
UI.nav({ id: 'shop', label: '商店', icon: 'shop', order: 30, key: 's' });
UI.actions({
  buyrod(ds) { if (Fishing.buyRod(ds.id)) Sound.coin(); },
  buyline(ds) { if (Fishing.buyLine(ds.id)) Sound.coin(); },
  buybait(ds) { if (Fishing.buyBait(ds.id, +ds.q)) Sound.coin(); },
  buyitem(ds) { if (Fishing.buyItem(ds.id, 1)) Sound.coin(); },
  upgrade(ds) { if (Inv.buyUpgrade(ds.id)) Sound.coin(); },
});
