// ===== 服务器信息 =====
// 客户端启动时先问一声，之后每 30 秒再问一次：维护中没有？参数改过没有（tuningRev）？
'use strict';
module.exports = {
  name: '服务器信息',
  init(app, ctx) {
    app.get('/api/hello', () => ({
      ok: true, name: '小猫钓鱼', version: ctx.version, now: Date.now(),
      devCheats: !!ctx.settings.devCheats, allowRegister: ctx.settings.allowRegister !== false,
      maintenance: !!ctx.settings.maintenance, maintenanceMsg: ctx.settings.maintenance ? ctx.settings.maintenanceMsg : '',
      tuningRev: ctx.tuningRev ? ctx.tuningRev() : 0,
    }));
  },
};
