// ===== 小猫钓鱼 · 游戏服务器 =====
// 启动：node index.js   （或者双击项目根目录的「启动服务器.command」）
// 服务器也是模块化的：每个功能是 modules/ 下的一个文件，在 modules/index.js 里登记。
'use strict';

const fs = require('fs');
const path = require('path');
const { createApp } = require('./core/http');
const { Store } = require('./core/store');
const log = require('./core/log');

const ROOT = __dirname;
const config = Object.assign({ port: 28787, host: '0.0.0.0', dataDir: './data', clientDir: '../client', devCheats: true, sessionDays: 30, maxSaveKB: 4096, allowRegister: true },
  JSON.parse(fs.readFileSync(path.join(ROOT, 'config.json'), 'utf8')));
if (process.env.PORT) config.port = +process.env.PORT;
if (process.env.HOST) config.host = process.env.HOST;
if (process.env.DATA_DIR) config.dataDir = process.env.DATA_DIR;
config.dataDir = path.resolve(ROOT, config.dataDir);
config.clientDir = path.resolve(ROOT, config.clientDir);

const store = new Store(config.dataDir);
const app = createApp({ maxBodyKB: config.maxSaveKB + 64 });
const ctx = { config, store, log, app, version: require('./package.json').version, startedAt: Date.now() };

// 运行时设置：可以在后台管理页面里改，改完马上生效、重启也记得（存在 data/settings.json，没有就用 config.json 里的值）
ctx.settings = Object.assign({ maintenance: false, maintenanceMsg: '服务器正在维护，请稍后再来～', allowRegister: config.allowRegister !== false, devCheats: !!config.devCheats },
  store.table('settings', () => ({})));
ctx.saveSettings = () => { Object.assign(store.table('settings', () => ({})), ctx.settings); store.touch('settings'); };
// 退出进程：code 42 = 重启（启动服务器.command 看到 42 会自动再启动一次），0 = 关闭
ctx.exit = code => { log.info(code === 42 ? '后台要求重启服务器…' : '后台要求关闭服务器…'); store.flushAll(); setTimeout(() => process.exit(code), 300); };

for (const name of require('./modules')) {
  const mod = require('./modules/' + name);
  mod.init(app, ctx);
  log.info(`模块已加载：${mod.name || name}`);
}
app.static(config.clientDir);
app.static(path.join(ROOT, 'admin'), '/admin/'); // 后台管理页面

const server = app.listen(config.port, config.host, () => {
  log.info(`🐱 小猫钓鱼服务器已启动：http://localhost:${config.port}`);
  log.info(`   存档目录：${config.dataDir}`);
  log.info(`   后台管理：http://localhost:${config.port}/admin/`);
  log.info('   按 Ctrl+C 停止服务器');
  selfCheck();
});
server.on('error', e => {
  if (e.code === 'EADDRINUSE') log.error(`端口 ${config.port} 已经被别的程序占用了。请打开 server/config.json，把 "port" 改成别的数字（比如 ${config.port + 1}），再启动一次。`);
  else log.error('服务器启动失败：', e.message);
  process.exit(1);
});
// 自检：确认 localhost 上回答的真的是我们（别的程序可能抢先占用了 127.0.0.1 的同一个端口）
function selfCheck() {
  require('http').get(`http://127.0.0.1:${config.port}/api/hello`, res => {
    let body = ''; res.on('data', c => { body += c; });
    res.on('end', () => {
      let ok = false; try { ok = JSON.parse(body).name === '小猫钓鱼'; } catch (e) { ok = false; }
      if (!ok) log.warn(`localhost:${config.port} 上回答的不是小猫钓鱼服务器——你的其他程序也在用这个端口。请在 server/config.json 里换一个端口。`);
    });
  }).on('error', () => {});
}
const stop = () => { log.info('正在保存数据并退出…'); store.flushAll(); process.exit(0); };
process.on('SIGINT', stop); process.on('SIGTERM', stop);
