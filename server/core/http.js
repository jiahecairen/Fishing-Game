// ===== 迷你 HTTP 框架（只用 Node 自带的 http 模块） =====
// app.get('/api/xxx', async (req, res) => ({ ok: true }))   返回的对象会自动变成 JSON
// app.post / app.put 同理；req.body 是解析好的 JSON；req.user 由 auth 模块的中间件填上
// 抛出 httpError(状态码, '说明', 'code') 会返回对应的错误
'use strict';
const http = require('http');
const fs = require('fs');
const path = require('path');

function httpError(status, message, code) { const e = new Error(message); e.status = status; e.code = code; return e; }

const MIME = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8', '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml',
  '.woff2': 'font/woff2', '.woff': 'font/woff', '.ico': 'image/x-icon', '.txt': 'text/plain; charset=utf-8', '.md': 'text/plain; charset=utf-8',
};

function createApp(opt) {
  const routes = [];
  const befores = [];
  let staticDir = null;
  const maxBody = (opt && opt.maxBodyKB || 4096) * 1024;

  const add = (method, p, fn) => routes.push({ method, path: p, fn });
  const app = {
    get: (p, fn) => add('GET', p, fn),
    post: (p, fn) => add('POST', p, fn),
    put: (p, fn) => add('PUT', p, fn),
    del: (p, fn) => add('DELETE', p, fn),
    before: fn => befores.push(fn),       // 每个 API 请求之前执行（例如解析登录令牌）
    static: dir => { staticDir = dir; },
    listen: (port, host, cb) => server.listen(port, host, cb),
    routes,
  };

  function send(res, status, obj, headers) {
    const body = JSON.stringify(obj);
    res.writeHead(status, Object.assign({ 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' }, headers || {}));
    res.end(body);
  }
  function readBody(req) {
    return new Promise((ok, no) => {
      let size = 0; const chunks = [];
      req.on('data', c => { size += c.length; if (size > maxBody) { no(httpError(413, '数据太大了')); req.destroy(); } else chunks.push(c); });
      req.on('end', () => {
        const raw = Buffer.concat(chunks).toString('utf8');
        if (!raw) return ok({});
        try { ok(JSON.parse(raw)); } catch (e) { no(httpError(400, '数据格式不对')); }
      });
      req.on('error', no);
    });
  }
  function serveStatic(req, res, url) {
    if (!staticDir) { res.writeHead(404); res.end('not found'); return; }
    let p = decodeURIComponent(url.pathname);
    if (p.endsWith('/')) p += 'index.html';
    const file = path.normalize(path.join(staticDir, p));
    if (!file.startsWith(staticDir + path.sep) && file !== staticDir) { res.writeHead(403); res.end('forbidden'); return; }
    fs.stat(file, (err, st) => {
      if (err || !st.isFile()) { res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' }); res.end('没有这个文件'); return; }
      res.writeHead(200, { 'Content-Type': MIME[path.extname(file).toLowerCase()] || 'application/octet-stream', 'Cache-Control': 'no-cache', 'Content-Length': st.size });
      fs.createReadStream(file).pipe(res);
    });
  }

  const server = http.createServer(async (req, res) => {
    const url = new URL(req.url, 'http://x');
    // 允许从别的地址（例如本地文件、Mac App）访问 API
    const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'Content-Type, Authorization', 'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS' };
    if (req.method === 'OPTIONS') { res.writeHead(204, cors); res.end(); return; }
    if (!url.pathname.startsWith('/api/')) return serveStatic(req, res, url);
    const route = routes.find(r => r.method === req.method && r.path === url.pathname);
    if (!route) return send(res, 404, { error: '没有这个接口' }, cors);
    try {
      req.query = Object.fromEntries(url.searchParams);
      req.ip = (req.headers['x-forwarded-for'] || req.socket.remoteAddress || '').split(',')[0].trim();
      req.body = ['POST', 'PUT'].includes(req.method) ? await readBody(req) : {};
      for (const b of befores) await b(req);
      const out = await route.fn(req, res);
      if (!res.headersSent) send(res, 200, out === undefined ? { ok: true } : out, cors);
    } catch (e) {
      if (!e.status) console.error(e);
      if (!res.headersSent) send(res, e.status || 500, { error: e.status ? e.message : '服务器出错了', code: e.code }, cors);
    }
  });
  return app;
}

module.exports = { createApp, httpError };
