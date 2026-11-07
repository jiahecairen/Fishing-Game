// ===== 内核 · 界面框架 =====
// 内核只提供「面板、标签页、导航按钮、按钮动作、提示」这些积木；每个面板长什么样由模块自己注册：
//
//   UI.panel('market', { title: '📈 寄卖行', tabs: [['list', '挂单'], ...], render(p) { return [html, foot]; } });
//   UI.tab('bag', { id: 'dish', label: '🍱 料理', after: 'fish', render(p) {...} });   // 往别人的面板里加一页
//   UI.nav({ id: 'market', label: '寄卖', icon: 'market', order: 40, key: 't' });      // 右下角导航按钮
//   UI.actions({ mkopen(ds, el) {...} });                                              // data-act="mkopen" 的按钮
//   UI.goal(50, () => ['📈 去寄卖行开户', 'market']);                                  // 左上角「目标」提示
//   UI.offline(20, r => '<div>…</div>');                                              // 离线收获面板里的一段
//   UI.loot('gear', l => '<div class="loot">…</div>');                                // 「获得物品」里一种奖励的样子
//   UI.setting(30, S => '<div class="set-row">…</div>');                              // 设置面板里的一行
'use strict';

const UI = {
  panel: null,          // 当前打开的面板 { name, tab, data }
  sel: new Set(),       // 面板里的多选
  _last: {},
  panels: {}, extraTabs: {}, acts: {}, navs: [], goals: [], goalExtras: [], offlines: [], loots: {}, settings: [], tips: [], buffs: [], queue: [],

  // ---------- 注册 ----------
  panelDef(name, def) { this.panels[name] = def; },
  tab(panel, def) { (this.extraTabs[panel] = this.extraTabs[panel] || []).push(def); },
  action(name, fn) {
    if (this.acts[name]) console.warn(`[UI] 按钮动作「${name}」被重复注册`);
    this.acts[name] = fn;
  },
  actions(map) { for (const [k, fn] of Object.entries(map)) this.action(k, fn); },
  nav(def) { this.navs.push(Object.assign({ order: 50, panel: def.id }, def)); this.navs.sort((a, b) => a.order - b.order); },
  goal(priority, fn) { this.goals.push({ p: priority, fn }); this.goals.sort((a, b) => a.p - b.p); },
  goalExtra(fn) { this.goalExtras.push(fn); },
  offline(order, fn) { this.offlines.push({ order, fn }); this.offlines.sort((a, b) => a.order - b.order); },
  loot(type, fn) { this.loots[type] = fn; },
  setting(order, fn) { this.settings.push({ order, fn }); this.settings.sort((a, b) => a.order - b.order); },
  tip(fn) { this.tips.push(fn); },
  buff(fn) { this.buffs.push(fn); },

  // ---------- 启动 ----------
  init() {
    $('#modal-close').addEventListener('click', () => this.close());
    $('#modal-bg').addEventListener('click', e => { if (e.target.id === 'modal-bg') this.close(); });
    $('#modal-tabs').addEventListener('click', e => { const b = e.target.closest('button'); if (b) { this.panel.tab = b.dataset.tab; this.sel.clear(); this.render(); } });
    $('#modal').addEventListener('click', e => { const el = e.target.closest('[data-act]'); if (el) this.act(el.dataset.act, el.dataset, el); });
    $('#scene').addEventListener('click', () => { Sound.unlock(); const m = CF.modes.cur(); if (m.action) m.action(); });
    document.addEventListener('keydown', e => this.onKey(e));
    // 状态条（航海 / 副本 …）
    $('#adv-bar').addEventListener('click', e => {
      const b = e.target.closest('button'); if (!b) return;
      if (b.dataset.flee !== undefined) this.confirm(b, () => { const m = CF.modes.cur(); if (m.retreat) m.retreat(); });
      if (b.dataset.open) this.open(b.dataset.open, b.dataset.tab);
    });
    $('#goal').addEventListener('click', e => { const b = e.target.closest('[data-open]'); if (b) this.open(b.dataset.open, b.dataset.tab); });
    // 悬停提示
    document.addEventListener('mouseover', e => { const el = e.target.closest('[data-tip]'); if (el) this.showTip(el); else this.hideTip(); });
    document.addEventListener('mousemove', e => { const t = $('#tip'); if (!t.classList.contains('hidden')) { t.style.left = Math.min(innerWidth - t.offsetWidth - 10, e.clientX + 16) + 'px'; t.style.top = Math.min(innerHeight - t.offsetHeight - 10, e.clientY + 12) + 'px'; } });

    Game.on('toast', d => this.toast(d.msg, d.kind));
    Game.on('levelup', d => { this.toast(`🎉 升级到 Lv.${d.level}！奖励 ${d.bonus} 金币`, 'good'); Sound.levelup(); });
    Game.on('weather', () => this.toast(`天气变为 ${Game.weatherIcon()} ${Game.weatherName()}`));
    Game.on('scene', () => this.toast(`来到了 ${Game.scene().name}`, 'good'));
    Game.on('loot', d => this.showModal('loot', d));
    let pending = false;
    Game.on('change', () => {
      if (!this.panel || pending || this.panel.name === 'offline' || this.panel.name === 'loot') return;
      pending = true;
      requestAnimationFrame(() => { pending = false; if (this.panel) this.render(true); });
    });
    this.panelDef('offline', { title: '🌙 离线收获', compact: true, render: p => this.renderOffline(p.data) });
    this.panelDef('loot', { title: '🎁 获得物品', compact: true, render: p => this.renderLoot(p.data) });
    this.loot('coins', l => `<div class="loot"><span class="li">${gi('coin', '#ffc93c', '28px')}</span><b>${fmtFull(l.n)} 金币</b></div>`);
  },
  // 所有模块 init 完成后：生成导航按钮
  buildNav() {
    const nav = $('#nav');
    nav.innerHTML = this.navs.map(n => `<button data-open="${n.panel}" ${n.tab ? `data-tab="${n.tab}"` : ''} data-nav="${n.id}" title="${n.label}${n.key ? `（${n.key.toUpperCase()}）` : ''}"><span>${gi(n.icon, '#ffe9b0', '24px')}</span>${n.label}<i></i></button>`).join('');
    nav.querySelectorAll('button').forEach(b => b.addEventListener('click', () => { Sound.unlock(); Sound.click(); this.open(b.dataset.open, b.dataset.tab); }));
  },
  onKey(e) {
    if (typeof Story !== 'undefined' && Story.active) { if (e.code === 'Space' || e.key === 'Enter' || e.key === 'z') { e.preventDefault(); Story.next(); } return; }
    if (e.target && /INPUT|TEXTAREA/.test(e.target.tagName)) return;
    const m = CF.modes.cur();
    if (e.code === 'Space' && !this.panel) { e.preventDefault(); Sound.unlock(); if (m.action) m.action(); return; }
    if (e.key === 'Escape') { this.close(); return; }
    if (this.panel || e.metaKey || e.ctrlKey) return;
    if (m.key && m.key(e)) return;
    const n = this.navs.find(x => x.key === e.key);
    if (n) this.open(n.panel, n.tab);
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
    else if (prop === 'hide') el.classList.toggle('hidden', !!val);
    else el.textContent = val;
  },
  _t: 0,
  frame() {
    const S = Game.S;
    this.set('coins', fmtFull(S.coins));
    this.set('lv', S.level);
    this.set('expfill', Math.min(100, S.exp / Game.expNeed() * 100).toFixed(1) + '%', 'width');
    this.set('scene-name', Game.scene().name);
    this.set('day', Game.dateStr());
    this.set('clock', Game.timeStr());
    const ph = PHASES[Game.phase()];
    this.set('phase', ph.icon + ph.name);
    this.set('weather', Game.weatherIcon() + Game.weatherName());
    this.set('buffs', this.buffs.map(fn => { try { return fn(S) || ''; } catch (e) { return ''; } }).join(''), 'html');

    // 当前模式要显示的 HUD
    const m = CF.modes.cur();
    for (const d of Object.values(CF.modes.defs)) for (const id of d.hud || []) if (!m.hud.includes(id)) this.set(id, true, 'hide');
    for (const id of m.hud) this.set(id, false, 'hide');
    if (m.bar) { this.set('adv-bar', 'panel-glass', 'class'); this.set('adv-bar', m.bar(), 'html'); }
    else this.set('adv-bar', 'panel-glass hidden', 'class');

    // 导航按钮上的数字和红点、目标提示（不用每帧都算）
    if (++this._t % 20 === 0) {
      for (const n of this.navs) {
        const b = document.querySelector(`#nav [data-nav="${n.id}"]`); if (!b) continue;
        const i = b.querySelector('i');
        const c = n.count ? n.count(S) : '';
        if (i.textContent !== c) i.textContent = c;
        i.className = n.full && n.full(S) ? 'full' : '';
        b.classList.toggle('dot', !!(n.dot && n.dot(S)));
      }
      let g = null;
      for (const x of this.goals) { try { g = x.fn(S); } catch (e) { console.error(e); } if (g) break; }
      let html = g ? `<span class="g-main" data-open="${g[1]}" ${g[2] ? `data-tab="${g[2]}"` : ''}>${g[0]}</span>` : '';
      for (const fn of this.goalExtras) { try { html += fn(S) || ''; } catch (e) { console.error(e); } }
      this.set('goal', html, 'html');
      this.set('goal', html ? 'panel-glass' : 'panel-glass hidden', 'class');
    }
    // 需要实时刷新的面板（例如厨房的进度条）
    const P = this.panel && this.panels[this.panel.name];
    if (P && P.live) { this._live = (this._live || 0) + 1; if (this._live % Math.round(P.live * 60) === 0) this.render(true); }
  },

  toast(msg, kind) {
    const el = document.createElement('div');
    el.className = 'toast ' + (kind || '');
    el.textContent = msg;
    $('#toasts').appendChild(el);
    while ($('#toasts').children.length > 5) $('#toasts').firstChild.remove();
    setTimeout(() => el.remove(), 3000);
  },
  // 需要点两次确认的按钮
  confirm(b, fn, text) {
    if (b.dataset.armed) { delete b.dataset.armed; fn(); return; }
    b.dataset.armed = '1'; const t = b.textContent; b.textContent = text || '再点一次确认';
    setTimeout(() => { if (b.dataset.armed) { b.textContent = t; delete b.dataset.armed; } }, 2500);
  },

  // ---------- 面板 ----------
  tabsFor(name) {
    const P = this.panels[name]; if (!P) return [];
    let tabs = (typeof P.tabs === 'function' ? P.tabs() : (P.tabs || [])).slice();
    for (const t of this.extraTabs[name] || []) {
      if (t.when && !t.when()) continue;
      const entry = [t.id, typeof t.label === 'function' ? t.label() : t.label];
      const i = t.after ? tabs.findIndex(x => x[0] === t.after) : -1;
      if (t.first) tabs.unshift(entry); else if (i >= 0) tabs.splice(i + 1, 0, entry); else tabs.push(entry);
    }
    return tabs;
  },
  open(name, tab, data) {
    if (!this.panels[name]) { console.warn('[UI] 没有这个面板：', name); return; }
    const tabs = this.tabsFor(name);
    this.panel = { name, tab: tab || (tabs[0] && tabs[0][0]), data: data || null };
    this.sel.clear();
    $('#modal-bg').classList.remove('hidden');
    this.render();
  },
  close() { this.panel = null; $('#modal-bg').classList.add('hidden'); this.popModal(); },
  render(keepScroll) {
    const p = this.panel; if (!p) return;
    const P = this.panels[p.name];
    const body = $('#modal-body'), scroll = body.scrollTop;
    $('#modal-title').textContent = typeof P.title === 'function' ? P.title(p) : (P.title || '');
    $('#modal-tabs').innerHTML = this.tabsFor(p.name).map(([id, nm]) => `<button data-tab="${id}" class="${id === p.tab ? 'on' : ''}">${nm}</button>`).join('');
    const extra = (this.extraTabs[p.name] || []).find(t => t.id === p.tab && t.render);
    let out;
    try { out = extra ? extra.render.call(this, p) : P.render.call(this, p); } catch (e) { console.error(e); out = [`<div class="empty">这个面板出错了：${escapeHTML(e.message)}</div>`, '']; }
    const [html, foot] = out || ['', ''];
    body.innerHTML = html;
    $('#modal').classList.toggle('compact', !!P.compact);
    $('#modal-foot').innerHTML = foot || '';
    body.scrollTop = keepScroll ? scroll : 0;
  },
  act(a, ds, el) {
    const fn = this.acts[a];
    if (!fn) { console.warn('[UI] 没有这个按钮动作：', a); return; }
    try { fn.call(this, ds, el); } catch (e) { console.error(`[UI] 动作 ${a} 出错`, e); }
  },
  // 弹窗排队：剧情或另一个弹窗正在显示时，先排队
  showModal(name, data) {
    if ((typeof Story !== 'undefined' && Story.active) || (this.panel && ['loot', 'offline'].includes(this.panel.name))) { this.queue.push([name, data]); return; }
    this.panel = { name, data, tab: null }; this.sel.clear();
    $('#modal-bg').classList.remove('hidden'); this.render();
  },
  popModal() {
    if ((typeof Story !== 'undefined' && Story.active) || this.panel) return;
    const n = this.queue.shift(); if (n) this.showModal(n[0], n[1]);
  },
  selInfo(list) {
    const items = list.filter(x => this.sel.has(x.uid));
    for (const uid of [...this.sel]) if (!list.some(x => x.uid === uid)) this.sel.delete(uid);
    return { n: items.length, v: items.reduce((s, x) => s + (x.value || 0), 0), uids: items.map(x => x.uid) };
  },

  // ---------- 悬停提示 ----------
  showTip(el) {
    const t = $('#tip');
    let html = null;
    for (const fn of this.tips) { html = fn(el); if (html) break; }
    if (!html) { this.hideTip(); return; }
    t.innerHTML = html; t.classList.remove('hidden');
  },
  hideTip() { $('#tip').classList.add('hidden'); },

  // ---------- 通用面板：离线收获 / 获得物品 ----------
  openOffline(report) { this.showModal('offline', report); },
  renderOffline(r) {
    let h = `<div class="offline"><div class="big">😺💤</div><div style="font-size:17px;margin-top:6px">你离开了 <b>${dur(r.seconds * 1000)}</b></div>`;
    for (const o of this.offlines) { try { h += o.fn(r) || ''; } catch (e) { console.error(e); } }
    return [h + '</div>', `<span class="info"></span><button class="btn primary" data-act="close">好的喵</button>`];
  },
  renderLoot(d) {
    const row = l => { const fn = this.loots[l.type]; return fn ? fn(l) : ''; };
    return [`<div class="loot-box"><div class="loot-title">${d.title}</div>${d.list.map(row).join('')}</div>`, '<span class="info"></span><button class="btn primary" data-act="close">收下</button>'];
  },
};
// 注意：UI.panel 是「当前打开的面板」，注册面板用 UI.panelDef；为了好记，也可以用 CF.panel()
CF.panel = (name, def) => UI.panelDef(name, def);
UI.action('close', function () { this.close(); });
// 通用开关：<input data-act="setting" data-key="xxx"> 直接改 S.settings.xxx
UI.action('setting', function (ds, el) { Game.S.settings[ds.key] = el.checked; Game.changed(); });
