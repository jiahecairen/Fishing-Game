// ===== 账号：注册、登录、登出 =====
// 密码用 scrypt 加盐哈希保存，服务器不保存明文密码。
// 登录成功会发一个「令牌」，客户端之后每个请求都带上它（Authorization: Bearer 令牌）。
// 同一个账号在别处登录后，旧的设备会被「顶下线」（存档时会收到 409 kicked）。
'use strict';
const crypto = require('crypto');
const { httpError } = require('../core/http');

const NAME_RE = /^[\p{L}\p{N}_]{2,16}$/u;
const hashToken = t => crypto.createHash('sha256').update(t).digest('hex');
const scrypt = (pw, salt) => new Promise((ok, no) => crypto.scrypt(pw, salt, 64, { N: 16384, r: 8, p: 1 }, (e, k) => e ? no(e) : ok(k.toString('hex'))));

// 简单的频率限制：同一个 IP 10 分钟内最多尝试 30 次
const tries = new Map();
function limit(ip) {
  const now = Date.now(), r = tries.get(ip) || { n: 0, t: now };
  if (now - r.t > 10 * 60 * 1000) { r.n = 0; r.t = now; }
  r.n++; tries.set(ip, r);
  if (r.n > 30) throw httpError(429, '尝试次数太多了，过一会儿再试');
}

module.exports = {
  name: '账号',
  init(app, ctx) {
    const { store, config } = ctx;
    const users = store.table('users', () => ({ nextId: 1, byName: {}, list: {} }));
    const sessions = store.table('sessions', () => ({}));
    const publicUser = u => ({ id: u.id, name: u.name, created: u.created });

    // 每个 API 请求之前：如果带了令牌，就找到对应的玩家
    app.before(async req => {
      const h = req.headers.authorization || '';
      const tok = h.startsWith('Bearer ') ? h.slice(7) : (req.body && req.body.token) || null;
      if (!tok) return;
      const s = sessions[hashToken(tok)];
      if (!s || s.expires < Date.now()) return;
      const u = users.list[s.uid]; if (!u) return;
      req.user = u; req.session = s;
    });
    // 给别的模块用：要求已登录
    ctx.requireUser = req => { if (!req.user) throw httpError(401, '请先登录', 'auth'); return req.user; };

    function newSession(u) {
      const token = crypto.randomBytes(32).toString('base64url');
      const sid = crypto.randomBytes(8).toString('hex');
      const now = Date.now();
      sessions[hashToken(token)] = { uid: u.id, sid, created: now, expires: now + config.sessionDays * 86400000 };
      u.activeSession = sid; u.lastLogin = now;
      // 清理过期的会话
      for (const [k, s] of Object.entries(sessions)) if (s.expires < now) delete sessions[k];
      store.touch('sessions'); store.touch('users');
      return { token, user: publicUser(u) };
    }

    app.post('/api/auth/register', async req => {
      limit(req.ip);
      if (config.allowRegister === false) throw httpError(403, '服务器暂时不开放注册');
      const name = String(req.body.username || '').trim(), pw = String(req.body.password || '');
      if (!NAME_RE.test(name)) throw httpError(400, '用户名要 2~16 个字，只能用文字、数字和下划线');
      if (pw.length < 6 || pw.length > 64) throw httpError(400, '密码要 6~64 位');
      const key = name.toLowerCase();
      if (users.byName[key]) throw httpError(409, '这个名字已经被注册了', 'taken');
      const salt = crypto.randomBytes(16).toString('hex');
      const u = { id: String(users.nextId++), name, salt, hash: await scrypt(pw, salt), created: Date.now() };
      users.list[u.id] = u; users.byName[key] = u.id;
      ctx.log.info(`新玩家注册：${name}（#${u.id}）`);
      return newSession(u);
    });

    app.post('/api/auth/login', async req => {
      limit(req.ip);
      const name = String(req.body.username || '').trim(), pw = String(req.body.password || '');
      const u = users.list[users.byName[name.toLowerCase()]];
      const bad = () => httpError(401, '用户名或密码不对');
      if (!u) { await scrypt(pw, 'x'); throw bad(); } // 防止通过耗时判断用户名是否存在
      const h = await scrypt(pw, u.salt);
      if (!crypto.timingSafeEqual(Buffer.from(h, 'hex'), Buffer.from(u.hash, 'hex'))) throw bad();
      return newSession(u);
    });

    app.get('/api/auth/me', req => ({ user: publicUser(ctx.requireUser(req)) }));

    app.post('/api/auth/logout', req => {
      const h = req.headers.authorization || '';
      if (h.startsWith('Bearer ')) { delete sessions[hashToken(h.slice(7))]; store.touch('sessions'); }
      return { ok: true };
    });

    app.post('/api/auth/password', async req => {
      const u = ctx.requireUser(req);
      const old = String(req.body.old || ''), pw = String(req.body.password || '');
      const h = await scrypt(old, u.salt);
      if (!crypto.timingSafeEqual(Buffer.from(h, 'hex'), Buffer.from(u.hash, 'hex'))) throw httpError(401, '旧密码不对');
      if (pw.length < 6 || pw.length > 64) throw httpError(400, '新密码要 6~64 位');
      u.salt = crypto.randomBytes(16).toString('hex'); u.hash = await scrypt(pw, u.salt);
      store.touch('users');
      return { ok: true };
    });
  },
};
