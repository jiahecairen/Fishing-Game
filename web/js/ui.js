// ===== 界面：HUD、面板（背包/仓库/商店/图鉴/场景/设置） =====
'use strict';

const $ = sel => document.querySelector(sel);
const fmt = n => n >= 1e6 ? (n / 1e6).toFixed(2) + 'M' : n >= 1e4 ? (n / 1e3).toFixed(1) + 'k' : String(Math.floor(n));
const fmtFull = n => Math.floor(n).toLocaleString('en-US');
const rbadge = r => `<span class="rbadge r-${r}">${RARITY[r].name}</span>`;
function condText(f) {
  const parts = [];
  parts.push(f.times ? f.times.map(t => PHASES[t].name).join('/') : '全天');
  parts.push(f.weathers ? f.weathers.map(w => WEATHERS[w].name).join('/') : '任意天气');
  if ((f.tier || 1) > 1) parts.push(`需${RODS[f.tier - 1].name}+`);
  return parts.join(' · ');
}
function dur(ms) {
  const s = Math.floor(ms / 1000);
  if (s >= 3600) return `${Math.floor(s / 3600)}小时${Math.floor(s % 3600 / 60)}分`;
  if (s >= 60) return `${Math.floor(s / 60)}分${s % 60}秒`;
  return `${s}秒`;
}

const UI = {
  panel: null,
  sel: new Set(),
  _last: {},

  init() {
    $('#main-btn').addEventListener('click', e => { e.stopPropagation(); Sound.unlock(); Game.action(); });
    $('#scene').addEventListener('click', () => { Sound.unlock(); Game.action(); });
    $('#auto-toggle').addEventListener('change', e => { Game.S.settings.auto = e.target.checked; Game.toast(e.target.checked ? '自动挂机已开启' : '已切换为手动钓鱼'); Game.changed(); });
    document.querySelectorAll('#nav button').forEach(b => b.addEventListener('click', () => { Sound.unlock(); Sound.click(); this.open(b.dataset.open); }));
    $('#modal-close').addEventListener('click', () => this.close());
    $('#modal-bg').addEventListener('click', e => { if (e.target.id === 'modal-bg') this.close(); });
    $('#modal-tabs').addEventListener('click', e => { const b = e.target.closest('button'); if (b) { this.panel.tab = b.dataset.tab; this.sel.clear(); this.render(); } });
    $('#modal').addEventListener('click', e => { const el = e.target.closest('[data-act]'); if (el) this.act(el.dataset.act, el.dataset, el); });
    $('#equip').addEventListener('click', e => { const b = e.target.closest('button'); if (b) this.open('bag', b.dataset.tab); });
    document.addEventListener('keydown', e => {
      if (Story.active) { if (e.code === 'Space' || e.key === 'Enter' || e.key === 'z') { e.preventDefault(); Story.next(); } return; }
      if (e.code === 'Space' && !this.panel) { e.preventDefault(); Sound.unlock(); Game.action(); }
      else if (e.key === 'Escape') this.close();
      else if (!this.panel && !e.metaKey && !e.ctrlKey) {
        const map = { b: 'bag', w: 'wh', s: 'shop', d: 'dex', m: 'map', a: 'adv', k: 'kitchen', q: 'quest', t: 'market', j: 'artisan' };
        if (map[e.key]) this.open(map[e.key]);
      }
    });

    Game.on('toast', d => this.toast(d.msg, d.kind));
    Game.on('catch', d => { this.showCatch(d); this.addLog(d); });
    Game.on('escape', d => this.showEscape(d));
    Game.on('levelup', d => { this.toast(`🎉 升级到 Lv.${d.level}！奖励 ${d.bonus} 金币`, 'good'); Sound.levelup(); });
    Game.on('sold', d => { this.toast(`卖出 ${d.count} 件，获得 ${fmtFull(d.total)} 金币`, 'good'); Sound.coin(); });
    Game.on('weather', () => this.toast(`天气变为 ${Game.weatherIcon()} ${Game.weatherName()}`));
    Game.on('scene', () => this.toast(`来到了 ${Game.scene().name}`, 'good'));
    let pending = false;
    Game.on('change', () => {
      if (!this.panel || pending || this.panel.name === 'offline' || this.panel.name === 'loot') return;
      pending = true;
      requestAnimationFrame(() => { pending = false; if (this.panel) this.render(true); });
    });
    this.renderLog();
  },

  // ---------- HUD ----------
  set(id, val, prop) {
    const key = id + (prop || '');
    if (this._last[key] === val) return;
    this._last[key] = val;
    const el = document.getElementById(id);
    if (!el) return;
    if (prop === 'html') el.innerHTML = val;
    else if (prop === 'width') el.style.width = val;
    else if (prop === 'class') el.className = val;
    else el.textContent = val;
  },
  tick() {
    const S = Game.S, f = Game.fsm;
    this.set('coins', fmtFull(S.coins));
    this.set('lv', S.level);
    this.set('expfill', Math.min(100, S.exp / Game.expNeed() * 100).toFixed(1) + '%', 'width');
    this.set('scene-name', Game.scene().name);
    this.set('day', Game.dateStr());
    this.set('clock', Game.timeStr());
    const ph = PHASES[Game.phase()];
    this.set('phase', ph.icon + ph.name);
    this.set('weather', Game.weatherIcon() + Game.weatherName());
    const bagFull = S.bag.length >= S.bagCap, whFull = S.warehouse.length >= S.whCap;
    this.set('bag-count', `${S.bag.length}/${S.bagCap}`);
    this.set('bag-count', bagFull ? 'full' : '', 'class');
    this.set('wh-count', `${S.warehouse.length}/${S.whCap}`);
    this.set('wh-count', whFull ? 'full' : '', 'class');
    this.set('dex-count', `${Object.keys(S.dex).length}/${FISH.length}`);

    const luckLeft = Game.luckBuffLeft();
    let buffs = '';
    if (luckLeft > 0) buffs += `<div class="pill buff">🔔 幸运+30% · ${dur(luckLeft)}</div>`;
    if (S.perms.glowfloat && Game.phase() === 'night') buffs += `<div class="pill buff">🏮 夜光浮漂生效中</div>`;
    this.set('buffs', buffs, 'html');

    // 状态 + 主按钮
    const auto = S.settings.auto;
    let st = '', cls = '', btn = '抛竿', bcls = 'big-btn';
    switch (f.phase) {
      case 'idle':
        if (f.blocked) { st = '背包装满啦！去出售或整理一下喵～'; cls = 'bad'; btn = '抛竿'; }
        else { st = auto ? '准备抛竿…' : '点击「抛竿」或按空格开始钓鱼'; }
        break;
      case 'casting': st = '嗖——'; btn = '…'; bcls += ' calm'; break;
      case 'waiting': st = `等待鱼儿上钩…（${Game.bait().name}）`; btn = auto ? '挂机中' : '收线'; bcls += ' calm'; break;
      case 'bite': st = auto ? '有鱼上钩！点击可「完美收竿」' : '有鱼上钩了！快收竿！'; cls = 'alert'; btn = '收竿！'; bcls += ' bite'; break;
      case 'reeling': st = f.perfect ? '✨ 完美收竿！拉扯中…' : '拉扯中…'; btn = '…'; bcls += ' calm'; break;
      case 'result':
        if (f.escaped) { st = f.missed ? '没来得及收竿，鱼跑了…' : '可恶，鱼挣脱了！'; cls = 'bad'; }
        else st = `钓到了 ${FISH_BY_ID[f.item.id].name}！`;
        btn = auto ? '挂机中' : '抛竿'; bcls += auto ? ' calm' : '';
        break;
    }
    this.set('status', st);
    this.set('status', 'panel-glass ' + cls, 'class');
    this.set('main-btn', btn);
    this.set('main-btn', bcls, 'class');
    const at = $('#auto-toggle'); if (at.checked !== auto) at.checked = auto;

    const b = Game.bait(), cnt = b.infinite ? '∞' : (S.baits[b.id] || 0);
    this.set('equip', `<button data-tab="gear" title="鱼竿">${Game.rod().icon} ${Game.rod().name}</button>`
      + `<button data-tab="gear" title="鱼线">${Game.line().icon} ${Game.line().name}</button>`
      + `<button data-tab="items" title="鱼饵">${b.icon} ${b.name}<span class="cnt">×${cnt}</span></button>`, 'html');
  },

  toast(msg, kind) {
    const el = document.createElement('div');
    el.className = 'toast ' + (kind || '');
    el.textContent = msg;
    $('#toasts').appendChild(el);
    while ($('#toasts').children.length > 5) $('#toasts').firstChild.remove();
    setTimeout(() => el.remove(), 3000);
  },
  showCatch(d) {
    const { item, fish } = d;
    if (fish.treasure) {
      const el = document.createElement('div');
      el.className = 'pop ' + fish.rarity;
      el.innerHTML = `<img src="${fishIcon(fish.id)}"><div><div class="nm" style="color:${RARITY[fish.rarity].color}">${fish.name}<span class="tag perfect">宝藏</span></div><div class="sub">${fish.desc}</div></div>`;
      const box = $('#catch-pop'); box.innerHTML = ''; box.appendChild(el);
      setTimeout(() => el.remove(), 3200);
      Sound.catch('epic');
      return;
    }
    const el = document.createElement('div');
    el.className = 'pop ' + fish.rarity;
    const where = d.stored === 'wh' ? ' · 已送入仓库' : d.stored === 'listed' ? ' · 招财猫挂到了寄卖行' : d.stored === 'released' ? ' · 满了，已放生' : '';
    el.innerHTML = `<img src="${fishIcon(fish.id)}"><div><div class="nm" style="color:${RARITY[fish.rarity].color}">${item.star ? '★' : ''}${fish.name}${d.isNew ? '<span class="tag new">新发现</span>' : ''}${d.perfect ? '<span class="tag perfect">完美</span>' : ''}</div>`
      + `<div class="sub">${RARITY[fish.rarity].name} · ${item.size} cm · 🪙${fmtFull(item.value)}${where}</div></div>`;
    const box = $('#catch-pop'); box.innerHTML = ''; box.appendChild(el);
    setTimeout(() => el.remove(), 3200);
    Sound.catch(fish.rarity);
  },
  showEscape(d) {
    const el = document.createElement('div');
    el.className = 'pop escape';
    el.innerHTML = `<div class="sub" style="color:#ffcabb">💨 ${d.missed ? '没来得及收竿，鱼溜走了' : '鱼挣脱了鱼钩…'}</div>`;
    const box = $('#catch-pop'); box.innerHTML = ''; box.appendChild(el);
    setTimeout(() => el.remove(), 3200);
  },
  logItems: [],
  addLog(d) {
    if (d.fish.treasure) return;
    this.logItems.unshift(d.item);
    this.logItems.length = Math.min(this.logItems.length, 6);
    this.renderLog();
  },
  renderLog() {
    if (!this.logItems.length) return;
    $('#log-list').innerHTML = this.logItems.map(it => {
      const f = FISH_BY_ID[it.id];
      return `<li><img src="${fishIcon(f.id)}"><span style="color:${RARITY[f.rarity].color}">${it.star ? '★' : ''}${f.name}</span><span class="muted">${it.size}cm</span><span class="v">🪙${fmt(it.value)}</span></li>`;
    }).join('');
  },

  // ---------- 面板 ----------
  open(name, tab) {
    const tabs = this.tabsFor(name);
    this.panel = { name, tab: tab || (tabs[0] && tabs[0][0]), data: null };
    this.sel.clear();
    $('#modal-bg').classList.remove('hidden');
    this.render();
  },
  openOffline(report) { this.panel = { name: 'offline', data: report }; $('#modal-bg').classList.remove('hidden'); this.render(); },
  _compact() { $('#modal').classList.toggle('compact', !!this.panel && ['offline', 'loot'].includes(this.panel.name)); },
  close() { this.panel = null; $('#modal-bg').classList.add('hidden'); AdvUI.popModal(); },
  tabsFor(name) {
    switch (name) {
      case 'bag': return [['fish', '🐟 鱼获'], ['items', '🎁 物品栏'], ['gear', '🎣 装备']];
      case 'shop': return [['rod', '鱼竿'], ['line', '鱼线'], ['bait', '鱼饵'], ['item', '道具'], ['upgrade', '扩容']];
      case 'dex': return SCENES.map(s => [s.id, s.name]);
      case 'adv': return [['hero', '🐱 角色'], ['talent', '🌟 天赋'], ['gear', '⚔️ 装备'], ['forge', '🔨 锻造'], ['treasure', '💰 宝藏']];
      case 'map': return [['sail', '🧭 航海'], ['dungeon', '🏰 副本'], ['dock', '⚓ 船坞']];
      default: return [];
    }
  },
  render(keepScroll) {
    const p = this.panel; if (!p) return;
    const body = $('#modal-body');
    const scroll = body.scrollTop;
    const titles = { bag: '🎒 背包', wh: '🏠 仓库', shop: '🛒 杂货铺', dex: '📖 鱼类图鉴', scene: '🗺️ 钓鱼场景', settings: '⚙️ 设置', offline: '🌙 离线收获', adv: '⚔️ 冒险', map: '🧭 航海图', loot: '🎁 获得物品', cheat: '🧪 作弊面板' };
    $('#modal-title').textContent = titles[p.name] || (UI.titles || {})[p.name] || '';
    $('#modal-tabs').innerHTML = this.tabsFor(p.name).map(([id, nm]) => `<button data-tab="${id}" class="${id === p.tab ? 'on' : ''}">${nm}</button>`).join('');
    let html = '', foot = '';
    const fn = this['p_' + p.name];
    [html, foot] = fn.call(this, p);
    body.innerHTML = html;
    this._compact();
    $('#modal-foot').innerHTML = foot || '';
    if (keepScroll) body.scrollTop = scroll; else body.scrollTop = 0;
  },

  fishGrid(list) {
    if (!list.length) return '<div class="empty">空空如也～</div>';
    const sorted = list.slice().sort((a, b) => b.value - a.value);
    return '<div class="grid">' + sorted.map(it => {
      const f = FISH_BY_ID[it.id];
      return `<div class="fcard ${this.sel.has(it.uid) ? 'sel' : ''}" data-act="sel" data-uid="${it.uid}">
        ${it.star ? '<span class="star">★</span>' : ''}
        <img src="${fishIcon(f.id)}"><div class="nm">${f.name}</div>
        <div class="meta">${rbadge(f.rarity)} ${it.size}cm</div><div class="val">🪙 ${fmtFull(it.value)}</div>${(() => { const fv = foodValue(it); return fv ? `<div class="food">❤️${fv.hp}${fv.ap ? ` ⚡+${fv.ap}` : ''}</div>` : ''; })()}</div>`;
    }).join('') + '</div>';
  },
  selInfo(list) {
    const items = list.filter(x => this.sel.has(x.uid));
    for (const uid of [...this.sel]) if (!list.some(x => x.uid === uid)) this.sel.delete(uid);
    return { n: items.length, v: items.reduce((s, x) => s + x.value, 0), uids: items.map(x => x.uid) };
  },

  p_bag(p) {
    const S = Game.S;
    if (p.tab === 'fish') {
      const si = this.selInfo(S.bag);
      const total = S.bag.reduce((s, x) => s + x.value, 0);
      const html = (!Game.canStore() ? `<div class="hint">背包满了，小猫会停下来休息。可以出售鱼、移入仓库，或在商店购买「自动收纳盒」/「背包扩容」。</div>` : '')
        + this.fishGrid(S.bag);
      const foot = `<span class="info">容量 ${S.bag.length}/${S.bagCap} · 总价值 🪙${fmtFull(total)}${si.n ? ` · 已选 ${si.n} 条（🪙${fmtFull(si.v)}）` : ''}</span>
        <button class="btn sm" data-act="selall" data-from="bag">${si.n === S.bag.length && si.n ? '取消全选' : '全选'}</button>
        <button class="btn sm" data-act="move" data-from="bag" ${si.n ? '' : 'disabled'}>选中移入仓库</button>
        <button class="btn sm red" data-act="eat" ${si.n ? '' : 'disabled'}>🍽️ 吃掉选中</button>
        <button class="btn sm primary" data-act="sell" data-from="bag" ${si.n ? '' : 'disabled'}>出售选中</button>
        <button class="btn sm" data-act="sellcheap" data-from="bag" ${S.bag.length ? '' : 'disabled'}>卖掉杂物和普通鱼</button>
        <button class="btn sm" data-act="moveall" ${S.bag.length ? '' : 'disabled'}>全部移入仓库</button>
        <button class="btn sm green" data-act="sellall" data-from="bag" ${S.bag.length ? '' : 'disabled'}>全部出售</button>`;
      return [html, foot];
    }
    if (p.tab === 'items') {
      let h = '<div class="section-title">鱼饵</div><div class="shop-list">';
      for (const b of BAITS) {
        const c = Game.baitCount(b.id);
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
    // gear
    const rod = Game.rod();
    let h = `<div class="hint">当前：${rod.icon}${rod.name} + ${Game.line().icon}${Game.line().name} ｜ 上钩速度 ×${rod.speed} · 控鱼 ${Math.round(Game.control() * 100)}% · 幸运 +${Math.round(Game.luck() * 100)}% · 可钓等级 ${rod.tier}</div>`;
    h += '<div class="section-title">鱼竿</div><div class="shop-list">';
    for (const r of RODS) if (S.rods.includes(r.id)) h += this.gearCard(r, `速度×${r.speed} · 控鱼${Math.round(r.control * 100)}% · 幸运+${Math.round(r.luck * 100)}% · 等级${r.tier}`, S.rod === r.id, 'equiprod');
    h += '</div><div class="section-title" style="margin-top:16px">鱼线</div><div class="shop-list">';
    for (const l of LINES) if (S.lines.includes(l.id)) h += this.gearCard(l, l.desc, S.line === l.id, 'equipline');
    return [h + '</div>', ''];
  },
  gearCard(g, stat, on, act) {
    return `<div class="scard"><div class="ic">${g.icon}</div><div class="bd"><div class="nm">${g.name}</div><div class="ds">${g.desc}</div><div class="st">${stat}</div></div>
      <div class="act">${on ? '<span class="owned">装备中</span>' : `<button class="btn sm primary" data-act="${act}" data-id="${g.id}">装备</button>`}</div></div>`;
  },

  p_wh() {
    const S = Game.S;
    const si = this.selInfo(S.warehouse);
    const total = S.warehouse.reduce((s, x) => s + x.value, 0);
    const html = (S.perms.autostore ? '<div class="hint">📦 自动收纳盒生效中：背包满时，新钓到的鱼会直接送到这里。</div>' : '<div class="hint">仓库可以存放大量鱼获。购买「自动收纳盒」后，背包满时鱼会自动送进仓库，挂机更久！</div>')
      + this.fishGrid(S.warehouse);
    const foot = `<span class="info">容量 ${S.warehouse.length}/${S.whCap} · 总价值 🪙${fmtFull(total)}${si.n ? ` · 已选 ${si.n} 条（🪙${fmtFull(si.v)}）` : ''}</span>
      <button class="btn sm" data-act="selall" data-from="wh">${si.n === S.warehouse.length && si.n ? '取消全选' : '全选'}</button>
      <button class="btn sm" data-act="move" data-from="wh" ${si.n ? '' : 'disabled'}>取回背包</button>
      <button class="btn sm primary" data-act="sell" data-from="wh" ${si.n ? '' : 'disabled'}>出售选中</button>
      <button class="btn sm" data-act="sellcheap" data-from="wh" ${S.warehouse.length ? '' : 'disabled'}>卖掉杂物和普通鱼</button>
      <button class="btn sm green" data-act="sellall" data-from="wh" ${S.warehouse.length ? '' : 'disabled'}>全部出售</button>`;
    return [html, foot];
  },

  p_shop(p) {
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
        const owned = it.type === 'permanent' && S.perms[it.id];
        h += `<div class="scard"><div class="ic">${it.icon}</div><div class="bd"><div class="nm">${it.name}${it.type === 'permanent' ? ' <span class="rbadge r-rare">永久</span>' : ''}</div><div class="ds">${it.desc}</div>
          ${it.type === 'consumable' ? `<div class="st">持有 ${S.items[it.id] || 0}</div>` : ''}</div>
          <div class="act">${owned ? '<span class="owned">已拥有</span>' : buyBtn(it.price, 'buyitem', it.id)}</div></div>`;
      }
    } else if (p.tab === 'upgrade') {
      for (const type of ['bag']) {
        const u = UPGRADES[type], cur = type === 'bag' ? S.bagCap : S.whCap, maxed = cur >= u.max, cost = Game.upgradeCost(type);
        h += `<div class="scard"><div class="ic">${u.icon}</div><div class="bd"><div class="nm">${u.name}</div><div class="ds">容量 +${u.step}（当前 ${cur} / 上限 ${u.max}）</div></div>
          <div class="act">${maxed ? '<span class="owned">已满级</span>' : buyBtn(cost, 'upgrade', type)}</div></div>`;
      }
    }
    return [h + '</div>', `<span class="info">💰 持有 ${fmtFull(S.coins)} 金币</span>`];
  },

  p_dex(p) {
    const S = Game.S;
    const list = FISH.filter(f => f.scenes.includes(p.tab));
    const got = list.filter(f => S.dex[f.id]).length;
    const locked = !S.unlockedScenes.includes(p.tab);
    let h = `<div style="display:flex;justify-content:space-between;font-size:14px"><b>${findById(SCENES, p.tab).name}${locked ? '（未解锁）' : ''}</b><span>收集进度 ${got}/${list.length}</span></div>
      <div class="progress"><div style="width:${got / list.length * 100}%"></div></div><div class="dex-list">`;
    const order = list.slice().sort((a, b) => RARITY_ORDER.indexOf(a.rarity) - RARITY_ORDER.indexOf(b.rarity));
    for (const f of order) {
      const d = S.dex[f.id];
      if (d) {
        h += `<div class="dex-card"><img src="${fishIcon(f.id)}"><div><div class="nm">${f.name} ${rbadge(f.rarity)}</div><div class="ds">${f.desc}</div>
          <div class="cond">🕐 ${condText(f)}</div><div class="rec">已钓 ${d.count} 条 · 最大 ${d.max}cm · 基础价 🪙${f.price}</div></div></div>`;
      } else {
        h += `<div class="dex-card unknown"><img src="${fishIcon(f.id, true)}"><div><div class="nm">??? ${rbadge(f.rarity)}</div><div class="ds">尚未发现</div>
          <div class="cond">🕐 ${condText(f)}</div></div></div>`;
      }
    }
    const total = Object.keys(S.dex).length;
    return [h + '</div>', `<span class="info">全图鉴 ${total}/${FISH.length} · 首次钓到新鱼可获得双倍经验</span>`];
  },

  p_scene() {
    const S = Game.S;
    const pics = {
      lake: 'linear-gradient(180deg,#6fb3e8 0%,#cfe9f7 45%,#4f8f5c 46%,#3a6b45 55%,#4f8fb0 56%,#1d4a66 100%)',
      river: 'linear-gradient(180deg,#5a9ed8 0%,#d0e4ee 40%,#6b7d6a 41%,#4f6150 55%,#4fa3a8 56%,#1f5a5e 100%)',
      sea: 'linear-gradient(180deg,#5a76c0 0%,#f5b77c 50%,#2f7fc0 51%,#0f3c70 100%)',
      ice: 'linear-gradient(180deg,#1a1f4f 0%,#4a8a8a 30%,#c9d8e8 42%,#e8f0f8 52%,#7fb8d0 53%,#3a6f8f 100%)',
    };
    let h = '<div class="scene-list">';
    for (const sc of SCENES) {
      const un = S.unlockedScenes.includes(sc.id), cur = S.scene === sc.id;
      const total = Object.values(sc.weather).reduce((a, b) => a + b, 0);
      const wx = Object.entries(sc.weather).map(([w, v]) => `${WEATHERS[w].icon}${Math.round(v / total * 100)}%`).join(' ');
      const nf = FISH.filter(f => f.scenes.includes(sc.id)).length;
      const got = FISH.filter(f => f.scenes.includes(sc.id) && S.dex[f.id]).length;
      h += `<div class="scene-card ${cur ? 'cur' : ''}"><div class="pic" style="background:${pics[sc.id]}"><span>${sc.name}</span></div><div class="bd">
        <div class="ds">${sc.desc}</div><div class="wx">天气倾向：${wx}</div>
        <div class="row"><span style="font-size:12.5px;color:var(--ink-muted)">图鉴 ${got}/${nf}</span>
        ${cur ? '<span class="owned">当前所在</span>' : un ? `<button class="btn sm green" data-act="goto" data-id="${sc.id}">前往</button>`
          : `<span><span class="price">🪙 ${fmtFull(sc.price)}</span> <button class="btn sm primary" data-act="unlock" data-id="${sc.id}" ${S.coins < sc.price ? 'disabled' : ''}>解锁</button></span>`}
        </div></div></div>`;
    }
    return [h + '</div>', ''];
  },

  p_settings() {
    const S = Game.S, st = S.stats;
    const sw = (key, on, disabled) => `<label class="switch"><input type="checkbox" data-act="setting" data-key="${key}" ${on ? 'checked' : ''} ${disabled ? 'disabled' : ''}><span class="slider"></span></label>`;
    let h = `<div class="set-row"><div>自动挂机<small>小猫自动抛竿收竿；关闭游戏后也会按离线时间结算（最多 8 小时）</small></div>${sw('auto', S.settings.auto)}</div>
      <div class="set-row"><div>满仓自动出售<small>${S.perms.luckycat ? '背包和仓库都满时，自动卖掉普通鱼和杂物' : '需要在商店购买「招财猫」解锁'}</small></div>${sw('autoSell', S.settings.autoSell, !S.perms.luckycat)}</div>
      <div class="set-row"><div>战斗中自动吃鱼<small>HP 低于 35% 时，自动吃背包里的鱼回血（鱼越稀有回得越多；鳗鱼、鱿鱼、小龙虾等还会额外 +2 行动点）</small></div>${sw('autoEat', S.settings.autoEat)}</div>
      <div class="set-row"><div>默认战斗方式<small>进入副本、出航前会让你选择；这里是默认值（码头上的突发战斗也用它）</small></div><div class="qty">${[['auto', '自动'], ['boss', 'Boss 手动'], ['manual', '纯手动']].map(([v, n]) => `<button class="btn sm ${S.settings.battleMode === v ? 'primary' : ''}" data-act="bmodeset" data-v="${v}">${n}</button>`).join('')}</div></div>
      <div class="set-row"><div>战斗速度</div><div class="qty">${[1, 2, 4].map(v => `<button class="btn sm ${S.settings.battleSpeed === v ? 'primary' : ''}" data-act="bspeed" data-v="${v}">×${v}</button>`).join('')}</div></div>
      <div class="set-row"><div>音效</div>${sw('sound', S.settings.sound)}</div>
      <div class="set-row"><div>测试作弊面板<small>在右上角显示 🧪 按钮，用来测试各种内容</small></div>${sw('cheatBtn', S.settings.cheatBtn)}</div>
      <div class="section-title" style="margin-top:18px">统计</div>
      <div class="kv">
        <span class="k">抛竿次数</span><span>${fmtFull(st.casts)}</span>
        <span class="k">钓到</span><span>${fmtFull(st.caught)} 条</span>
        <span class="k">跑掉</span><span>${fmtFull(st.escaped)} 条</span>
        <span class="k">累计收入</span><span>🪙 ${fmtFull(st.earned)}</span>
        <span class="k">图鉴</span><span>${Object.keys(S.dex).length}/${FISH.length}</span>
      </div>
      <div class="section-title" style="margin-top:18px">操作说明</div>
      <div style="font-size:13.5px;line-height:1.8;color:var(--ink-muted)">
        空格 / 点击画面：抛竿、收竿（浮漂下沉出现「!」时点击即为<b>完美收竿</b>：鱼更大、更不容易跑）<br>
        快捷键：B 背包 · W 仓库 · S 商店 · D 图鉴 · M 场景 · Esc 关闭面板<br>
        时间：现实 1 秒 = 游戏 1 分钟，一天 24 分钟。不同的鱼只在特定时段和天气出没。
      </div>
      <div class="section-title" style="margin-top:18px">素材致谢</div>
      <div style="font-size:12.5px;line-height:1.7;color:var(--ink-muted)">装备与道具图标来自 <b>game-icons.net</b>（作者 Lorc、Delapouite 等），以 CC BY 3.0 协议授权。怪物像素立绘为本游戏原创。</div>`;
    const foot = `<span class="info">存档自动保存</span><button class="btn sm red" data-act="reset">${this._resetArmed ? '再点一次确认清空' : '重置存档'}</button>`;
    return [h, foot];
  },

  p_offline(p) {
    const r = p.data;
    let h = `<div class="offline"><div class="big">😺💤</div><div style="font-size:17px;margin-top:6px">你离开了 <b>${dur(r.seconds * 1000)}</b></div>`;
    if (r.market && r.market.n) h += `<div style="margin-top:8px">📈 寄卖行成交 ${r.market.n} 件，到手 🪙${fmtFull(r.market.coins)}</div>`;
    if (r.adv) h += AdvUI.offlineHtml(r.adv);
    if (r.treasures && r.treasures.length) h += `<div style="margin-top:8px">钓到宝藏：${r.treasures.map(([k, n]) => `${FISH_BY_ID[k].name}×${n}`).join('、')}</div>`;
    if (r.adv && r.adv.left < 30) h += '';
    else if (r.idleOff) h += `<div style="margin-top:14px;color:var(--ink-muted)">自动挂机没有开启，小猫在码头睡了一觉～</div>`;
    else {
      h += `<div class="stats"><div><b>${r.casts}</b>抛竿</div><div><b>${r.caught}</b>钓到</div><div><b>${r.escaped}</b>跑掉</div><div><b>🪙${fmtFull(r.coins)}</b>自动出售</div></div>`;
      if (r.best) { const f = FISH_BY_ID[r.best.id]; h += `<div>最佳渔获：<img src="${fishIcon(f.id)}" style="width:60px;vertical-align:middle"> <b style="color:${f.rarity === 'common' ? 'inherit' : RARITY[f.rarity].color}">${f.name}</b> ${r.best.size}cm 🪙${fmtFull(r.best.value)}</div>`; }
      if (r.newFish.length) h += `<div style="margin-top:8px">新发现：${r.newFish.map(id => FISH_BY_ID[id].name).join('、')}</div>`;
      if (r.levelTo > r.levelFrom) h += `<div style="margin-top:8px">升级到了 Lv.${r.levelTo}！</div>`;
      if (r.stopped) h += `<div class="hint" style="margin-top:14px">背包满了，小猫中途停了下来。购买「自动收纳盒」、扩容或「招财猫」可以挂机更久！</div>`;
    }
    return [h + '</div>', `<span class="info"></span><button class="btn primary" data-act="close">好的喵</button>`];
  },

  // ---------- 操作 ----------
  act(a, ds, el) {
    const S = Game.S;
    if (a !== 'reset') this._resetArmed = false;
    switch (a) {
      case 'close': this.close(); break;
      case 'eat': Adv.eat([...this.sel]); this.sel.clear(); break;
      case 'bspeed': S.settings.battleSpeed = +ds.v; Game.changed(); break;
      case 'bmodeset': S.settings.battleMode = ds.v; Game.changed(); break;
      case 'sel': {
        const uid = +ds.uid;
        this.sel.has(uid) ? this.sel.delete(uid) : this.sel.add(uid);
        this.render(true); break;
      }
      case 'selall': {
        const list = ds.from === 'bag' ? S.bag : S.warehouse;
        if (this.sel.size === list.length) this.sel.clear(); else list.forEach(x => this.sel.add(x.uid));
        this.render(true); break;
      }
      case 'sell': Game.sell(ds.from, [...this.sel]); this.sel.clear(); break;
      case 'sellall': Game.sellWhere(ds.from, () => true); this.sel.clear(); break;
      case 'sellcheap': Game.sellWhere(ds.from, f => f.rarity === 'junk' || f.rarity === 'common'); this.sel.clear(); break;
      case 'move': Game.move(ds.from, [...this.sel]); this.sel.clear(); break;
      case 'moveall': Game.move('bag', S.bag.map(x => x.uid)); this.sel.clear(); break;
      case 'equipbait': Game.equipBait(ds.id); break;
      case 'equiprod': Game.equipRod(ds.id); break;
      case 'equipline': Game.equipLine(ds.id); break;
      case 'use': Game.useItem(ds.id); break;
      case 'usen': { let k = 0; const n = Math.min(+ds.n, S.items[ds.id] || 0); while (k < n && Game.useItem(ds.id, k < n - 1)) k++; if (k > 1) Game.toast(`连续使用了 ${k} 个${ITEM_BY_ID[ds.id].name}`, 'good'); break; }
      case 'buyrod': if (Game.buyRod(ds.id)) Sound.coin(); break;
      case 'buyline': if (Game.buyLine(ds.id)) Sound.coin(); break;
      case 'buybait': if (Game.buyBait(ds.id, +ds.q)) Sound.coin(); break;
      case 'buyitem': if (Game.buyItem(ds.id, 1)) Sound.coin(); break;
      case 'upgrade': if (Game.buyUpgrade(ds.id)) Sound.coin(); break;
      case 'unlock': if (Game.unlockScene(ds.id)) { Sound.levelup(); this.close(); } break;
      case 'goto': Game.switchScene(ds.id); this.close(); break;
      case 'setting': S.settings[ds.key] = el.checked; Game.changed(); break;
      case 'reset':
        if (this._resetArmed) { this._resetArmed = false; Game.reset(); this.logItems = []; $('#log-list').innerHTML = '<li class="muted">还没有钓到鱼～</li>'; this.close(); Game.toast('存档已重置'); }
        else { this._resetArmed = true; this.render(true); }
        break;
      default: AdvUI.act(a, ds, el);
    }
  },
};
