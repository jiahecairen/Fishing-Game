// ===== 小猫钓鱼 · 后台管理页面 =====
// 数据全部来自服务器的 /api/admin/*（见 server/modules/admin.js、tuning.js、mail.js）。
// 想在后台加一个新的可调参数：只要改 server/tuning/schema.js，这个页面会自动多出一行。
'use strict';

const $ = s => document.querySelector(s);
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const fmt = n => n == null ? '—' : Math.round(n).toLocaleString('zh-CN');
const ago = t => { if (!t) return '从未'; const s = (Date.now() - t) / 1000; if (s < 90) return '刚刚'; if (s < 3600) return Math.floor(s / 60) + ' 分钟前'; if (s < 86400) return Math.floor(s / 3600) + ' 小时前'; return Math.floor(s / 86400) + ' 天前'; };
const dur = ms => { const s = ms / 1000; if (s < 3600) return Math.floor(s / 60) + ' 分钟'; if (s < 86400) return (s / 3600).toFixed(1) + ' 小时'; return (s / 86400).toFixed(1) + ' 天'; };
const bytes = n => n < 1024 ? n + ' B' : n < 1048576 ? (n / 1024).toFixed(1) + ' KB' : (n / 1048576).toFixed(1) + ' MB';
const icon = (name, color, size) => (typeof gi === 'function' && gi(name, color, size)) || '';

const A = {
  token: null, tab: 'overview', catalog: null, tuning: null, dirty: {}, players: [],
  STAT_KEYS: ['atk', 'def', 'maxHp', 'spd', 'crit', 'luck'],

  // ---------- 和服务器通信 ----------
  async api(path, opt) {
    opt = opt || {};
    const res = await fetch(path, {
      method: opt.method || 'GET',
      headers: Object.assign({ 'Content-Type': 'application/json' }, this.token ? { Authorization: 'Admin ' + this.token } : {}),
      body: opt.body ? JSON.stringify(opt.body) : undefined,
    });
    let data = {}; try { data = await res.json(); } catch (e) { /* ignore */ }
    if (!res.ok) {
      if (res.status === 401 && data.code === 'admin') { this.logout(true); }
      const e = new Error(data.error || ('请求失败 ' + res.status)); e.status = res.status; throw e;
    }
    return data;
  },
  toast(msg, bad) { const t = document.createElement('div'); t.className = 'toast' + (bad ? ' bad' : ''); t.textContent = msg; $('#toasts').appendChild(t); setTimeout(() => t.remove(), bad ? 6000 : 3000); },
  async run(fn, okMsg) { try { const r = await fn(); if (okMsg) this.toast(okMsg); return r; } catch (e) { this.toast(e.message, true); return null; } },

  // ---------- 登录 ----------
  async start() {
    try { this.token = localStorage.getItem('cf_admin'); } catch (e) { this.token = null; }
    let st; try { st = await this.api('/api/admin/state'); } catch (e) { this.showLogin({ error: '连不上服务器：' + e.message }); return; }
    if (st.needSetup) return this.showLogin({ setup: true, local: st.local });
    if (!this.token) return this.showLogin({});
    try { await this.api('/api/admin/overview'); this.enter(); } catch (e) { this.showLogin({}); }
  },
  showLogin(o) {
    $('#app').classList.add('hidden'); const L = $('#login'); L.classList.remove('hidden');
    const body = o.setup
      ? (o.local
        ? `<p>第一次使用，请设置后台管理员密码（和玩家账号无关）。</p><input id="pw" type="password" placeholder="管理员密码（至少 6 位）"><input id="pw2" type="password" placeholder="再输一次"><div class="err" id="err"></div><button class="btn primary" style="width:100%" id="go">设置并进入</button>`
        : `<p>还没有设置管理员密码。<br>为了安全，第一次设置只能在运行服务器的那台电脑上打开<br><b>http://localhost:${location.port || 80}/admin/</b></p>`)
      : `<p>请输入后台管理员密码</p><input id="pw" type="password" placeholder="管理员密码" autocomplete="current-password"><div class="err" id="err">${esc(o.error || '')}</div><button class="btn primary" style="width:100%" id="go">进入后台</button>`;
    L.innerHTML = `<div class="login-box"><img src="/assets/icon.png" alt=""><h1>后台管理</h1>${body}</div>`;
    const go = $('#go'); if (!go) return;
    const submit = async () => {
      const pw = $('#pw').value;
      if (o.setup && pw !== $('#pw2').value) { $('#err').textContent = '两次输入的密码不一样'; return; }
      go.disabled = true;
      try {
        const r = await this.api(o.setup ? '/api/admin/setup' : '/api/admin/login', { method: 'POST', body: { password: pw } });
        this.token = r.token; try { localStorage.setItem('cf_admin', r.token); } catch (e) { /* ignore */ }
        this.enter();
      } catch (e) { $('#err').textContent = e.message; go.disabled = false; }
    };
    go.onclick = submit;
    L.querySelectorAll('input').forEach(i => i.addEventListener('keydown', e => { if (e.key === 'Enter') submit(); }));
    $('#pw').focus();
  },
  logout(expired) {
    this.token = null; try { localStorage.removeItem('cf_admin'); } catch (e) { /* ignore */ }
    this.showLogin({ error: expired ? '登录已过期，请重新登录' : '' });
  },
  async enter() {
    $('#login').classList.add('hidden'); $('#app').classList.remove('hidden');
    if (!this.catalog) this.catalog = await fetch('catalog.json').then(r => r.json()).catch(() => ({ kinds: {}, uniques: [], slots: {}, bases: {}, quality: [], statNames: {} }));
    const t = (location.hash || '').slice(1); this.go(['overview', 'tuning', 'gear', 'players', 'server'].includes(t) ? t : 'overview');
    this.refreshDot(); clearInterval(this._dot); this._dot = setInterval(() => this.refreshDot(), 15000);
  },
  async refreshDot() {
    try { const h = await fetch('/api/hello').then(r => r.json()); $('#srv-dot').className = 'dot ' + (h.maintenance ? 'maint' : 'on'); $('#srv-state').textContent = h.maintenance ? '维护中' : '开放中'; }
    catch (e) { $('#srv-dot').className = 'dot'; $('#srv-state').textContent = '连不上'; }
  },
  go(tab) {
    if (Object.keys(this.dirty).length && tab !== 'tuning' && !confirm('数值有修改还没保存，确定离开？')) return;
    if (tab !== 'tuning') this.dirty = {};
    this.tab = tab; history.replaceState(null, '', '#' + tab);
    document.querySelectorAll('#tabs button').forEach(b => b.classList.toggle('on', b.dataset.tab === tab));
    $('#main').innerHTML = '<p class="muted">加载中…</p>';
    this['page_' + tab]();
  },

  // ---------- 概览 ----------
  async page_overview() {
    const o = await this.run(() => this.api('/api/admin/overview')); if (!o) return;
    const S = o.settings;
    $('#main').innerHTML = `
      <div class="page-head"><div><h1>概览</h1><p>服务器 v${esc(o.version)} · Node ${esc(o.node)} · 端口 ${o.port}</p></div>
        <button class="btn" data-act="reload">↻ 刷新</button></div>
      <div class="cards">
        <div class="card stat"><div class="k">服务器状态</div><div class="v">${S.maintenance ? '<span style="color:var(--accent)">维护中</span>' : '<span style="color:var(--good)">开放中</span>'}</div></div>
        <div class="card stat"><div class="k">已运行</div><div class="v">${dur(o.now - o.startedAt)}</div></div>
        <div class="card stat"><div class="k">玩家总数</div><div class="v">${fmt(o.players)}<small>人</small></div></div>
        <div class="card stat"><div class="k">现在在线（2 分钟内）</div><div class="v">${fmt(o.online)}<small>人</small></div></div>
        <div class="card stat"><div class="k">24 小时内来过</div><div class="v">${fmt(o.today)}<small>人</small></div></div>
        <div class="card stat"><div class="k">封禁</div><div class="v">${fmt(o.banned)}<small>人</small></div></div>
        <div class="card stat"><div class="k">待领取的邮件</div><div class="v">${fmt(o.mailPending)}<small>封</small></div></div>
        <div class="card stat"><div class="k">存档数据</div><div class="v">${bytes(o.dataBytes)}</div></div>
      </div>
      <div class="box"><header><h2>快捷操作</h2></header><div class="body"><div class="row" style="padding:12px 0">
        ${S.maintenance ? '<button class="btn primary" data-act="open">✅ 结束维护，开放服务器</button>' : '<button class="btn" data-act="maint">🔧 进入维护</button>'}
        <button class="btn" data-go="tuning">🎛️ 调整数值</button><button class="btn" data-go="gear">🛡️ 管理装备</button><button class="btn" data-go="players">📮 给玩家发东西</button>
      </div><p class="muted" style="margin:0 0 6px">参数版本 ${o.tuningRev}：后台改了数值后，在线玩家 30 秒内自动生效，不用重新登录。</p></div></div>`;
    this.bind({
      reload: () => this.page_overview(),
      open: () => this.setSettings({ maintenance: false }, '已开放服务器').then(() => this.page_overview()),
      maint: () => this.askMaintenance().then(() => this.page_overview()),
    });
  },

  // ---------- 数值调整 ----------
  async page_tuning() {
    const t = await this.run(() => this.api('/api/admin/tuning')); if (!t) return;
    this.tuning = t;
    const shown = (it, v) => it.type === 'pct' ? +(v * 100).toFixed(4) : v;
    const unit = it => it.type === 'pct' ? '%' : it.type === 'mul' ? '倍' : (it.unit || '');
    const row = it => {
      const v = t.values[it.key], changed = t.changed.includes(it.key);
      return `<div class="param ${changed ? 'changed' : ''}" data-key="${it.key}">
        <div class="lb"><b>${esc(it.label)}</b>${it.help ? `<small>${esc(it.help)}</small>` : ''}</div>
        <div class="ctl"><input type="number" value="${shown(it, v)}" step="${it.type === 'pct' ? +(it.step * 100).toFixed(4) : it.step}" min="${shown(it, it.min)}" max="${shown(it, it.max)}" data-key="${it.key}">
          <span class="unit">${unit(it)}</span><span class="def">默认 ${shown(it, it.def)}${unit(it)}</span>
          <button class="btn sm" data-act="reset" data-key="${it.key}" ${changed ? '' : 'disabled'} title="恢复默认">↺</button></div></div>`;
    };
    $('#main').innerHTML = `
      <div class="page-head"><div><h1>数值调整</h1><p>改完点下面的「保存并生效」，在线玩家 30 秒内就会用上新数值。已改过的参数会标「已改」。</p></div>
        <input type="text" id="q" placeholder="搜索参数…" style="width:200px"></div>
      ${t.schema.map(g => `<div class="box" data-group="${g.id}"><header><h2>${esc(g.name)}</h2>${g.note ? `<div class="note">${esc(g.note)}</div>` : ''}</header><div class="body">${g.items.map(row).join('')}</div></div>`).join('')}
      <div class="savebar hidden" id="savebar"><span id="dirty-n"></span><button class="btn" data-act="undo">撤销</button><button class="btn primary" data-act="save">保存并生效</button></div>`;
    const items = {}; t.schema.forEach(g => g.items.forEach(it => { items[it.key] = it; }));
    this.dirty = {};
    const upd = () => { const n = Object.keys(this.dirty).length; $('#savebar').classList.toggle('hidden', !n); $('#dirty-n').textContent = `有 ${n} 项修改还没保存`; };
    $('#main').querySelectorAll('.param input').forEach(inp => inp.addEventListener('input', () => {
      const it = items[inp.dataset.key], raw = inp.value === '' ? null : +inp.value, v = raw == null ? null : (it.type === 'pct' ? raw / 100 : raw);
      if (v == null || Math.abs(v - t.values[it.key]) < 1e-12) delete this.dirty[it.key]; else this.dirty[it.key] = v;
      inp.closest('.param').classList.toggle('dirty', it.key in this.dirty); upd();
    }));
    $('#q').addEventListener('input', e => {
      const q = e.target.value.trim();
      $('#main').querySelectorAll('.param').forEach(p => { p.style.display = !q || p.textContent.includes(q) ? '' : 'none'; });
      $('#main').querySelectorAll('.box[data-group]').forEach(b => { b.style.display = [...b.querySelectorAll('.param')].some(p => p.style.display !== 'none') ? '' : 'none'; });
    });
    this.bind({
      undo: () => this.page_tuning(),
      save: async () => { const r = await this.run(() => this.api('/api/admin/tuning', { method: 'PUT', body: { values: this.dirty } }), '已保存，玩家 30 秒内生效'); if (r) { this.dirty = {}; this.page_tuning(); } },
      reset: async (b) => { const r = await this.run(() => this.api('/api/admin/tuning', { method: 'PUT', body: { values: { [b.dataset.key]: null } } }), '已恢复默认'); if (r) { delete this.dirty[b.dataset.key]; this.page_tuning(); } },
    });
  },

  // ---------- 装备 ----------
  gearIcon(g) {
    const c = this.catalog, id = g.icon || (g.custom ? ({ weapon: 'w', hat: 'h', armor: 'a', boots: 'b', charm: 'c' }[g.slot] + g.tier) : g.id);
    return `<span class="gicon">${icon(id, '#ff4f7b', '30px') || icon(({ weapon: 'w', hat: 'h', armor: 'a', boots: 'b', charm: 'c' }[g.slot] || 'w') + (g.tier || 1), '#ff4f7b', '30px')}</span>`;
  },
  statText(s) {
    const N = this.catalog.statNames || {};
    return Object.entries(s || {}).map(([k, v]) => `${N[k] || k}+${k === 'crit' || k === 'luck' ? Math.round(v * 100) + '%' : v}`).join(' ') || '无属性';
  },
  effText(effect, eff) {
    if (!effect) return ''; const E = (this.tuning && this.tuning.effects || {})[effect] || { name: effect };
    return `${E.name} ${E.unit === '%' ? Math.round(eff * 100) + '%' : eff + (E.unit || '')}`;
  },
  async page_gear() {
    const t = await this.run(() => this.api('/api/admin/tuning')); if (!t) return;
    this.tuning = t;
    const custom = t.gear.custom, over = t.gear.uniques || {}, slots = this.catalog.slots || {};
    const cg = g => `<div class="gcard ${g.removed ? 'off' : ''}">${this.gearIcon(g)}<div style="flex:1;min-width:0">
        <div class="nm">${esc(g.name)} ${g.removed ? '<span class="tag bad">已下架</span>' : ''}</div>
        <div class="st">${esc(slots[g.slot] || g.slot)} · ${g.tier} 阶 · ${this.statText(g.stats)}${g.effect ? ' · ✦ ' + this.effText(g.effect, g.eff) : ''}</div>
        <div class="st">掉落：宝箱 ${+(g.chest * 100).toFixed(2)}% · 战斗 ${+(g.battle * 100).toFixed(2)}%</div>
        <div class="acts"><button class="btn sm" data-act="edit" data-id="${g.id}">编辑</button>
          <button class="btn sm" data-act="send" data-id="${g.id}">发给玩家</button>
          ${g.removed ? `<button class="btn sm" data-act="restore" data-id="${g.id}">重新上架</button>` : `<button class="btn sm danger" data-act="remove" data-id="${g.id}">下架</button>`}</div></div></div>`;
    const ur = u => {
      const o = over[u.id] || {}, stats = o.stats || u.stats, eff = o.eff != null ? o.eff : u.eff, mod = !!over[u.id];
      return `<tr class="${o.disabled ? 'muted' : ''}"><td>${this.gearIcon(u)}</td><td><b>${esc(u.name)}</b><div class="muted" style="font-size:12px">${esc(u.src || '')}</div></td>
        <td>${esc(slots[u.slot] || u.slot)} · ${u.tier} 阶</td><td>${this.statText(stats)}${u.effect ? '<br><span class="muted">✦ ' + this.effText(u.effect, eff) + '</span>' : ''}</td>
        <td>${o.disabled ? '<span class="tag bad">已下架</span>' : mod ? '<span class="tag warn">已改</span>' : '<span class="tag">原样</span>'}</td>
        <td class="row"><button class="btn sm" data-act="uedit" data-id="${u.id}">修改</button><button class="btn sm" data-act="send" data-id="${u.id}">发给玩家</button></td></tr>`;
    };
    $('#main').innerHTML = `
      <div class="page-head"><div><h1>装备</h1><p>新增的装备是「隐藏装备」：属性固定、可以强化。可以设成从宝箱 / 打怪里掉，或者直接发给玩家。<br>下架的装备不会再掉落，已经拿到的玩家还留着。</p></div>
        <button class="btn primary" data-act="new">＋ 新增装备</button></div>
      <div class="box"><header><h2>自定义装备（${custom.length}）</h2></header><div class="body">${custom.length ? `<div class="gear-grid">${custom.map(cg).join('')}</div>` : '<p class="muted">还没有自定义装备，点右上角「新增装备」。</p>'}</div></div>
      <div class="box"><header><h2>游戏自带的隐藏装备（${this.catalog.uniques.length}）</h2><div class="note">可以改属性和特效数值，或者下架（下架后剧情和怪物也不会再给）。普通装备的属性在「数值调整 → 装备品质」里统一调。</div></header>
        <div class="body table-wrap"><table><thead><tr><th></th><th>名字 / 来源</th><th>部位</th><th>属性</th><th>状态</th><th></th></tr></thead><tbody>${this.catalog.uniques.map(ur).join('')}</tbody></table></div></div>`;
    this.bind({
      new: () => this.gearForm(null),
      edit: b => this.gearForm(custom.find(g => g.id === b.dataset.id)),
      remove: async b => { if (!confirm('下架后不会再掉落，已经拿到的玩家还留着。确定下架？')) return; if (await this.run(() => this.api('/api/admin/gear/remove', { method: 'POST', body: { id: b.dataset.id } }), '已下架')) this.page_gear(); },
      restore: async b => { if (await this.run(() => this.api('/api/admin/gear/restore', { method: 'POST', body: { id: b.dataset.id } }), '已重新上架')) this.page_gear(); },
      uedit: b => this.uniqueForm(this.catalog.uniques.find(u => u.id === b.dataset.id), over[b.dataset.id] || {}),
      send: b => this.sendForm([], [{ type: 'unique', id: b.dataset.id }]),
    });
  },
  statInputs(stats) {
    const N = this.catalog.statNames || {};
    return `<div class="stats">${this.STAT_KEYS.map(k => { const pct = k === 'crit' || k === 'luck', v = (stats || {})[k];
      return `<label>${esc(N[k] || k)}${pct ? '（%）' : ''}<input type="number" data-stat="${k}" value="${v == null ? '' : pct ? +(v * 100).toFixed(2) : v}" min="0" step="${pct ? 1 : 1}"></label>`; }).join('')}</div>`;
  },
  readStats(root) { const s = {}; root.querySelectorAll('[data-stat]').forEach(i => { if (i.value === '') return; const k = i.dataset.stat, v = +i.value; if (v) s[k] = k === 'crit' || k === 'luck' ? v / 100 : v; }); return s; },
  effInput(effect, eff) {
    const E = this.tuning.effects;
    return `<div class="row"><select id="f-effect">${Object.entries(E).map(([k, e]) => `<option value="${k}" ${k === (effect || '') ? 'selected' : ''}>${esc(e.name)}</option>`).join('')}</select>
      <input type="number" id="f-eff" value="${effect ? (E[effect] && E[effect].unit === '%' ? +(eff * 100).toFixed(2) : eff) : ''}" placeholder="数值" style="width:100px"><span class="muted" id="f-eff-unit"></span></div>`;
  },
  readEff() { const k = $('#f-effect').value, E = this.tuning.effects[k] || {}, v = +$('#f-eff').value || 0; return { effect: k, eff: k ? (E.unit === '%' ? v / 100 : v) : 0 }; },
  bindEffUnit() { const f = () => { const E = this.tuning.effects[$('#f-effect').value] || {}; $('#f-eff-unit').textContent = $('#f-effect').value ? (E.unit || '') : ''; $('#f-eff').disabled = !$('#f-effect').value; }; $('#f-effect').onchange = f; f(); },
  gearForm(g) {
    g = g || { name: '', slot: 'weapon', tier: 3, stats: { atk: 50 }, effect: '', eff: 0, edesc: '', src: '后台发放', icon: '', chest: 0, battle: 0 };
    const slots = this.catalog.slots || {};
    const iconChoices = () => { const p = { weapon: 'w', hat: 'h', armor: 'a', boots: 'b', charm: 'c' }[$('#f-slot').value]; return [1, 2, 3, 4, 5].map(i => p + i).concat(this.catalog.uniques.filter(u => u.slot === $('#f-slot').value).map(u => u.id)); };
    this.modal(g.id ? '编辑装备' : '新增装备', `<div class="form">
        <label>名字</label><input type="text" id="f-name" value="${esc(g.name)}" maxlength="20" placeholder="比如：彩虹鱼竿">
        <label>部位</label><select id="f-slot">${Object.entries(slots).map(([k, v]) => `<option value="${k}" ${k === g.slot ? 'selected' : ''}>${esc(v)}</option>`).join('')}</select>
        <label>等级（1~5 阶）</label><input type="number" id="f-tier" value="${g.tier}" min="1" max="5" step="1">
        <label>图标</label><div class="icons" id="f-icons"></div>
        <label>属性</label>${this.statInputs(g.stats)}
        <label>特殊效果</label>${this.effInput(g.effect, g.eff)}
        <label>效果说明</label><input type="text" id="f-edesc" value="${esc(g.edesc)}" maxlength="60" placeholder="显示在装备上，比如：18% 几率追加一次攻击">
        <label>来源说明</label><input type="text" id="f-src" value="${esc(g.src)}" maxlength="40">
        <label>宝箱掉落</label><div class="row"><input type="number" id="f-chest" value="${+(g.chest * 100).toFixed(3)}" min="0" max="100" step="0.1"><span class="muted">% · 每开一个宝箱的概率（0 = 不掉）</span></div>
        <label>战斗掉落</label><div class="row"><input type="number" id="f-battle" value="${+(g.battle * 100).toFixed(3)}" min="0" max="100" step="0.1"><span class="muted">% · 每打赢一只怪的概率</span></div>
      </div>`, `<button class="btn" data-close>取消</button><button class="btn primary" id="f-ok">${g.id ? '保存' : '新增'}</button>`);
    let pick = g.icon;
    const drawIcons = () => { const list = iconChoices(); if (!list.includes(pick)) pick = list[Math.min(4, +$('#f-tier').value - 1)] || list[0];
      $('#f-icons').innerHTML = list.map(n => `<button type="button" data-icon="${n}" class="${n === pick ? 'on' : ''}">${icon(n, '#ff4f7b', '26px')}</button>`).join('');
      $('#f-icons').querySelectorAll('button').forEach(b => b.onclick = () => { pick = b.dataset.icon; drawIcons(); }); };
    $('#f-slot').onchange = drawIcons; drawIcons(); this.bindEffUnit();
    $('#f-ok').onclick = async () => {
      const body = { id: g.id, name: $('#f-name').value, slot: $('#f-slot').value, tier: +$('#f-tier').value, stats: this.readStats($('#m-body')), ...this.readEff(),
        edesc: $('#f-edesc').value, src: $('#f-src').value, icon: pick, chest: (+$('#f-chest').value || 0) / 100, battle: (+$('#f-battle').value || 0) / 100 };
      if (await this.run(() => this.api('/api/admin/gear', { method: 'POST', body: { gear: body } }), g.id ? '已保存' : '已新增，玩家 30 秒内生效')) { this.closeModal(); this.page_gear(); }
    };
  },
  uniqueForm(u, o) {
    this.modal('修改「' + u.name + '」', `<div class="form">
        <label>属性</label>${this.statInputs(o.stats || u.stats)}
        ${u.effect ? `<label>${esc((this.tuning.effects[u.effect] || {}).name || u.effect)}</label><div class="row"><input type="number" id="u-eff" value="${(this.tuning.effects[u.effect] || {}).unit === '%' ? +((o.eff != null ? o.eff : u.eff) * 100).toFixed(2) : (o.eff != null ? o.eff : u.eff)}"><span class="muted">${esc((this.tuning.effects[u.effect] || {}).unit || '')} · 原本 ${esc(u.edesc || '')}</span></div>` : ''}
        <label>下架</label><label class="row" style="color:var(--text)"><span class="switch warn"><input type="checkbox" id="u-dis" ${o.disabled ? 'checked' : ''}><span></span></span>下架后剧情、怪物、配方都不会再给这件装备</label>
      </div>`, `<button class="btn danger" id="u-reset" style="margin-right:auto">恢复原样</button><button class="btn" data-close>取消</button><button class="btn primary" id="u-ok">保存</button>`);
    $('#u-ok').onclick = async () => {
      const E = this.tuning.effects[u.effect] || {}, ev = $('#u-eff') ? +$('#u-eff').value : null;
      const body = { id: u.id, stats: this.readStats($('#m-body')), eff: ev == null ? null : (E.unit === '%' ? ev / 100 : ev), disabled: $('#u-dis').checked };
      if (await this.run(() => this.api('/api/admin/unique', { method: 'PUT', body }), '已保存')) { this.closeModal(); this.page_gear(); }
    };
    $('#u-reset').onclick = async () => { if (await this.run(() => this.api('/api/admin/unique', { method: 'PUT', body: { id: u.id, reset: true } }), '已恢复原样')) { this.closeModal(); this.page_gear(); } };
  },

  // ---------- 玩家 ----------
  async page_players() {
    const list = await this.run(() => this.api('/api/admin/players')); if (!list) return;
    this.players = list;
    const now = Date.now();
    $('#main').innerHTML = `
      <div class="page-head"><div><h1>玩家（${list.length}）</h1><p>发出去的东西会放进玩家的邮箱，玩家在线时 1 分钟内自动领取（不在线就等他下次上线）。</p></div>
        <div class="row"><input type="text" id="q" placeholder="搜索名字…" style="width:160px"><button class="btn" data-act="sendSel" id="send-sel" disabled>给选中的人发东西</button><button class="btn primary" data-act="sendAll">给所有人发东西</button></div></div>
      <div class="box"><div class="body table-wrap"><table><thead><tr><th><input type="checkbox" id="all"></th><th>名字</th><th class="num">等级</th><th class="num">金币</th><th class="num">钓到</th><th>最近在线</th><th>注册</th><th>状态</th><th></th></tr></thead>
      <tbody>${list.map(p => { const s = p.save || {}, on = p.lastSeen && now - p.lastSeen < 120000;
        return `<tr data-name="${esc(p.name)}"><td><input type="checkbox" data-pick="${p.id}"></td><td><b>${esc(p.name)}</b> <span class="muted">#${p.id}</span>${p.mail ? ` <span class="tag warn">${p.mail} 封待领</span>` : ''}</td>
          <td class="num">${s.level || '—'}</td><td class="num">${fmt(s.coins)}</td><td class="num">${fmt(s.caught)}</td>
          <td>${on ? '<span class="tag good">在线</span>' : ago(p.lastSeen)}</td><td class="muted">${new Date(p.created).toLocaleDateString('zh-CN')}</td>
          <td>${p.banned ? `<span class="tag bad" title="${esc(p.banReason)}">已封禁</span>` : '<span class="tag">正常</span>'}</td>
          <td class="row"><button class="btn sm" data-act="send1" data-id="${p.id}">发东西</button><button class="btn sm" data-act="more" data-id="${p.id}">更多…</button></td></tr>`; }).join('') || '<tr><td colspan="9" class="muted">还没有玩家</td></tr>'}</tbody></table></div></div>`;
    const sel = () => [...$('#main').querySelectorAll('[data-pick]:checked')].map(i => i.dataset.pick);
    const upd = () => { const n = sel().length; $('#send-sel').disabled = !n; $('#send-sel').textContent = n ? `给选中的 ${n} 人发东西` : '给选中的人发东西'; };
    $('#main').querySelectorAll('[data-pick]').forEach(i => i.onchange = upd);
    $('#all').onchange = e => { $('#main').querySelectorAll('tr:not([style*="none"]) [data-pick]').forEach(i => { i.checked = e.target.checked; }); upd(); };
    $('#q').oninput = e => { const q = e.target.value.trim().toLowerCase(); $('#main').querySelectorAll('tbody tr[data-name]').forEach(r => { r.style.display = !q || r.dataset.name.toLowerCase().includes(q) ? '' : 'none'; }); };
    this.bind({
      sendSel: () => this.sendForm(sel()),
      sendAll: () => this.sendForm('all'),
      send1: b => this.sendForm([b.dataset.id]),
      more: b => this.playerForm(list.find(p => p.id === b.dataset.id)),
    });
  },
  playerForm(p) {
    const s = p.save || {};
    this.modal(`玩家「${p.name}」`, `<div class="form">
        <label>编号</label><span>#${p.id}</span>
        <label>等级 / 金币</label><span>Lv.${s.level || '—'} · 🪙${fmt(s.coins)}</span>
        <label>钓到 / 装备</label><span>${fmt(s.caught)} 条 · ${fmt(s.gear)} 件装备</span>
        <label>最近存档</label><span>${s.savedAt ? new Date(s.savedAt).toLocaleString('zh-CN') : '—'}</span>
        <label>踢下线</label><div><button class="btn sm" id="p-kick">踢下线</button> <span class="muted">他的游戏会停止同步，需要重新登录</span></div>
        <label>重置密码</label><div class="row"><input type="text" id="p-pw" placeholder="新密码（至少 6 位）"><button class="btn sm" id="p-setpw">设置</button></div>
        <label>${p.banned ? '解除封禁' : '封禁'}</label>${p.banned
          ? `<div><button class="btn sm" id="p-unban">解除封禁</button> <span class="muted">原因：${esc(p.banReason || '无')}</span></div>`
          : `<div class="row"><input type="text" id="p-reason" placeholder="封禁原因（会告诉玩家）"><button class="btn sm danger" id="p-ban">封禁</button></div>`}
      </div>`, '<button class="btn" data-close>关闭</button>');
    const act = async (action, extra, msg) => { if (await this.run(() => this.api('/api/admin/player', { method: 'POST', body: Object.assign({ id: p.id, action }, extra) }), msg)) { this.closeModal(); this.page_players(); } };
    $('#p-kick').onclick = () => act('kick', {}, '已踢下线');
    $('#p-setpw').onclick = () => act('password', { password: $('#p-pw').value }, '密码已重置，记得告诉玩家');
    if ($('#p-ban')) $('#p-ban').onclick = () => confirm(`确定封禁「${p.name}」？`) && act('ban', { reason: $('#p-reason').value }, '已封禁');
    if ($('#p-unban')) $('#p-unban').onclick = () => act('unban', {}, '已解除封禁');
  },

  // ---------- 发东西 ----------
  TYPES: { coins: '🪙 金币', gear: '⚔️ 普通装备', unique: '✨ 隐藏/自定义装备', bait: '🪱 鱼饵', item: '🔔 道具', treasure: '🗝️ 宝藏', mat: '🧱 素材', dish: '🍱 料理' },
  async sendForm(to, preset) {
    if (!this.tuning) this.tuning = await this.run(() => this.api('/api/admin/tuning'));
    const who = to === 'all' ? '所有玩家' : to.length ? (to.length === 1 ? `「${(this.players.find(p => p.id === to[0]) || { name: '#' + to[0] }).name}」` : `选中的 ${to.length} 个玩家`) : null;
    this.modal('发东西给' + (who || '…'), `
      ${who ? '' : `<div class="form" style="margin-bottom:12px"><label>发给</label><select id="s-to"><option value="all">所有玩家</option>${(this.players.length ? this.players : await this.run(() => this.api('/api/admin/players')) || []).map(p => `<option value="${p.id}">${esc(p.name)}</option>`).join('')}</select></div>`}
      <div class="items" id="s-items"></div><button class="btn sm" id="s-add">＋ 再加一样</button>
      <div class="form" style="margin-top:14px"><label>留言</label><input type="text" id="s-note" maxlength="100" placeholder="玩家领取时会看到，比如：维护补偿"></div>`,
      `<button class="btn" data-close>取消</button><button class="btn primary" id="s-ok">发送</button>`);
    const rows = $('#s-items');
    const add = it => {
      it = it || { type: 'coins', n: 1000 };
      const div = document.createElement('div'); div.className = 'item';
      div.innerHTML = `<select class="t">${Object.entries(this.TYPES).map(([k, v]) => `<option value="${k}" ${k === it.type ? 'selected' : ''}>${v}</option>`).join('')}</select><div class="f"></div><button class="btn sm danger" title="删掉这一样">✕</button>`;
      const f = div.querySelector('.f');
      const draw = (t, v) => {
        v = v || {};
        const C = this.catalog, slots = C.slots || {};
        if (t === 'coins') f.innerHTML = `<input type="number" class="n" value="${v.n || 1000}" min="1" step="100" placeholder="数量">`;
        else if (t === 'gear') f.innerHTML = `<select class="slot">${Object.entries(slots).map(([k, s]) => `<option value="${k}">${esc(s)}</option>`).join('')}</select><select class="tier">${[1, 2, 3, 4, 5].map(i => `<option value="${i}">${i} 阶</option>`).join('')}</select><select class="q">${(C.quality || []).map((q, i) => `<option value="${i}">${esc(q.name)}</option>`).join('')}</select><input type="number" class="n" value="1" min="1" max="20" title="件数">`;
        else if (t === 'unique') {
          const all = (this.tuning.gear.custom || []).map(g => [g.id, g.name + '（自定义）']).concat(C.uniques.map(u => [u.id, u.name]));
          f.innerHTML = `<select class="id">${all.map(([id, n]) => `<option value="${id}" ${id === v.id ? 'selected' : ''}>${esc(n)}</option>`).join('')}</select>`;
        } else {
          const list = (C.kinds || {})[t] || [];
          f.innerHTML = `<input type="text" class="id" list="dl-${t}" value="${esc(v.id || (list[0] && list[0].id) || '')}" placeholder="编号"><datalist id="dl-${t}">${list.map(x => `<option value="${x.id}">${esc(x.name)}</option>`).join('')}</datalist><input type="number" class="n" value="${v.n || 1}" min="1">`;
          const nm = document.createElement('span'); nm.className = 'muted'; nm.style.flex = '0 0 auto'; f.appendChild(nm);
          const show = () => { const x = list.find(y => y.id === f.querySelector('.id').value); nm.textContent = x ? x.name : '（编号不在列表里）'; };
          f.querySelector('.id').oninput = show; show();
        }
      };
      div.querySelector('.t').onchange = e => draw(e.target.value);
      div.querySelector('button').onclick = () => div.remove();
      draw(it.type, it); rows.appendChild(div);
    };
    (preset && preset.length ? preset : [null]).forEach(add);
    $('#s-add').onclick = () => add();
    $('#s-ok').onclick = async () => {
      const items = [...rows.querySelectorAll('.item')].map(r => {
        const t = r.querySelector('.t').value, g = c => r.querySelector('.' + c);
        if (t === 'coins') return { type: t, n: +g('n').value };
        if (t === 'gear') return { type: t, slot: g('slot').value, tier: +g('tier').value, q: +g('q').value, n: +g('n').value };
        if (t === 'unique') return { type: t, id: g('id').value };
        return { type: t, id: g('id').value.trim(), n: +g('n').value };
      });
      const dest = who ? to : ($('#s-to').value === 'all' ? 'all' : [$('#s-to').value]);
      if (dest === 'all' && !confirm('确定发给所有玩家？')) return;
      const r = await this.run(() => this.api('/api/admin/mail', { method: 'POST', body: { to: dest, items, note: $('#s-note').value } }));
      if (r) { this.toast(`已发给 ${r.sent} 个玩家，在线的 1 分钟内会收到`); this.closeModal(); if (this.tab === 'players') this.page_players(); }
    };
  },

  // ---------- 服务器 ----------
  async setSettings(body, msg) { const r = await this.run(() => this.api('/api/admin/settings', { method: 'PUT', body }), msg); this.refreshDot(); return r; },
  askMaintenance() {
    return new Promise(done => {
      this.modal('进入维护', `<p class="muted" style="margin-top:0">维护期间玩家不能登录；已经在玩的玩家会先自动存档，然后看到维护提示，维护结束后自动刷新回来。</p>
        <div class="form"><label>维护公告</label><input type="text" id="mm" maxlength="200" value="服务器正在维护，请稍后再来～"></div>`,
        `<button class="btn" data-close>取消</button><button class="btn primary" id="mm-ok">开始维护</button>`);
      $('#mm-ok').onclick = async () => { await this.setSettings({ maintenance: true, maintenanceMsg: $('#mm').value }, '已进入维护'); this.closeModal(); done(); };
    });
  },
  async page_server() {
    const o = await this.run(() => this.api('/api/admin/overview')); if (!o) return;
    const S = o.settings;
    $('#main').innerHTML = `
      <div class="page-head"><div><h1>服务器</h1><p>这里的开关改完立刻生效，重启后也会记住。</p></div></div>
      <div class="box"><header><h2>开放 / 维护</h2></header><div class="body">
        <div class="setting"><div class="lb"><b>对玩家开放</b><small>${S.maintenance ? '现在是维护中：玩家不能登录，在线的玩家看到维护提示' : '现在是开放中：玩家可以正常登录游戏'}</small></div>
          <label class="switch"><input type="checkbox" id="s-open" ${S.maintenance ? '' : 'checked'}><span></span></label></div>
        <div class="setting"><div class="lb"><b>维护公告</b><small>维护时玩家看到的文字</small></div><input type="text" id="s-msg" value="${esc(S.maintenanceMsg)}" style="width:320px"><button class="btn sm" id="s-msg-save">保存</button></div>
        <div class="setting"><div class="lb"><b>开放注册</b><small>关掉后新玩家不能注册，老玩家可以正常登录</small></div><label class="switch"><input type="checkbox" id="s-reg" ${S.allowRegister ? 'checked' : ''}><span></span></label></div>
        <div class="setting"><div class="lb"><b>游戏里的作弊按钮</b><small>右上角的 🧪 测试面板。正式给别人玩时建议关掉（玩家 30 秒内生效）</small></div><label class="switch warn"><input type="checkbox" id="s-cheat" ${S.devCheats ? 'checked' : ''}><span></span></label></div>
      </div></div>
      <div class="box"><header><h2>重启 / 关闭</h2><div class="note">「重启」需要服务器是用「启动服务器.command」启动的（它会自动再启动一次）。关闭以后，后台也会打不开，要再双击「启动服务器.command」才能开启。</div></header><div class="body">
        <div class="row" style="padding:12px 0"><button class="btn" id="s-restart">↻ 重启服务器</button><button class="btn danger" id="s-stop">⏻ 关闭服务器</button></div>
        <p class="muted" style="margin:0 0 6px">已运行 ${dur(o.now - o.startedAt)} · 重启/关闭前会先把所有数据写进硬盘。在线玩家的游戏会在服务器回来后继续同步。</p></div></div>
      <div class="box"><header><h2>管理员密码</h2></header><div class="body"><div class="row" style="padding:12px 0">
        <input type="password" id="a-old" placeholder="旧密码"><input type="password" id="a-new" placeholder="新密码（至少 6 位）"><button class="btn" id="a-ok">修改</button></div></div></div>`;
    $('#s-open').onchange = async e => { if (e.target.checked) await this.setSettings({ maintenance: false }, '已开放服务器'); else await this.askMaintenance(); this.page_server(); };
    $('#s-msg-save').onclick = () => this.setSettings({ maintenanceMsg: $('#s-msg').value }, '已保存');
    $('#s-reg').onchange = e => this.setSettings({ allowRegister: e.target.checked }, e.target.checked ? '已开放注册' : '已关闭注册');
    $('#s-cheat').onchange = e => this.setSettings({ devCheats: e.target.checked }, e.target.checked ? '已打开作弊按钮' : '已关闭作弊按钮');
    $('#s-restart').onclick = () => this.serverAction('restart');
    $('#s-stop').onclick = () => this.serverAction('stop');
    $('#a-ok').onclick = async () => { const r = await this.run(() => this.api('/api/admin/password', { method: 'POST', body: { old: $('#a-old').value, password: $('#a-new').value } }), '管理员密码已修改'); if (r) { this.token = r.token; try { localStorage.setItem('cf_admin', r.token); } catch (e) { /* ignore */ } } };
  },
  async serverAction(action) {
    if (!confirm(action === 'restart' ? '确定重启服务器？大约几秒钟后恢复。' : '确定关闭服务器？关闭后要在电脑上双击「启动服务器.command」才能重新开启。')) return;
    if (!(await this.run(() => this.api('/api/admin/server', { method: 'POST', body: { action } })))) return;
    $('#main').innerHTML = `<div class="box"><div class="body" style="padding:30px;text-align:center"><h2>${action === 'restart' ? '正在重启…' : '服务器已关闭'}</h2><p class="muted" id="wait">${action === 'restart' ? '服务器回来后这里会自动刷新' : '要重新开启，请在电脑上双击「启动服务器.command」。'}</p></div></div>`;
    if (action !== 'restart') return;
    const t0 = Date.now(); await new Promise(r => setTimeout(r, 1500));
    const tick = async () => { try { await fetch('/api/hello').then(r => { if (!r.ok) throw 0; }); location.reload(); } catch (e) { if (Date.now() - t0 > 30000) $('#wait').textContent = '30 秒还没回来：可能服务器不是用「启动服务器.command」启动的，请到电脑上手动启动。'; else setTimeout(tick, 1000); } };
    tick();
  },

  // ---------- 小工具 ----------
  bind(map) { $('#main').querySelectorAll('[data-act]').forEach(b => { const f = map[b.dataset.act]; if (f) b.onclick = () => f(b); }); $('#main').querySelectorAll('[data-go]').forEach(b => b.onclick = () => this.go(b.dataset.go)); },
  modal(title, body, foot) { $('#m-title').textContent = title; $('#m-body').innerHTML = body; $('#m-foot').innerHTML = foot || ''; $('#modal').classList.remove('hidden'); $('#modal').querySelectorAll('[data-close]').forEach(b => b.onclick = () => this.closeModal()); },
  closeModal() { $('#modal').classList.add('hidden'); },
};

document.querySelectorAll('#tabs button').forEach(b => b.onclick = () => A.go(b.dataset.tab));
$('#logout').onclick = () => A.logout();
$('#modal').addEventListener('mousedown', e => { if (e.target.id === 'modal') A.closeModal(); });
document.addEventListener('keydown', e => { if (e.key === 'Escape') A.closeModal(); });
window.addEventListener('beforeunload', e => { if (Object.keys(A.dirty).length) { e.preventDefault(); e.returnValue = ''; } });
A.start();
