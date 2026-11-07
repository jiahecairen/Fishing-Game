// ===== 账号：登录 / 注册 / 云存档 =====
// 这个模块把内核的「存档读写」换成服务器云存档（CF.useStorage）。关掉这个模块，游戏就回到单机模式。
// 流程：启动 → 有令牌就自动登录，没有就显示登录界面 → 下载存档 → 开始游戏 → 每 15 秒把存档传回服务器
'use strict';

const Account = {
  user: null,
  rev: 0,
  pending: null,       // 还没上传的最新存档（JSON 字符串）
  uploading: false,
  stopped: false,      // 被顶下线 / 冲突后停止同步
  lastUpload: 0,
  TOKEN_KEY: 'cf_token',

  // ---------- 本机记住的令牌 ----------
  savedToken() { try { return localStorage.getItem(this.TOKEN_KEY); } catch (e) { return null; } },
  remember(t) { try { if (t) localStorage.setItem(this.TOKEN_KEY, t); else localStorage.removeItem(this.TOKEN_KEY); } catch (e) { /* ignore */ } },

  // ---------- 旧的本地存档（v0.4 之前的单机版），可以导入到账号里 ----------
  legacySave() {
    try {
      if (window.__NATIVE_SAVE_B64__) {
        const bin = atob(window.__NATIVE_SAVE_B64__);
        return new TextDecoder().decode(Uint8Array.from(bin, c => c.charCodeAt(0)));
      }
    } catch (e) { /* ignore */ }
    try { return localStorage.getItem('catfish_save_v1'); } catch (e) { return null; }
  },
  legacyDone() {
    try { localStorage.removeItem('catfish_save_v1'); } catch (e) { /* ignore */ }
    try { if (window.webkit && window.webkit.messageHandlers && window.webkit.messageHandlers.legacy) window.webkit.messageHandlers.legacy.postMessage('imported'); } catch (e) { /* ignore */ }
    window.__NATIVE_SAVE_B64__ = null;
  },

  // ---------- 内核存档适配器 ----------
  storage: {
    async load() { return Account.boot(); },
    save(json) { Account.pending = json; if (Date.now() - Account.lastUpload > 15000) Account.upload(); },
    flush(final) { Account.upload(final); },
    clear() { /* 重置时：下一次保存会覆盖服务器上的存档 */ },
  },

  async boot() {
    try { CF.serverInfo = await CF.net.api('/api/hello'); }
    catch (e) { await this.showOffline(); return this.boot(); }
    const tok = this.savedToken();
    if (tok) {
      CF.net.token = tok;
      try { const r = await CF.net.api('/api/auth/me'); this.user = r.user; } catch (e) { CF.net.token = null; this.remember(null); }
    }
    if (!this.user) await this.showLogin();
    return this.fetchSave();
  },
  async fetchSave() {
    const r = await CF.net.api('/api/save');
    this.rev = r.rev || 0;
    let raw = r.data, away = r.savedAt ? Math.max(0, (r.now - r.savedAt) / 1000) : null;
    if (!raw) {
      const legacy = this.legacySave();
      if (legacy && await this.ask('发现这台电脑上有旧版本的存档', '要把它导入到账号「' + this.user.name + '」吗？导入后存档会保存在服务器上，换电脑也能继续玩。', '导入旧存档', '从头开始')) {
        raw = legacy; away = null; this.legacyDone();
      }
    }
    this.hideOverlay();
    this.lastUpload = Date.now();
    setInterval(() => { if (this.pending && Date.now() - this.lastUpload > 15000) this.upload(); }, 3000);
    return { raw, away };
  },
  async upload(final) {
    if (this.stopped || !this.pending || !CF.net.token) return;
    if (final) {
      // 页面正在关闭：用 sendBeacon（不等结果，令牌放在内容里）
      const body = `{"token":${JSON.stringify(CF.net.token)},"rev":${this.rev},"data":${this.pending}}`;
      try { if (navigator.sendBeacon && navigator.sendBeacon(CF.net.url('/api/save/beacon'), new Blob([body], { type: 'text/plain' }))) { this.pending = null; this.rev++; return; } } catch (e) { /* ignore */ }
    }
    if (this.uploading) return; // 正在传，等下一轮
    const json = this.pending; this.pending = null; this.lastUpload = Date.now(); this.uploading = true;
    try {
      const r = await CF.net.api('/api/save', { method: 'PUT', body: { data: JSON.parse(json), rev: this.rev }, keepalive: !!final && json.length < 60000 });
      this.rev = r.rev; this.setSync('ok');
    } catch (e) {
      if (e.status === 409) { this.stopped = true; this.showKicked(e.code === 'kicked' ? '这个账号在别的地方登录了' : '存档在别的设备上更新过了'); }
      else if (e.status === 401) { this.stopped = true; this.showKicked('登录已过期，请重新登录'); }
      else { if (!this.pending) this.pending = json; this.setSync('err'); }
    }
    this.uploading = false;
  },
  // Mac App 退出时调用：返回要上传的内容，由原生代码同步发出去
  flushForNative() {
    Game.save();
    if (this.stopped || !this.pending || !CF.net.token) return '';
    const body = `{"rev":${this.rev},"data":${this.pending}}`;
    this.pending = null;
    return JSON.stringify({ url: new URL(CF.net.url('/api/save'), location.href).href, token: CF.net.token, body });
  },
  async logout() {
    Game.save(); await this.upload();
    try { await CF.net.api('/api/auth/logout', { method: 'POST', body: {} }); } catch (e) { /* ignore */ }
    this.remember(null); location.reload();
  },
  setSync(s) { const el = $('#acct-sync'); if (el) { el.textContent = s === 'ok' ? '☁️' : '⚠️'; el.title = s === 'ok' ? '已同步到服务器' : '上传失败，稍后重试'; } },

  // ---------- 界面 ----------
  overlay(html) {
    const boot = $('#boot'); if (boot) boot.remove();
    let el = $('#account');
    if (!el) { el = document.createElement('div'); el.id = 'account'; document.body.appendChild(el); }
    el.innerHTML = `<div class="ac-box"><div class="ac-logo">${sprImg('hero', 6)}</div><div class="ac-title">小猫钓鱼</div>${html}</div>`;
    el.classList.remove('hidden');
    return el;
  },
  hideOverlay() { const el = $('#account'); if (el) el.remove(); },
  showLogin() {
    return new Promise(done => {
      let mode = 'login';
      const allowReg = !CF.serverInfo || CF.serverInfo.allowRegister !== false;
      const draw = msg => {
        const el = this.overlay(`
          <div class="ac-tabs"><button data-m="login" class="${mode === 'login' ? 'on' : ''}">登录</button>${allowReg ? `<button data-m="register" class="${mode === 'register' ? 'on' : ''}">注册</button>` : ''}</div>
          <form class="ac-form" autocomplete="on">
            <label>用户名<input name="username" maxlength="16" autocomplete="username" placeholder="2~16 个字"></label>
            <label>密码<input name="password" type="password" maxlength="64" autocomplete="${mode === 'login' ? 'current-password' : 'new-password'}" placeholder="至少 6 位"></label>
            ${mode === 'register' ? '<label>再输一次密码<input name="password2" type="password" maxlength="64" autocomplete="new-password"></label>' : ''}
            <div class="ac-msg ${msg && msg.ok ? 'ok' : ''}">${msg ? escapeHTML(msg.text || msg) : ''}</div>
            <button type="submit" class="ac-go">${mode === 'login' ? '▶ 登录' : '✦ 注册并开始'}</button>
          </form>
          <div class="ac-foot">服务器：${escapeHTML(CF.net.base || location.host || '本机')} · v${CF.version}</div>`);
        el.querySelectorAll('.ac-tabs button').forEach(b => b.onclick = () => { mode = b.dataset.m; draw(); });
        const f = el.querySelector('form');
        f.username.focus();
        f.onsubmit = async e => {
          e.preventDefault();
          const username = f.username.value.trim(), password = f.password.value;
          if (mode === 'register' && password !== f.password2.value) { draw('两次输入的密码不一样'); return; }
          f.querySelector('.ac-go').disabled = true;
          try {
            const r = await CF.net.api('/api/auth/' + mode, { method: 'POST', body: { username, password } });
            CF.net.token = r.token; this.remember(r.token); this.user = r.user;
            done();
          } catch (err) { draw(err.message); const f2 = $('#account form'); if (f2) f2.username.value = username; }
        };
      };
      draw();
    });
  },
  showOffline() {
    return new Promise(done => {
      const el = this.overlay(`<div class="ac-msg">😿 连不上游戏服务器</div>
        <div class="ac-help">请先启动服务器：双击游戏文件夹里的「启动服务器.command」，<br>看到「服务器已启动」之后再点重试。</div>
        <button class="ac-go">↻ 重试</button><div class="ac-foot">服务器：${escapeHTML(CF.net.base || location.host || '本机')}</div>`);
      el.querySelector('.ac-go').onclick = () => done();
    });
  },
  ask(title, text, yes, no) {
    return new Promise(done => {
      const el = this.overlay(`<div class="ac-msg ok">${escapeHTML(title)}</div><div class="ac-help">${escapeHTML(text)}</div>
        <div class="ac-row"><button class="ac-go" data-v="1">${escapeHTML(yes)}</button><button class="ac-go ghost" data-v="0">${escapeHTML(no)}</button></div>`);
      el.querySelectorAll('[data-v]').forEach(b => b.onclick = () => done(b.dataset.v === '1'));
    });
  },
  showKicked(msg) {
    const el = this.overlay(`<div class="ac-msg">${escapeHTML(msg)}</div><div class="ac-help">为了不弄乱存档，这里已经停止同步。重新载入就能拿到最新的存档。</div><button class="ac-go">↻ 重新载入</button>`);
    el.querySelector('.ac-go').onclick = () => location.reload();
  },
};

CF.module({
  id: 'account',
  init() {
    CF.useStorage(Account.storage);
    window.__cfFlushSync = () => Account.flushForNative();
    UI.setting(1, () => `<div class="set-row"><div>账号「${escapeHTML(Account.user ? Account.user.name : '')}」<small>存档保存在服务器上，每 15 秒自动同步，换电脑登录同一个账号就能继续玩</small></div><button class="btn sm" data-act="logout">退出登录</button></div>`);
    UI.action('logout', () => Account.logout());
  },
  start() {
    const pill = document.createElement('div');
    pill.className = 'pill acct-pill'; pill.innerHTML = '<span id="acct-name"></span><span id="acct-sync" title="云存档">☁️</span>';
    $('.hud-left').appendChild(pill);
    UI.set('acct-name', '🐱 ' + (Account.user ? Account.user.name : ''));
  },
});
