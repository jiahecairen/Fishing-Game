// ===== 内核 · 启动与主循环 =====
// 生命周期（每个模块都可以选择实现）：
//   init()        所有文件加载完：注册面板、监听事件、往页面里插自己的 DOM
//   migrate(S)    读到存档后：补字段、兼容旧存档
//   start(info)   存档就绪、游戏开始前
//   tick(dt)      每帧逻辑
//   frame(dt)     每帧画面 / HUD
//   offline(ctx)  离线结算（按 offlinePriority 从小到大执行）
//   reset()       玩家重置存档时
'use strict';

CF.start = async function () {
  CF.net.init();
  CF.view.init($('#scene'));
  UI.init();
  Story.init();
  CF.each('init');
  UI.buildNav();
  await CF.waitPreload(); // 图集等资源（art 模块）

  const loaded = await CF.storage.load(); // account 模块会在这里先显示登录界面
  const hadSave = CF.state.load(loaded && loaded.raw);
  const boot = $('#boot'); if (boot) boot.remove();
  CF.each('start', { hadSave });
  CF.started = true;

  if (hadSave) {
    const away = loaded.away != null ? loaded.away : (Date.now() - (Game.S.lastSave || Date.now())) / 1000;
    const report = CF.offline(away);
    if (report) setTimeout(() => UI.openOffline(report), 300);
  }
  CF.emit('ready', { hadSave });
  Game.save();

  let last = performance.now(), saveTimer = 0;
  const step = dt => { Game.tickWorld(dt); CF.each('tick', dt); CF.modes.tick(dt); };
  function loop(now) {
    let dt = Math.max(0, (now - last) / 1000); last = now; // 第一帧的时间戳可能比 last 还早
    if (dt > 30) { // 页面被挂起很久：按离线结算
      const r = CF.offline(dt);
      if (r && r.notable) UI.openOffline(r);
      dt = 0;
    } else if (dt > 0.1) { // 短暂卡顿：分步追赶
      let left = dt; while (left > 0.1) { step(0.1); left -= 0.1; } dt = left;
    }
    step(dt);
    CF.modes.render(dt);
    CF.each('frame', dt);
    UI.frame();
    saveTimer += dt;
    if (saveTimer > 5) { saveTimer = 0; Game.save(); }
    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);

  document.addEventListener('visibilitychange', () => { if (document.hidden) { Game.save(); CF.storage.flush(); } });
  window.addEventListener('pagehide', () => { Game.save(); CF.storage.flush(true); });
};

// 离线结算：先结算与模式无关的（寄卖行…），再让当前模式（航海/副本）消耗时间，最后钓鱼用掉剩下的
CF.offline = function (seconds) {
  if (!(seconds >= 30)) return null;
  seconds = Math.min(seconds, OFFLINE_CAP_SEC);
  const ctx = { seconds, left: seconds, report: { seconds } };
  const steps = CF.parts().filter(m => m.offline).map(m => ({ p: m.offlinePriority || 50, fn: c => m.offline(c), id: m.id }));
  steps.push({ p: 50, fn: c => CF.modes.offline(c), id: 'modes' });
  steps.sort((a, b) => a.p - b.p);
  ctx.after = [];                      // 模块可以 push 一个函数，在全部结算完之后执行（例如统计差值）
  ctx.report.levelFrom = Game.S.level;
  for (const s of steps) { try { s.fn(ctx); } catch (e) { console.error(`[CF] ${s.id} 离线结算出错`, e); } }
  if (ctx.left > 0) { Game.advanceTime(ctx.left); ctx.left = 0; }
  for (const fn of ctx.after) { try { fn(ctx); } catch (e) { console.error(e); } }
  ctx.report.levelTo = Game.S.level;
  return ctx.report;
};
