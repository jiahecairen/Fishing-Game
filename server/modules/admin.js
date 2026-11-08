// ===== 后台管理 =====
// 页面：http://localhost:28787/admin/（文件在 server/admin/）
// 管理员只有一个密码（和玩家账号分开）。第一次打开后台时设置，只能在运行服务器的这台电脑上设置。
// 请求时带上 Authorization: Admin <令牌>。
//   GET  /api/admin/state            要不要先设置密码
//   POST /api/admin/setup            第一次设置密码（只限本机）
//   POST /api/admin/login            登录 → 令牌
//   POST /api/admin/password         改密码
//   GET  /api/admin/overview         概览：玩家数、在线、存档大小、运行时间、当前设置
//   PUT  /api/admin/settings         开放 / 维护、维护公告、开放注册、作弊按钮
//   POST /api/admin/server           { action: 'restart' | 'stop' }
//   GET  /api/admin/players          玩家列表（带存档摘要）
//   POST /api/admin/player           { id, action: 'ban' | 'unban' | 'kick' | 'password', ... }
'use strict';
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { httpError } = require('../core/http');

const isLocal = ip => /^(127\.|::1$|::ffff:127\.)/.test(ip || '');
const hashToken = t => crypto.createHash('sha256').update(t).digest('hex');

module.exports = {
  name: '后台管理',
  init(app, ctx) {
    const { store, log } = ctx;
    const A = store.table('admin', () => ({ salt: null, hash: null, sessions: {} }));
    A.sessions = A.sessions || {};
    const tries = new Map();
    const limit = ip => {
      const now = Date.now(), r = tries.get(ip) || { n: 0, t: now };
      if (now - r.t > 10 * 60 * 1000) { r.n = 0; r.t = now; }
      r.n++; tries.set(ip, r);
      if (r.n > 20) throw httpError(429, '尝试次数太多了，10 分钟后再试');
    };
    const scrypt = (pw, salt) => new Promise((ok, no) => crypto.scrypt(pw, salt, 64, (e, k) => e ? no(e) : ok(k.toString('hex'))));
    const check = async pw => !!A.hash && crypto.timingSafeEqual(Buffer.from(await scrypt(String(pw || ''), A.salt), 'hex'), Buffer.from(A.hash, 'hex'));
    const newToken = () => {
      const t = crypto.randomBytes(32).toString('base64url'), now = Date.now();
      for (const [k, v] of Object.entries(A.sessions)) if (v < now) delete A.sessions[k];
      A.sessions[hashToken(t)] = now + 7 * 86400000; store.touch('admin');
      return t;
    };
    const setPw = async pw => {
      pw = String(pw || '');
      if (pw.length < 6) throw httpError(400, '密码至少 6 位');
      A.salt = crypto.randomBytes(16).toString('hex'); A.hash = await scrypt(pw, A.salt); A.sessions = {}; store.touch('admin');
    };
    // 给其他模块用：要求是管理员
    ctx.requireAdmin = req => {
      const h = req.headers.authorization || '';
      const t = h.startsWith('Admin ') ? h.slice(6) : null;
      const exp = t && A.sessions[hashToken(t)];
      if (!exp || exp < Date.now()) throw httpError(401, '请先登录后台', 'admin');
      return true;
    };

    app.get('/api/admin/state', req => ({ needSetup: !A.hash, local: isLocal(req.ip) }));
    app.post('/api/admin/setup', async req => {
      if (A.hash) throw httpError(409, '已经设置过管理员密码了');
      if (!isLocal(req.ip)) throw httpError(403, '第一次设置管理员密码只能在运行服务器的这台电脑上进行');
      await setPw(req.body.password);
      log.info('已设置后台管理员密码');
      return { token: newToken() };
    });
    app.post('/api/admin/login', async req => {
      limit(req.ip);
      if (!A.hash) throw httpError(409, '还没有设置管理员密码', 'setup');
      if (!(await check(req.body.password))) throw httpError(401, '密码不对');
      return { token: newToken() };
    });
    app.post('/api/admin/password', async req => {
      ctx.requireAdmin(req);
      if (!(await check(req.body.old))) throw httpError(401, '旧密码不对');
      await setPw(req.body.password);
      return { token: newToken() };
    });

    // ---------- 概览 ----------
    const dirSize = dir => { let n = 0; try { for (const f of fs.readdirSync(dir)) { const st = fs.statSync(path.join(dir, f)); n += st.isDirectory() ? dirSize(path.join(dir, f)) : st.size; } } catch (e) { /* ignore */ } return n; };
    app.get('/api/admin/overview', req => {
      ctx.requireAdmin(req);
      const list = Object.values(ctx.users.list), now = Date.now();
      return {
        version: ctx.version, startedAt: ctx.startedAt, now, node: process.version, port: ctx.config.port,
        players: list.length,
        online: list.filter(u => u.lastSeen && now - u.lastSeen < 2 * 60000).length,
        today: list.filter(u => u.lastSeen && now - u.lastSeen < 86400000).length,
        banned: list.filter(u => u.banned).length,
        dataBytes: dirSize(ctx.config.dataDir),
        settings: ctx.settings,
        tuningRev: ctx.tuningRev ? ctx.tuningRev() : 0,
        mailPending: ctx.mailPending ? ctx.mailPending() : 0,
      };
    });

    // ---------- 服务器开关 ----------
    app.put('/api/admin/settings', req => {
      ctx.requireAdmin(req);
      const b = req.body, S = ctx.settings;
      if ('maintenance' in b) S.maintenance = !!b.maintenance;
      if ('maintenanceMsg' in b) S.maintenanceMsg = String(b.maintenanceMsg || '').slice(0, 200);
      if ('allowRegister' in b) S.allowRegister = !!b.allowRegister;
      if ('devCheats' in b) S.devCheats = !!b.devCheats;
      ctx.saveSettings();
      log.info(`后台修改设置：${S.maintenance ? '维护中' : '开放'}，注册${S.allowRegister ? '开' : '关'}，作弊按钮${S.devCheats ? '开' : '关'}`);
      return { settings: S };
    });
    app.post('/api/admin/server', (req, res) => {
      ctx.requireAdmin(req);
      const a = req.body.action;
      if (a !== 'restart' && a !== 'stop') throw httpError(400, '不认识的操作');
      ctx.exit(a === 'restart' ? 42 : 0);
      return { ok: true, action: a };
    });

    // ---------- 玩家 ----------
    const summary = uid => {
      const rec = store.readSave(uid); if (!rec || !rec.data) return null;
      const S = rec.data;
      return { coins: S.coins, level: S.level, scene: S.scene, caught: S.stats && S.stats.caught, gear: (S.gear || []).length, savedAt: rec.savedAt, rev: rec.rev };
    };
    app.get('/api/admin/players', req => {
      ctx.requireAdmin(req);
      return Object.values(ctx.users.list).map(u => ({
        id: u.id, name: u.name, created: u.created, lastLogin: u.lastLogin || null, lastSeen: u.lastSeen || null,
        banned: !!u.banned, banReason: u.banReason || '', save: summary(u.id),
        mail: ctx.mailPending ? ctx.mailPending(u.id) : 0,
      })).sort((a, b) => (b.lastSeen || 0) - (a.lastSeen || 0));
    });
    app.post('/api/admin/player', async req => {
      ctx.requireAdmin(req);
      const u = ctx.users.list[String(req.body.id)];
      if (!u) throw httpError(404, '没有这个玩家');
      const kick = () => { for (const [k, s] of Object.entries(ctx.sessions)) if (s.uid === u.id) delete ctx.sessions[k]; u.activeSession = null; store.touch('sessions'); };
      switch (req.body.action) {
        case 'ban': u.banned = true; u.banReason = String(req.body.reason || '').slice(0, 100); kick(); break;
        case 'unban': u.banned = false; u.banReason = ''; break;
        case 'kick': kick(); break;
        case 'password': {
          const pw = String(req.body.password || '');
          if (pw.length < 6) throw httpError(400, '新密码至少 6 位');
          u.salt = crypto.randomBytes(16).toString('hex'); u.hash = await ctx.hashPassword(pw, u.salt); kick();
          break;
        }
        default: throw httpError(400, '不认识的操作');
      }
      store.touch('users');
      log.info(`后台对玩家 ${u.name}（#${u.id}）执行：${req.body.action}`);
      return { ok: true };
    });
  },
};
