// ===== 云存档 =====
// 每个玩家一份存档，带版本号 rev：客户端上传时要带上它拿到的 rev，对不上就说明别处改过（409 conflict）。
// 只有「最后登录的那个设备」能存档，其他设备会收到 409 kicked（被顶下线）。
// 服务器记录存档时间，用服务器的时钟算离线时长，改本机时间没有用。
'use strict';
const { httpError } = require('../core/http');

module.exports = {
  name: '云存档',
  init(app, ctx) {
    const { store, config } = ctx;
    const maxBytes = config.maxSaveKB * 1024;

    app.get('/api/save', req => {
      const u = ctx.requireUser(req);
      const rec = store.readSave(u.id);
      return { data: rec ? rec.data : null, rev: rec ? rec.rev : 0, savedAt: rec ? rec.savedAt : null, now: Date.now() };
    });

    function put(req) {
      const u = ctx.requireUser(req);
      if (req.session.sid !== u.activeSession) throw httpError(409, '这个账号已经在别的地方登录了', 'kicked');
      const data = req.body.data;
      if (!data || typeof data !== 'object' || Array.isArray(data)) throw httpError(400, '存档格式不对');
      if (Buffer.byteLength(JSON.stringify(data)) > maxBytes) throw httpError(413, '存档太大了');
      const cur = store.readSave(u.id), rev = cur ? cur.rev : 0;
      if (req.body.rev !== undefined && +req.body.rev !== rev) throw httpError(409, '存档在别处被更新过了', 'conflict');
      const rec = { rev: rev + 1, savedAt: Date.now(), data };
      store.writeSave(u.id, rec);
      return { rev: rec.rev, savedAt: rec.savedAt };
    }
    app.put('/api/save', put);
    // 关闭页面时用 navigator.sendBeacon 发过来（不能带请求头，令牌放在内容里）
    app.post('/api/save/beacon', put);
  },
};
