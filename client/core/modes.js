// ===== 内核 · 画布与画面模式 =====
// 「模式」= 玩家此刻在玩的那一块：钓鱼（fish）、航海（voyage）、副本（dungeon）……
// 以后的潜水、小镇，也只是再 define 一个模式：
//
//   CF.modes.define('town', {
//     name: '小镇',
//     hud: ['town-ctl'],            // 这个模式要显示的 HUD 元素 id（其他模式的会自动隐藏）
//     bar() { return '...' },       // 可选：底部状态条（航海/副本那条）
//     enter() {}, exit() {},        // 进入 / 离开
//     tick(dt) {},                  // 逻辑（战斗、剧情、事件进行中会自动暂停）
//     render(dt, view) {},          // 画到主画布上：view.ctx / view.W / view.H
//     action() {},                  // 空格 / 点击画面
//     key(e) {},                    // 其他按键（返回 true 表示已处理）
//     retreat() {},                 // 「撤退/返回」按钮
//     offline(ctx) {},              // 离线结算：消耗 ctx.left 秒
//   });
//   CF.modes.enter('town');
'use strict';

CF.view = {
  cv: null, ctx: null, W: 0, H: 0, dpr: 1,
  init(canvas) {
    this.cv = canvas; this.ctx = canvas.getContext('2d');
    this.resize();
    window.addEventListener('resize', () => this.resize());
  },
  // 按屏幕的真实像素密度绘制，保证画面清晰
  resize() {
    this.dpr = Math.min(2, window.devicePixelRatio || 1);
    this.W = window.innerWidth; this.H = window.innerHeight;
    this.cv.width = Math.round(this.W * this.dpr); this.cv.height = Math.round(this.H * this.dpr);
    this.cv.style.width = this.W + 'px'; this.cv.style.height = this.H + 'px';
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    CF.emit('resize', this);
  },
};

CF.modes = {
  defs: {},
  home: 'fish',
  define(id, def) { this.defs[id] = Object.assign({ id, hud: [] }, def); return this.defs[id]; },
  get id() { return (Game.S && Game.S.mode) || this.home; },
  cur() { return this.defs[this.id] || this.defs[this.home] || { id: this.home, hud: [] }; },
  is(id) { return this.id === id; },
  busy() { return this.id !== this.home; },
  enter(id, msg) {
    const prev = this.cur();
    if (prev.exit && prev.id !== id) prev.exit(id);
    Game.S.mode = id;
    const d = this.defs[id]; if (d && d.enter) d.enter();
    if (msg) Game.toast(msg, 'good');
    CF.emit('mode', id); Game.changed(); Game.save();
  },
  // 回到默认模式（钓鱼）
  leave() {
    const prev = this.cur();
    if (prev.exit && prev.id !== this.home) prev.exit(this.home);
    Game.S.mode = this.home;
    const d = this.defs[this.home]; if (d && d.enter) d.enter();
    CF.emit('mode', this.home);
  },
  tick(dt) {
    const d = this.cur(); if (!d.tick) return;
    if (CF.first('mode.blocked', d)) return; // 战斗 / 剧情 / 事件进行中
    d.tick(dt);
  },
  render(dt) { const d = this.cur(); if (d.render) d.render(dt, CF.view); },
  // 离线结算时，非默认模式先消耗时间（例如航行还没到岸）
  offline(ctx) { const d = this.cur(); if (this.busy() && d.offline) d.offline(ctx); },
};
