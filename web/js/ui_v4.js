// ===== v0.4 界面：仓库/船舱、放生、寄卖行（行情图）、厨房、任务、工匠、战斗模式、像素战斗界面 =====
'use strict';

UI.listMult = 1;
UI.openBmode = function (title, go) { this.panel = { name: 'bmode', data: { title, go } }; this.sel.clear(); $('#modal-bg').classList.remove('hidden'); this.render(); };
UI.mkTab = 'list';
UI.mkWatch = null;
Object.assign(UI.titles = UI.titles || {}, {
  market: '📈 寄卖行', kitchen: '🍳 厨房', quest: '📜 任务', artisan: '🔨 工匠铺', bmode: '⚔️ 选择战斗方式',
});
const _tabsFor = UI.tabsFor.bind(UI);
UI.tabsFor = function (name) {
  switch (name) {
    case 'bag': return [['fish', '🐟 鱼获'], ['dish', '🍱 料理'], ['items', '🎁 物品栏'], ['mats', '🧱 素材'], ['gear', '🎣 鱼具']];
    case 'wh': return [['wh', `🏠 ${PLACES[Game.S.scene].name}仓库`], ['hold', '⛵ 船舱']];
    case 'adv': return [['hero', '🐱 角色'], ['talent', '🌟 天赋'], ['gear', '⚔️ 装备'], ['treasure', '💰 宝藏']];
    case 'market': return [['list', '📤 挂单'], ['chart', '📈 行情'], ['member', '💳 会员'], ['log', '🧾 成交记录']];
    case 'kitchen': return [['cook', '🍳 灶台'], ['dishes', '🍱 料理']];
    case 'quest': return [['line', '📜 任务线'], ['req', '📮 委托']];
    case 'artisan': return [['forge', '🔨 锻造'], ['set', '✨ 套装'], ['build', '🏗️ 扩建']];
    case 'shop': return [['rod', '鱼竿'], ['line', '鱼线'], ['bait', '鱼饵'], ['item', '道具'], ['upgrade', '扩容']];
  }
  return _tabsFor(name);
};

// ---------- 鱼的选择网格（通用） ----------
const fishFoot = (key, list) => {
  const S = Game.S, si = UI.selInfo(list), sel = si.n;
  const mOpen = S.market.open, batch = Market.tierDef().batch;
  const moveBtns = { bag: [['wh', '移入仓库'], ['hold', '装上船']], wh: [['bag', '取回背包'], ['hold', '装上船']], hold: [['wh', '卸到仓库'], ['bag', '拿到背包']] }[key];
  return `<span class="info">${Game.storeName(key)} ${list.length}/${Game.storeCap(key)}${sel ? ` · 已选 ${sel} 条` : ''}</span>
    <button class="btn sm" data-act="selall" data-from="${key}">${sel === list.length && sel ? '取消全选' : '全选'}</button>
    ${moveBtns.map(([to, n]) => `<button class="btn sm" data-act="mv" data-from="${key}" data-to="${to}" ${sel && (to !== 'hold' || S.boat) ? '' : 'disabled'}>${n}</button>`).join('')}
    ${key === 'bag' ? `<button class="btn sm red" data-act="eat" ${sel ? '' : 'disabled'}>🍽️ 吃掉</button>` : ''}
    <button class="btn sm primary" data-act="mklist" data-from="${key}" ${sel && mOpen && (sel === 1 || batch) ? '' : 'disabled'} title="${!mOpen ? '先在寄卖行开通账户' : !batch ? '批量挂单需要银卡会员' : ''}">📤 挂卖（${Math.round(UI.listMult * 100)}%）</button>
    <button class="btn sm" data-act="release" data-from="${key}" ${sel ? '' : 'disabled'}>🐟 放生</button>
    <button class="btn sm" data-act="releasecheap" data-from="${key}" ${list.length ? '' : 'disabled'}>放生杂物和普通鱼</button>`;
};
const multChips = () => `<div class="chips mult"><span>挂卖定价（相对今日行情）：</span>${[0.85, 0.95, 1, 1.05, 1.1, 1.2, 1.35].map(m => `<button class="chip ${UI.listMult === m ? 'on' : ''}" data-act="lmult" data-v="${m}">${Math.round(m * 100)}%</button>`).join('')}</div>`;

const _p_bag = UI.p_bag;
UI.p_bag = function (p) {
  const S = Game.S;
  if (p.tab === 'fish') {
    const hint = !Game.canStore() ? '<div class="hint">背包满了，小猫会停下来休息。可以放生、移入仓库、挂到寄卖行，或者扩容。</div>' : '';
    return [hint + (S.market.open ? multChips() : '<div class="hint">鱼不能直接卖了：去「寄卖」开通账户，把鱼挂出去卖。不要的鱼可以放生（获得少量经验）。</div>') + this.fishGrid(S.bag), fishFoot('bag', S.bag)];
  }
  if (p.tab === 'dish') {
    const ids = Object.keys(S.dishes).filter(k => S.dishes[k] > 0);
    const fb = Cook.activeBuff();
    let h = fb ? `<div class="hint">🍽️ 正在生效：${DISHES[fb.id].name} · ${Cook.buffText(fb)} · 剩余 ${dur(fb.until - Date.now())}</div>` : '';
    h += ids.length ? '<div class="shop-list">' + ids.map(id => { const D = DISHES[id]; return `<div class="scard"><span class="gframe">${gi(D.gi, '#ffb74d', '34px')}</span><div class="bd"><div class="nm">${D.name} ×${S.dishes[id]}</div><div class="ds">${D.desc}</div><div class="st">回复 ${Math.round(D.heal * 100)}% 生命${D.ap ? ` · 战斗中行动点 +${D.ap}` : ''}${D.buff ? ' · ' + Cook.buffText(D.buff) : ''}</div></div>
      <div class="act"><button class="btn sm green" data-act="eatdish" data-id="${id}">吃</button><button class="btn sm" data-act="listdish" data-id="${id}" ${S.market.open ? '' : 'disabled'}>挂卖</button></div></div>`; }).join('') + '</div>' : '<div class="empty">还没有料理。去「厨房」做一些吧！战斗中会优先自动吃料理。</div>';
    return [h, ''];
  }
  if (p.tab === 'mats') {
    const h = '<div class="shop-list">' + Object.entries(MATERIALS).map(([k, m]) => `<div class="scard"><span class="gframe">${gi(m.gi, m.color, '34px')}</span><div class="bd"><div class="nm">${m.name} ×${S.mats[k] || 0}</div><div class="ds">${m.desc}</div><div class="st">来源：${m.src}</div></div></div>`).join('') + '</div>';
    return [`<div class="hint">素材用于打造套装（找「工匠」）和完成委托。</div>${h}`, ''];
  }
  return _p_bag.call(this, p);
};
UI.p_wh = function (p) {
  const S = Game.S, key = p.tab === 'hold' ? 'hold' : 'wh', list = Game.store(key);
  let hint;
  if (key === 'hold') hint = S.boat ? `<div class="hint">⛵ 船舱 ${list.length}/${Adv.holdCap()}：船舱里的东西会跟着你去任何地方。每个地点的仓库是分开的，想把鱼运到别处，就要装上船。可以在船坞「扩建船舱」。</div>` : '<div class="hint">还没有船。</div>';
  else hint = `<div class="hint">🏠 这是「${PLACES[S.scene].name}」的仓库（每个地点各有一个）。${S.perms.autostore ? '自动收纳盒生效中：背包满时鱼会送到这里。' : ''}想扩建，去找「工匠」。</div>`;
  return [hint + (S.market.open ? multChips() : '') + this.fishGrid(list), fishFoot(key, list)];
};

// ---------- 寄卖行 ----------
const pct1 = v => (v >= 0 ? '+' : '') + (v * 100).toFixed(1) + '%';
function sparkSVG(hist, w, h, band) {
  const ps = hist.map(x => x.p), mn = Math.min(...ps, band ? band[0] : Infinity), mx = Math.max(...ps, band ? band[1] : -Infinity), rg = Math.max(1, mx - mn);
  const X = i => Math.round(i / (ps.length - 1) * (w - 2)) + 1, Y = v => Math.round(h - 2 - (v - mn) / rg * (h - 4)) + 1;
  let d = ''; ps.forEach((v, i) => { d += (i ? `H${X(i)}V${Y(v)}` : `M${X(i)} ${Y(v)}`); });
  const up = ps[ps.length - 1] >= ps[ps.length - 2];
  const bandEl = band ? `<rect x="0" y="${Y(band[1])}" width="${w}" height="${Math.max(1, Y(band[0]) - Y(band[1]))}" fill="rgba(255,201,60,0.18)"/>` : '';
  return `<svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" shape-rendering="crispEdges">${bandEl}<path d="${d}" fill="none" stroke="${up ? '#3fd47a' : '#ff6b6b'}" stroke-width="2"/></svg>`;
}
UI.p_market = function (p) {
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
      const mv = L.kind === 'dish' ? Market.price('dish', L.id) : Market.marketValue('fish', L.item), r = L.price / mv - 1;
      const nm = L.kind === 'dish' ? DISHES[L.id].name : `${FISH_BY_ID[L.id].name} ${L.item.size}cm`;
      return `<tr><td>${nm}${L.auto ? ' <small>(招财猫)</small>' : ''}</td><td>🪙${fmtFull(L.price)}</td><td>🪙${fmtFull(mv)} <small class="${r > 0 ? 'bad' : 'ok'}">${pct1(r)}</small></td><td>${Math.round(Market.saleProb(L, 1) * 100)}%</td><td><button class="btn sm" data-act="delist" data-id="${L.lid}">撤回</button></td></tr>`;
    }).join('')}</table>` : '<div class="empty small">还没有挂单。</div>';
    h += '<div class="section-title" style="margin-top:12px">挑选要挂卖的鱼（背包 / 本地仓库 / 船舱）</div>' + multChips();
    h += '<div class="hint">定价越低卖得越快：按 100% 挂出，平均 3 个游戏小时（约 3 分钟）就能卖掉；定到 120% 就要等很久。' + (T.batch ? '你可以一次批量挂单。' : '普通/铜卡会员一次只能挂一件（银卡起可批量定价）。') + '</div>';
    h += this.fishGrid(inv.map(([, x]) => x));
    const si = this.selInfo(inv.map(([, x]) => x));
    return [h, `<span class="info">已选 ${si.n} 条 · 按今日行情约 🪙${fmtFull(inv.filter(([, x]) => UI.sel.has(x.uid)).reduce((s, [, x]) => s + Market.marketValue('fish', x) * UI.listMult, 0))}</span>
      <button class="btn sm" data-act="delistall" ${M.listings.length ? '' : 'disabled'}>全部撤回</button>
      <button class="btn sm primary" data-act="mklistany" ${si.n && (si.n === 1 || T.batch) ? '' : 'disabled'}>📤 挂出选中（${Math.round(UI.listMult * 100)}%）</button>`];
  }
  if (p.tab === 'chart') {
    const items = [...FISH.filter(f => S.dex[f.id] && Market.sellable('fish', f.id)).map(f => ['fish', f.id, f.name]), ...Cook.K.known.map(id => ['dish', id, DISHES[id].name])];
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
};

// ---------- 厨房 ----------
UI.p_kitchen = function (p) {
  const S = Game.S, K = Cook.K;
  if (p.tab === 'dishes') return UI.p_bag({ tab: 'dish' });
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
    h += `<div class="scard"><span class="gframe">${gi(D.gi, '#ffb74d', '34px')}</span><div class="bd"><div class="nm">${D.name} <small>⏱️${dur(D.time * 1000)} · 行情 🪙${fmtFull(Market.price('dish', id))}</small></div>
      <div class="ds">${D.need.map(n => Cook.needText(n)).join(' + ')}</div><div class="st">回复 ${Math.round(D.heal * 100)}%${D.ap ? ` · 行动点 +${D.ap}` : ''}${D.buff ? ' · ' + Cook.buffText(D.buff) : ''}</div>${pl.ok ? '' : `<div class="bad small">缺：${pl.missing.join('、')}</div>`}</div>
      <div class="act qty"><button class="btn sm primary" data-act="cook" data-id="${id}" data-n="1" ${pl.ok && K.queue.length < K.slots ? '' : 'disabled'}>烹饪</button><button class="btn sm" data-act="cook" data-id="${id}" data-n="5" ${Cook.plan(id, 5).ok && K.queue.length < K.slots ? '' : 'disabled'}>×5</button></div></div>`;
  }
  return [h + '</div>', `<span class="info">灶台 ${K.queue.length}/${K.slots}</span>`];
};

// ---------- 任务 ----------
const needHTML = need => need.map(([k, id, n]) => { const h = Quests.have(k, id); return `<span class="${h >= n ? 'ok' : 'bad'}">${Quests.needName(k, id)} ${k === 'coins' ? fmtFull(Math.min(h, n)) + '/' + fmtFull(n) : `${Math.min(h, n)}/${n}`}</span>`; }).join(' · ');
UI.p_quest = function (p) {
  const S = Game.S, Q = S.quests;
  if (p.tab === 'line') {
    let h = '<div class="hint">套装不能合成：每条任务线从一个「线索」开始，完成步骤拿到图纸，再收集素材找工匠打造。</div>';
    for (const q of QUESTS) {
      const done = Q.done[q.id], i = Q.active[q.id], set = SETS[q.set];
      if (!done && i === undefined) { h += `<div class="qcard lock"><div class="qh">${gi('lock', '#a89d86', '22px')} <b>？？？</b></div><div class="ds">线索可能藏在：${q.clue.from}</div></div>`; continue; }
      const steps = q.steps.map((st, k) => {
        const state = done || k < i ? 'done' : k === i ? 'cur' : 'todo';
        let extra = '';
        if (state === 'cur') {
          if (st.type === 'submit') extra = `<div class="need">${needHTML(st.need)}</div><button class="btn sm primary" data-act="qact" data-id="${q.id}" ${Quests.canSubmit(st.need) ? '' : 'disabled'}>上交</button>`;
          else if (st.type === 'talk') extra = '<button class="btn sm primary" data-act="qact" data-id="' + q.id + '">继续</button>';
          else if (st.type === 'catch') extra = `<div class="need">进度 ${Q.prog[q.id] || 0}/${st.n}${st.weather ? `（需要${WEATHERS[st.weather].name}）` : ''}</div>`;
          else if (st.type === 'clear') extra = `<div class="need">通关「${DUNGEONS.find(d => d.id === st.dungeon).name}」</div>`;
        }
        return `<div class="qstep ${state}"><span class="qi">${state === 'done' ? '✔' : state === 'cur' ? '▶' : '·'}</span><div>${state === 'todo' ? '？？？' : st.text}${st.recipe && state === 'done' ? ` <small class="ok">→ 图纸：${UNIQUES[st.recipe].name}</small>` : ''}${extra}</div></div>`;
      }).join('');
      h += `<div class="qcard ${done ? 'done' : ''}"><div class="qh">${gi(q.clue.gi, '#c9a04a', '22px')} <b>${q.name}</b> <small>线索：${q.clue.name}</small>${done ? ' <span class="owned">已完成</span>' : ''}</div>
        <div class="qset">套装「${set.name}」：2 件 ${set.b2}；3 件 ${set.b3}</div>${steps}</div>`;
    }
    return [h, ''];
  }
  const avail = REQUESTS.filter(r => Quests.reqAvailable(r)), doneN = REQUESTS.filter(r => S.reqDone[r.id]).length;
  let h = '<div class="hint">码头的委托板。大家需要的东西各不相同，完成后能换到料理配方、素材和其他好东西。</div>';
  h += avail.length ? avail.map(r => {
    const ch = CHARS[r.npc] || CHARS.narr, w = r.reward;
    const rw = [w.cook && `料理配方「${DISHES[w.cook].name}」`, w.coins && `🪙${fmtFull(w.coins)}`, w.mats && Object.entries(w.mats).map(([m, n]) => `${MATERIALS[m].name}×${n}`).join('、'), w.perm && ITEM_BY_ID[w.perm].name, w.repair && '免费修船', w.kitchen && '厨房 +1 口锅'].filter(Boolean).join('、');
    return `<div class="qcard req"><div class="qh">${ch.spr ? `<img class="qface" src="${spriteURL(ch.spr, 2)}">` : `<span class="qface">${ch.face}</span>`} <b>${r.title}</b> <small>${ch.name}</small></div>
      <div class="ds">${r.text}</div><div class="need">需要：${needHTML(r.need)}</div><div class="need">报酬：${rw}</div>
      <button class="btn sm primary" data-act="reqdo" data-id="${r.id}" ${Quests.canSubmit(r.need) ? '' : 'disabled'}>交付</button></div>`;
  }).join('') : '<div class="empty">暂时没有新的委托。去更远的地方看看吧。</div>';
  return [h, `<span class="info">已完成委托 ${doneN}/${REQUESTS.length}</span>`];
};

// ---------- 工匠铺 ----------
UI.p_artisan = function (p) {
  const S = Game.S;
  if (p.tab === 'forge') return this.p_forge();
  if (p.tab === 'set') {
    let h = '<div class="hint">工匠·铁爪：“有图纸，有材料，我就能打。没有？那就去跑任务。套装可合成不了！”</div>';
    for (const [sk, set] of Object.entries(SETS)) {
      const cnt = Adv.setCounts()[sk] || 0;
      h += `<div class="qcard"><div class="qh"><b style="color:${SET_COLOR}">✦ ${set.name}</b> <small>已穿戴 ${cnt}/3 · 2 件：${set.b2} · 3 件：${set.b3}</small></div><div class="glist">`;
      for (const key of set.pieces) {
        const U = UNIQUES[key], own = Adv.ownsUnique(key), known = S.setRecipes[key];
        const fake = { uid: -1, u: key, slot: U.slot, tier: U.tier, q: 4, e: 0 };
        const need = Adv.setNeed(key);
        h += `<div class="gcard ${own ? 'on' : ''}">${gearIconHTML(fake, '34px')}<div class="bd"><div class="nm" style="color:${SET_COLOR}">${known || own ? U.name : '？？？'}</div><div class="ds">${GEAR_SLOTS[U.slot]} · T${U.tier}</div>
          <div class="st">${known || own ? statText(U.stats) : '需要从任务「' + U.src.replace('任务「', '').replace('」', '') + '」拿到图纸'}</div>${known && !own ? `<div class="need">${needHTML(need)}</div>` : ''}</div>
          <div class="act">${own ? '<span class="owned">已拥有</span>' : known ? `<button class="btn sm primary" data-act="craftset" data-id="${key}" ${Quests.canSubmit(need) ? '' : 'disabled'}>打造</button>` : ''}</div></div>`;
      }
      h += '</div></div>';
    }
    return [h, ''];
  }
  const sc = S.scene, u = UPGRADES.wh, cost = Game.upgradeCost('wh'), K = Cook.K;
  const kcost = [0, 3000, 15000][K.slots] || 0;
  let h = `<div class="shop-list">
    <div class="scard"><span class="gframe">${gi('warehouse', '#a1887f', '34px')}</span><div class="bd"><div class="nm">扩建「${PLACES[sc].name}」仓库</div><div class="ds">每个地点的仓库是分开的，这里只扩建当前地点。容量 +${u.step}（当前 ${S.whCap} / 上限 ${u.max}）</div></div>
      <div class="act">${S.whCap >= u.max ? '<span class="owned">已满级</span>' : `<span class="price">🪙 ${fmtFull(cost)}</span><button class="btn sm primary" data-act="upwh" ${S.coins >= cost ? '' : 'disabled'}>扩建</button>`}</div></div>
    <div class="scard"><span class="gframe">${gi('kitchen', '#ffb74d', '34px')}</span><div class="bd"><div class="nm">厨房加一口锅</div><div class="ds">可以同时烹饪更多料理（当前 ${K.slots}/3）</div></div>
      <div class="act">${K.slots >= 3 ? '<span class="owned">已满级</span>' : `<span class="price">🪙 ${fmtFull(kcost)}</span><button class="btn sm primary" data-act="upkitchen" ${S.coins >= kcost ? '' : 'disabled'}>建造</button>`}</div></div>
  </div><div class="hint" style="margin-top:12px">船舱扩建、修船，请去航海图里的「船坞」。</div>`;
  return [h, ''];
};

// ---------- 战斗方式选择 ----------
UI.p_bmode = function (p) {
  const d = p.data, S = Game.S;
  const opt = (m, t, ds) => `<button class="bmode ${S.settings.battleMode === m ? 'on' : ''}" data-act="bmgo" data-v="${m}"><b>${t}</b><small>${ds}</small></button>`;
  const h = `<div class="bm-wrap"><div class="ds">${d.title}</div>
    ${opt('auto', '🤖 全自动', '小橘自己决定用什么技能、什么时候吃东西（默认）')}
    ${opt('boss', '👑 Boss 战手动', '普通战斗自动，遇到 Boss 时由你来选技能')}
    ${opt('manual', '🎮 纯手动', '每一回合都由你来选择技能和道具')}
    <div class="fnote">离线时一律自动战斗。战斗中也可以随时点「自动」接管这一场。</div></div>`;
  return [h, ''];
};

// ---------- 操作 ----------
const _uiAct = UI.act.bind(UI);
UI.act = function (a, ds, el) {
  const S = Game.S;
  switch (a) {
    case 'mv': Game.move(ds.from, [...this.sel], ds.to); this.sel.clear(); return;
    case 'release': Game.release(ds.from, [...this.sel]); this.sel.clear(); return;
    case 'releasecheap': Game.releaseWhere(ds.from, f => f.rarity === 'junk' || f.rarity === 'common'); this.sel.clear(); return;
    case 'lmult': this.listMult = +ds.v; this.render(true); return;
    case 'mklist': Market.listFish([...this.sel].map(uid => ({ from: ds.from, uid })), this.listMult); this.sel.clear(); return;
    case 'mklistany': {
      const picks = [...this.sel].map(uid => ({ from: S.bag.some(x => x.uid === uid) ? 'bag' : S.warehouse.some(x => x.uid === uid) ? 'wh' : 'hold', uid }));
      Market.listFish(picks, this.listMult); this.sel.clear(); return;
    }
    case 'listdish': Market.listDish(ds.id, Market.tierDef().batch ? S.dishes[ds.id] : 1, this.listMult); return;
    case 'eatdish': Cook.eat(ds.id); return;
    case 'mkopen': Market.openAccount(); return;
    case 'mktier': Market.buyTier(+ds.v); return;
    case 'mkwatch': this.mkWatch = ds.v; this.render(true); return;
    case 'delist': Market.delist(+ds.id); return;
    case 'delistall': Market.delistAll(); return;
    case 'cook': Cook.cook(ds.id, +ds.n); return;
    case 'cookcancel': Cook.cancel(+ds.v); return;
    case 'qact': Quests.act(ds.id); return;
    case 'reqdo': Quests.submitReq(ds.id); return;
    case 'craftset': Adv.craftSet(ds.id); return;
    case 'autosynth': Adv.autoSynth(+ds.q || undefined); return;
    case 'upwh': Game.buyUpgrade('wh'); return;
    case 'upkitchen': { const c = [0, 3000, 15000][Cook.K.slots]; if (Cook.K.slots < 3 && Game.pay(c)) { Cook.K.slots++; Game.toast('厨房多了一口锅！', 'good'); Game.changed(); } return; }
    case 'repair': Adv.repair(); return;
    case 'goto': { const why = Adv.canFerry(ds.id); if (why) { Game.toast(why, 'warn'); return; } this.openBmode(`短途航行前往「${PLACES[ds.id].name}」（约 1 分钟，可能遇到怪物，消耗 4 点船只耐久）`, m => Adv.startFerry(ds.id, m)); return; }
    case 'bmgo': { const d = this.panel.data; S.settings.battleMode = ds.v; this.close(); d.go(ds.v); return; }
  }
  return _uiAct(a, ds, el);
};
// 出发前先选战斗方式
const _advAct = AdvUI.act.bind(AdvUI);
AdvUI.act = function (a, ds, el) {
  const S = Game.S, ask = (title, go) => UI.openBmode(title, go);
  switch (a) {
    case 'sail': { const r = Adv.routeTo(ds.id), why = Adv.canSail(r); if (why) { Game.toast(why, 'warn'); return; } return ask(`起航前往「${PLACES[ds.id].name}」`, m => Adv.startVoyage(ds.id, m)); }
    case 'enter': return ask(`进入「${DUNGEONS.find(d => d.id === ds.id).name}」`, m => Adv.enterDungeon(ds.id, m));
    case 'hunt': return ask('按照藏宝图出发寻宝', m => Adv.startHunt(m));
  }
  return _advAct(a, ds, el);
};

// ---------- 像素战斗界面 ----------
Object.assign(AdvUI, {
  renderBattle() {
    const B = Adv.battle; if (!B) return;
    $('#battle').classList.remove('hidden');
    $('#b-name').textContent = B.foe.name;
    $('#b-lv').textContent = `Lv${B.foe.lv}${B.foe.boss ? ' 👑' : ''}`;
    this.updateBars(B);
    const sp = Game.S.settings.battleSpeed;
    $('#b-speed').innerHTML = [1, 2, 4, 8].map(v => `<button data-bs="${v}" class="${sp === v ? 'on' : ''}">×${v}</button>`).join('');
    $('#b-mode').textContent = { auto: '🤖 自动', boss: '👑 Boss 手动', manual: '🎮 手动' }[Adv.battleMode()] + (B.forceAuto ? '（已接管）' : '');
    $('#b-log').innerHTML = B.log.slice(-3).map(l => `<div>${l}</div>`).join('');
    $('#battle [data-flee]').textContent = B.ctx.where === 'event' ? '逃跑' : '撤退';
    $('#b-menu').classList.add('hidden');
  },
  updateBars(B) {
    const st = Adv.stats(), H = Game.S.hero;
    const bar = (el, k) => { el.style.width = (k * 100) + '%'; el.style.background = k > 0.5 ? '#3fd47a' : k > 0.2 ? '#f3c63a' : '#ff5050'; };
    bar($('#b-fhp'), B.foe.hp / B.foe.maxHp);
    $('#b-fhpt').textContent = `${Math.ceil(B.foe.hp)}/${B.foe.maxHp}`;
    bar($('#b-hhp'), H.hp / st.maxHp);
    $('#b-hlv').textContent = `Lv${Game.S.level}`;
    $('#b-hpt').textContent = `${Math.ceil(H.hp)}/${st.maxHp}`;
    $('#b-ap').innerHTML = '<span>AP</span>' + Array.from({ length: st.apMax }, (_, i) => `<i class="${i < B.ap ? 'on' : ''}"></i>`).join('');
    const tags = [];
    if (B.guard) tags.push('🛡炸毛×' + B.guard);
    if (B.freeze) tags.push('❄冻结');
    if (Game.S.dungeon && Game.S.dungeon.buff) tags.push('祭坛之力');
    const fb = Cook.activeBuff(); if (fb) tags.push('🍽' + DISHES[fb.id].name);
    $('#b-status').textContent = tags.join(' ');
  },
  onBattleLog(B) {
    if (!B) return;
    $('#b-log').innerHTML = B.log.slice(-3).map(l => `<div>${l}</div>`).join('');
    $('#b-menu').classList.add('hidden');
    this.updateBars(B);
    const fx = B.fx;
    if (fx && fx.kind === 'hit') {
      if (fx.who === 'foe') Sound.tone(fx.crit ? 180 : 260, 0.08, 'square', 0.07, 90);
      else { Sound.noise(0.12, 0.12, 600); Renderer.flash = fx.big ? 0.2 : 0.06; }
    } else if (fx && fx.kind === 'heal') Sound.tone(660, 0.15, 'triangle', 0.08, 990);
    if (B.pause === 'mercy' && !B.mercyShown) { B.mercyShown = true; Story.play('mercy_abyss', c => Adv.mercyChoice(c || 'fight')); }
  },
  showMenu(B, sub) {
    const st = Adv.stats(), m = $('#b-menu'), known = Adv.skills();
    if (sub === 'food') {
      const foods = Adv.battleFoods();
      m.innerHTML = `<div class="bm-title">吃什么？</div><div class="bm-grid">${foods.slice(0, 8).map((f, i) => `<button data-food="${i}">${f.kind === 'dish' ? '🍱' : '🐟'} ${f.name} ×${f.n}<small>HP+${Math.round(f.heal * 100)}%${f.ap ? ` AP+${f.ap}` : ''}</small></button>`).join('') || '<div class="muted">什么吃的都没有……</div>'}<button data-back>↩ 返回</button></div>`;
      m._foods = foods;
    } else {
      m.innerHTML = `<div class="bm-title">小橘要做什么？ <small>行动点 ${B.ap}/${st.apMax}</small></div><div class="bm-grid">${Object.entries(SKILLS).filter(([k]) => known.includes(k)).map(([k, K], i) => `<button data-sk="${k}" ${B.ap >= K.ap ? '' : 'disabled'}><b>${i + 1}. ${K.name}</b><small>${K.ap ? `⚡${K.ap}` : '免费'} · ${K.heal ? '回复' + K.heal * 100 + '%' : K.guard ? '减伤×2' : (K.hits > 1 ? K.hits + '连击×' : '') + K.mult + '倍'}</small></button>`).join('')}
        <button data-eat><b>🍙 吃东西</b><small>回血，不消耗行动点</small></button><button data-auto><b>🤖 自动</b><small>这场交给小橘</small></button></div>`;
    }
    m.classList.remove('hidden');
  },
});
Game.on('battleAwait', B => { AdvUI.updateBars(B); $('#b-log').innerHTML = B.log.slice(-3).map(l => `<div>${l}</div>`).join(''); AdvUI.showMenu(B); Sound.tone(880, 0.06, 'square', 0.05); });

// ---------- 目标提示（v0.4） ----------
AdvUI.goal = function () {
  const S = Game.S;
  for (const r of ROUTES) {
    if (Adv.reached(r.to) || !Adv.reached(r.from)) continue;
    const P = PLACES[r.to].name;
    if (!S.addr.includes(r.to)) {
      if (!Adv.dexComplete(r.from)) return [`📖 集齐「${PLACES[r.from].name}」图鉴（传说/季节鱼除外）${Adv.dexDone(r.from)}/${Adv.dexNeed(r.from).length}`, 'dex'];
      return [`🦦 打开航海图，兑换「${P}」的地址`, 'map'];
    }
    if (S.boat < r.boat) return [`⚓ 在船坞买一艘${BOATS[r.boat].name}（🪙${fmtFull(BOATS[r.boat].price)}）`, 'map', 'dock'];
    if (S.scene !== r.from) return [`⛵ 回到「${PLACES[r.from].name}」才能出发去「${P}」`, 'map'];
    if (S.boatHp < Adv.wearCost(r)) return ['🔧 船的耐久不够了，去船坞修理', 'map', 'dock'];
    if (Adv.fishTotal() < Adv.provisions(r)) return [`🐟 攒够 ${Adv.provisions(r)} 条鱼作为补给 ${Adv.fishTotal()}/${Adv.provisions(r)}`, 'wh'];
    return [`⛵ 一切就绪！起航前往「${P}」`, 'map'];
  }
  if (!S.market.open) return ['📈 去寄卖行开通账户，把鱼挂出去卖', 'market'];
  if (!S.cleared.abyss) return ['🌀 深渊之岛的「沉没王座」在等你', 'map', 'dungeon'];
  if (S.story.ending !== 'spare') return ['💭 再去一次沉没王座……也许可以做出不同的选择', 'map', 'dungeon'];
  const q = QUESTS.find(x => S.quests.active[x.id] !== undefined);
  if (q) return [`📜 任务「${q.name}」：${Quests.step(q.id).text}`, 'quest'];
  if (!S.hiddenOpen.dream) return ['✨ 雾夜里，去湖畔钓一条湖神金鲤', 'dex'];
  return [`🏆 图鉴 ${Object.keys(S.dex).length}/${FISH.length} · 隐藏装备 ${Object.keys(UNIQUES).filter(u => Adv.ownsUnique(u)).length}/${Object.keys(UNIQUES).length}`, 'dex'];
};

// ---------- 初始化 ----------
(function () {
  $('#b-menu').addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b || b.disabled) return;
    const B = Adv.battle; if (!B || !B.await) return;
    Sound.click();
    if (b.dataset.sk) Adv.heroAct({ type: 'skill', id: b.dataset.sk });
    else if (b.dataset.eat !== undefined) AdvUI.showMenu(B, 'food');
    else if (b.dataset.back !== undefined) AdvUI.showMenu(B);
    else if (b.dataset.food !== undefined) Adv.heroAct({ type: 'eat', food: $('#b-menu')._foods[+b.dataset.food] });
    else if (b.dataset.auto !== undefined) { Adv.heroAct({ type: 'auto' }); AdvUI.renderBattle(); }
    if (!Adv.battle || !Adv.battle.await) $('#b-menu').classList.add('hidden');
  });
  document.addEventListener('keydown', e => {
    const B = Adv.battle; if (!B || !B.await || Story.active) return;
    const n = +e.key; if (!n) return;
    const btn = $('#b-menu').querySelectorAll('button')[n - 1]; if (btn) btn.click();
  });
  Game.on('released', d => UI.toast(`放生了 ${d.count} 条鱼，经验 +${d.exp}`, 'good'));
  Game.on('marketSale', d => { UI.toast(`📈 寄卖成交：${d.name} 到手 🪙${fmtFull(d.get)}`, 'good'); Sound.coin(); });
  Game.on('change', () => { if (UI.panel && ['bmode'].includes(UI.panel.name)) return; });
})();
