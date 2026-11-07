// ===== 寄卖行 · 界面：挂单、行情图、会员、成交记录 =====
'use strict';

UI.listMult = 1;
UI.mkWatch = null;
const multChips = () => `<div class="chips mult"><span>挂卖定价（相对今日行情）：</span>${[0.85, 0.95, 1, 1.05, 1.1, 1.2, 1.35].map(m => `<button class="chip ${UI.listMult === m ? 'on' : ''}" data-act="lmult" data-v="${m}">${Math.round(m * 100)}%</button>`).join('')}</div>`;
function sparkSVG(hist, w, h, band) {
  const ps = hist.map(x => x.p), mn = Math.min(...ps, band ? band[0] : Infinity), mx = Math.max(...ps, band ? band[1] : -Infinity), rg = Math.max(1, mx - mn);
  const X = i => Math.round(i / (ps.length - 1) * (w - 2)) + 1, Y = v => Math.round(h - 2 - (v - mn) / rg * (h - 4)) + 1;
  let d = ''; ps.forEach((v, i) => { d += (i ? `H${X(i)}V${Y(v)}` : `M${X(i)} ${Y(v)}`); });
  const up = ps[ps.length - 1] >= ps[ps.length - 2];
  const bandEl = band ? `<rect x="0" y="${Y(band[1])}" width="${w}" height="${Math.max(1, Y(band[0]) - Y(band[1]))}" fill="rgba(255,201,60,0.18)"/>` : '';
  return `<svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" shape-rendering="crispEdges">${bandEl}<path d="${d}" fill="none" stroke="${up ? '#3fd47a' : '#ff6b6b'}" stroke-width="2"/></svg>`;
}
CF.panel('market', {
  title: '📈 寄卖行',
  tabs: [['list', '📤 挂单'], ['chart', '📈 行情'], ['member', '💳 会员'], ['log', '🧾 成交记录']],
  render(p) {
  const S = Game.S, M = S.market, T = Market.tierDef();
  if (!M.open) return [`<div class="mk-open">${gi('market', '#ffc93c', '64px')}<div class="nm">码头寄卖行</div>
    <div class="ds">在这里挂单出售鱼和料理（传说鱼不收）。价格每天变动一次，波动很小，每个月只在一个小范围里浮动。<br>开通账户需要 🪙${MARKET_OPEN_FEE}。</div>
    <button class="btn primary big" data-act="mkopen" ${S.coins >= MARKET_OPEN_FEE ? '' : 'disabled'}>开通账户（🪙${MARKET_OPEN_FEE}）</button></div>`, ''];
  const head = `<div class="mk-head"><span class="tier" style="--tc:${T.color}">${T.name}会员</span><span>挂单 ${M.listings.length}/${T.slots}</span><span>手续费 ${Math.round(T.cut * 100)}%</span><span>本月销售额 🪙${fmtFull(M.monthSales)}</span><span>${Game.dateStr()}</span></div>`;
  if (p.tab === 'list') {
    const inv = [...S.bag.map(x => ['bag', x]), ...S.warehouse.map(x => ['wh', x]), ...S.hold.map(x => ['hold', x])].filter(([, x]) => Market.sellable('fish', x.id));
    let h = head;
    h += '<div class="section-title">我的挂单</div>';
    h += M.listings.length ? `<table class="mk-tbl"><tr><th>物品</th><th>挂单价</th><th>今日行情</th><th>每小时成交率</th><th></th></tr>${M.listings.map(L => {
      const mv = L.kind !== 'fish' ? Market.price(L.kind, L.id) : Market.marketValue('fish', L.item), r = L.price / mv - 1;
      const nm = L.kind !== 'fish' ? Market.itemName(L.kind, L.id) : `${FISH_BY_ID[L.id].name} ${L.item.size}cm`;
      return `<tr><td>${nm}${L.auto ? ' <small>(招财猫)</small>' : ''}</td><td>🪙${fmtFull(L.price)}</td><td>🪙${fmtFull(mv)} <small class="${r > 0 ? 'bad' : 'ok'}">${pct1(r)}</small></td><td>${Math.round(Market.saleProb(L, 1) * 100)}%</td><td><button class="btn sm" data-act="delist" data-id="${L.lid}">撤回</button></td></tr>`;
    }).join('')}</table>` : '<div class="empty small">还没有挂单。</div>';
    h += '<div class="section-title" style="margin-top:12px">挑选要挂卖的鱼（背包 / 本地仓库 / 船舱）</div>' + multChips();
    h += '<div class="hint">定价越低卖得越快：按 100% 挂出，平均 3 个游戏小时（约 3 分钟）就能卖掉；定到 120% 就要等很久。' + (T.batch ? '你可以一次批量挂单。' : '普通/铜卡会员一次只能挂一件（银卡起可批量定价）。') + '</div>';
    this._selPool = inv.map(([, x]) => x);
    h += Inv.grid(this._selPool);
    const si = this.selInfo(inv.map(([, x]) => x));
    return [h, `<span class="info">已选 ${si.n} 条 · 按今日行情约 🪙${fmtFull(inv.filter(([, x]) => UI.sel.has(x.uid)).reduce((s, [, x]) => s + Market.marketValue('fish', x) * UI.listMult, 0))}</span>
      <button class="btn sm" data-act="delistall" ${M.listings.length ? '' : 'disabled'}>全部撤回</button>
      <button class="btn sm primary" data-act="mklistany" ${si.n && (si.n === 1 || T.batch) ? '' : 'disabled'}>📤 挂出选中（${Math.round(UI.listMult * 100)}%）</button>`];
  }
  if (p.tab === 'chart') {
    const items = [...FISH.filter(f => S.dex[f.id] && Market.sellable('fish', f.id)).map(f => ['fish', f.id, f.name]), ...CF.call('market.watch').flat()];
    if (!UI.mkWatch || !items.some(i => i[0] + i[1] === UI.mkWatch)) UI.mkWatch = items[0] ? items[0][0] + items[0][1] : null;
    let h = head;
    if (!items.length) return [h + '<div class="empty">钓到鱼之后，这里会显示它们的行情。</div>', ''];
    const rows = items.map(([k, id, nm]) => {
      const t = Market.price(k, id), y = Market.price(k, id, Market.today() - 1), r = t / y - 1;
      return `<div class="tk ${UI.mkWatch === k + id ? 'on' : ''}" data-act="mkwatch" data-v="${k + id}"><span class="tn">${nm}</span><span class="tp">🪙${fmtFull(t)}</span><span class="${r >= 0 ? 'ok' : 'bad'}">${pct1(r)}</span>${T.chart ? sparkSVG(Market.history(k, id, 14), 56, 16) : ''}</div>`;
    }).join('');
    const [k, id, nm] = items.find(i => i[0] + i[1] === UI.mkWatch);
    let right;
    if (!T.chart) right = `<div class="mk-lock">${gi('lock', '#c9bda4', '40px')}<div>开通「铜卡」会员即可实时监控行情走势</div><div class="big-price">${nm} 今日 🪙${fmtFull(Market.price(k, id))}</div></div>`;
    else {
      const hist = Market.history(k, id, 30), band = T.band ? Market.monthRange(Market.key(k, id), Market.today()).map(v => Math.round(Market.base(k, id) * v)) : null;
      const ps = hist.map(x => x.p), mn = Math.min(...ps), mx = Math.max(...ps), base = Market.base(k, id);
      right = `<div class="mk-chart"><div class="mc-h"><b>${nm}</b><span>基准价 🪙${fmtFull(base)}</span><span>今日 🪙${fmtFull(ps[ps.length - 1])}</span><span>30 日 ${fmtFull(mn)} ~ ${fmtFull(mx)}</span></div>
        ${sparkSVG(hist, 420, 180, band)}<div class="mc-x"><span>30 天前</span><span>${band ? '金色区域 = 本月价格区间' : ''}</span><span>今天</span></div>
        <div class="fnote">每天更新一次价格；每月价格围绕一个中心价小幅波动，不会偏离基准价太远。看准高点再挂单！</div></div>`;
    }
    return [h + `<div class="mk-wrap"><div class="tklist">${rows}</div>${right}</div>`, ''];
  }
  if (p.tab === 'member') {
    const nextMonthIn = MONTH_DAYS - Game.date().dom + 1;
    let h = head + `<div class="hint">会员按月结算：每个月开始时，检查上个月销售额是否达到要求，并自动扣除会费；达不到就会降级。距离月结还有 ${nextMonthIn} 天。上月销售额 🪙${fmtFull(M.lastMonthSales)}。</div>`;
    h += `<table class="mk-tbl"><tr><th>等级</th><th>月销售额要求</th><th>月费</th><th>手续费</th><th>挂单上限</th><th>特权</th><th></th></tr>${MARKET_TIERS.map((t, i) => `<tr class="${i === M.tier ? 'cur' : ''}"><td style="color:${t.color}"><b>${t.name}</b></td><td>🪙${fmtFull(t.req)}</td><td>🪙${fmtFull(t.fee)}</td><td>${Math.round(t.cut * 100)}%</td><td>${t.slots}</td><td><small>${t.perks}</small></td>
      <td>${i === M.tier ? '<span class="owned">当前</span>' : i > M.tier ? `<button class="btn sm primary" data-act="mktier" data-v="${i}" ${Market.bestSales() >= t.req && S.coins >= t.fee ? '' : 'disabled'}>升级</button>` : ''}</td></tr>`).join('')}</table>`;
    return [h, ''];
  }
  const h = head + (M.log.length ? `<table class="mk-tbl"><tr><th>日期</th><th>物品</th><th>成交价</th><th>到手</th></tr>${M.log.map(l => { const t = Game.date(l.day * 1440); return `<tr><td>${t.month}月${t.dom}日</td><td>${l.name}</td><td>🪙${fmtFull(l.price)}</td><td>🪙${fmtFull(l.get)}</td></tr>`; }).join('')}</table>` : '<div class="empty">还没有成交记录。</div>');
  return [h, `<span class="info">累计销售额 🪙${fmtFull(M.total)}</span>`];
  },
});

UI.nav({ id: 'market', label: '寄卖', icon: 'market', order: 40, key: 't' });
UI.goal(20, S => !S.market.open ? ['📈 去寄卖行开通账户，把鱼挂出去卖', 'market'] : null);
UI.offline(10, r => r.market && r.market.n ? `<div style="margin-top:8px">📈 寄卖行成交 ${r.market.n} 件，到手 🪙${fmtFull(r.market.coins)}</div>` : '');
// 在背包 / 仓库里直接挂卖
CF.hook('inv.header', key => Game.S.market.open ? multChips() : key === 'bag' ? '<div class="hint">鱼不能直接卖了：去「寄卖」开通账户，把鱼挂出去卖。不要的鱼可以放生（获得少量经验）。</div>' : '');
CF.hook('inv.buttons', (key, si) => {
  const S = Game.S, mOpen = S.market.open, batch = Market.tierDef().batch, sel = si.n;
  return `<button class="btn sm primary" data-act="mklist" data-from="${key}" ${sel && mOpen && (sel === 1 || batch) ? '' : 'disabled'} title="${!mOpen ? '先在寄卖行开通账户' : !batch ? '批量挂单需要银卡会员' : ''}">📤 挂卖（${Math.round(UI.listMult * 100)}%）</button>`;
});

// 厨房的料理也能挂卖（厨房模块开着的时候）
CF.hook('kitchen.dishButtons', id => `<button class="btn sm" data-act="listdish" data-id="${id}" ${Game.S.market.open ? '' : 'disabled'}>挂卖</button>`);
CF.hook('kitchen.recipeInfo', id => Market.kinds.dish ? ` · 行情 🪙${fmtFull(Market.price('dish', id))}` : '');
CF.hook('fish.overflowDesc', () => '背包和仓库都满时，招财猫把普通鱼和杂物挂到寄卖行（没开户就放生）');

UI.actions({
  listdish(ds) { Market.listCount('dish', ds.id, Market.tierDef().batch ? Game.S.dishes[ds.id] : 1, UI.listMult); },
  lmult(ds) { this.listMult = +ds.v; this.render(true); },
  mklist(ds) { Market.listFish([...this.sel].map(uid => ({ from: ds.from, uid })), this.listMult); this.sel.clear(); },
  mklistany() {
    const S = Game.S;
    const picks = [...this.sel].map(uid => ({ from: S.bag.some(x => x.uid === uid) ? 'bag' : S.warehouse.some(x => x.uid === uid) ? 'wh' : 'hold', uid }));
    Market.listFish(picks, this.listMult); this.sel.clear();
  },
  mkopen() { Market.openAccount(); },
  mktier(ds) { Market.buyTier(+ds.v); },
  mkwatch(ds) { this.mkWatch = ds.v; this.render(true); },
  delist(ds) { Market.delist(+ds.id); },
  delistall() { Market.delistAll(); },
});

CF.module({
  id: 'market',
  init() { Game.on('marketSale', d => { UI.toast(`📈 寄卖成交：${d.name} 到手 🪙${fmtFull(d.get)}`, 'good'); Sound.coin(); }); },
});
