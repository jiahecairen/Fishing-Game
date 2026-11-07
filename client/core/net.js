// ===== 内核 · 网络 =====
// 所有和服务器的通信都走这里。登录后的令牌保存在 CF.net.token，请求时自动带上。
'use strict';

CF.net = {
  base: '',     // 服务器地址，默认和页面同源（页面就是服务器发的）
  token: null,
  init() {
    const c = window.CF_CONFIG || {};
    this.base = (c.server || '').replace(/\/$/, '');
  },
  url(path) { return this.base + path; },
  async api(path, opt) {
    opt = opt || {};
    const headers = { 'Content-Type': 'application/json' };
    if (this.token) headers.Authorization = 'Bearer ' + this.token;
    let res;
    try {
      res = await fetch(this.url(path), { method: opt.method || (opt.body ? 'POST' : 'GET'), headers, body: opt.body ? JSON.stringify(opt.body) : undefined, keepalive: !!opt.keepalive });
    } catch (e) {
      const err = new Error('连不上服务器'); err.offline = true; throw err;
    }
    let data = null; try { data = await res.json(); } catch (e) { data = null; }
    if (!res.ok) {
      const err = new Error((data && data.error) || `服务器错误（${res.status}）`);
      err.status = res.status; err.code = data && data.code; err.data = data; throw err;
    }
    return data;
  },
};
