// ===== 服务器信息 =====
'use strict';
module.exports = {
  name: '服务器信息',
  init(app, ctx) {
    app.get('/api/hello', () => ({
      ok: true, name: '小猫钓鱼', version: ctx.version, now: Date.now(),
      devCheats: !!ctx.config.devCheats, allowRegister: ctx.config.allowRegister !== false,
    }));
  },
};
