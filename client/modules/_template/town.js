// ===== 示例小镇 =====
// 这个文件演示了一个新模块会用到的全部「积木」：
//   1. 存档字段          CF.module({ state() })
//   2. 新的画面模式      CF.modes.define('town', { render, tick, ... })
//   3. 自己的 HUD        往 #hud-bottom 里插元素，在模式的 hud 里登记
//   4. 导航按钮 + 面板   UI.nav / CF.panel / UI.actions
//   5. 剧情对话          CF.story.chars / CF.story.lines / Story.run
//   6. 和其他模块协作    事件（CF.on）和钩子（CF.hook）
'use strict';

const TOWN_W = 1600, TOWN_H = 900; // 小镇地图大小（世界坐标）
const Town = {
  keys: {},
  target: null,
  npcs: [
    { id: 'baker', x: 520, y: 420, name: '面包师', color: '#ffcc80', story: 'town_baker' },
    { id: 'fisher', x: 1120, y: 560, name: '老渔夫', color: '#90caf9', story: 'town_fisher' },
  ],
  houses: [{ x: 380, y: 250, w: 220, h: 150, c: '#d98c5f' }, { x: 900, y: 220, w: 260, h: 170, c: '#8fb3d9' }, { x: 1250, y: 330, w: 200, h: 140, c: '#b39ddb' }],
  get T() { return Game.S.town; },

  enter() { CF.modes.enter('town', '🏘️ 来到了小镇（方向键 / WASD 走动，点击地面也可以）'); },
  tick(dt) {
    const T = this.T, sp = 220 * dt;
    let dx = (this.keys.ArrowRight || this.keys.d ? 1 : 0) - (this.keys.ArrowLeft || this.keys.a ? 1 : 0);
    let dy = (this.keys.ArrowDown || this.keys.s ? 1 : 0) - (this.keys.ArrowUp || this.keys.w ? 1 : 0);
    if (dx || dy) this.target = null;
    else if (this.target) {
      const tx = this.target.x - T.x, ty = this.target.y - T.y, d = Math.hypot(tx, ty);
      if (d < 4) this.target = null; else { dx = tx / d; dy = ty / d; }
    }
    const len = Math.hypot(dx, dy) || 1;
    T.x = clamp(T.x + dx / len * sp, 40, TOWN_W - 40); T.y = clamp(T.y + dy / len * sp, 200, TOWN_H - 40);
    T.moving = !!(dx || dy); if (dx) T.face = dx > 0 ? 1 : -1;
    T.dir = !T.moving ? T.dir : Math.abs(dy) > Math.abs(dx) * 1.5 ? (dy < 0 ? 'up' : 'down') : 'side';
    // 靠近 NPC 就聊天（每个 NPC 的台词只播放一次）
    for (const n of this.npcs) if (Math.hypot(n.x - T.x, n.y - T.y) < 60 && !Story.seen(n.story)) { Story.run(n.story); T.talked = (T.talked || 0) + 1; }
  },
  render(dt, view) {
    const ctx = view.ctx, W = view.W, H = view.H, T = this.T, R = Renderer;
    R.t += dt;
    // 镜头跟着小猫
    const cam = { x: clamp(T.x - W / 2, 0, Math.max(0, TOWN_W - W)), y: clamp(T.y - H / 2, 0, Math.max(0, TOWN_H - H)) };
    this.cam = cam;
    // 天空（复用钓鱼模块的天色）
    const sky = R.skyColors(Game.hour(), Game.S.weather), g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, rgbStr(sky.top)); g.addColorStop(0.3, rgbStr(sky.bot)); g.addColorStop(0.31, '#7cb35a'); g.addColorStop(1, '#4f8a3a');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    ctx.save(); ctx.translate(-cam.x, -cam.y);
    // 小路
    ctx.fillStyle = '#d8c28e'; ctx.fillRect(0, 480, TOWN_W, 70); ctx.fillRect(760, 200, 70, TOWN_H);
    // 房子
    for (const h of this.houses) {
      ctx.fillStyle = 'rgba(0,0,0,.2)'; ctx.fillRect(h.x + 8, h.y + h.h, h.w, 10);
      ctx.fillStyle = h.c; ctx.fillRect(h.x, h.y, h.w, h.h);
      ctx.fillStyle = mix(h.c, '#000', 0.35); ctx.beginPath(); ctx.moveTo(h.x - 14, h.y); ctx.lineTo(h.x + h.w / 2, h.y - 70); ctx.lineTo(h.x + h.w + 14, h.y); ctx.fill();
      ctx.fillStyle = '#5d4037'; ctx.fillRect(h.x + h.w / 2 - 18, h.y + h.h - 52, 36, 52);
      ctx.fillStyle = '#fff59d'; ctx.fillRect(h.x + 24, h.y + 34, 34, 28); ctx.fillRect(h.x + h.w - 58, h.y + 34, 34, 28);
    }
    // 像素图集里的木牌和石头（art 模块关掉时不画）
    const art = typeof Art !== 'undefined' && Art.ready('cat');
    const deco = art ? [{ n: 'sign', x: 700, y: 470, k: 0.6 }, { n: 'rocks', x: 260, y: 720, k: 0.7 }, { n: 'rocks', x: 1450, y: 800, k: 0.5 }, { n: 'grass', x: 1000, y: 760, k: 0.5 }] : [];
    // NPC、装饰和小猫按 y 排序，近的盖住远的
    const things = [...this.npcs.map(n => ({ y: n.y, draw: () => this.drawNpc(ctx, n) })), ...deco.map(d => ({ y: d.y, draw: () => Art.draw(ctx, 'cat', d.n, d.x, d.y, d.k) })), { y: T.y, draw: () => this.drawCat(ctx, T) }];
    things.sort((a, b) => a.y - b.y).forEach(t => t.draw());
    if (this.target) { ctx.strokeStyle = 'rgba(255,255,255,.8)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(this.target.x, this.target.y, 14, 6, 0, 0, 7); ctx.stroke(); }
    ctx.restore();
  },
  drawCat(ctx, T) {
    const art = Renderer.artOn(), s = 56;
    // 像素图集：左右走播放走路动画；往上走看背影，往下走看正面（一跳一跳的）；站着时看正面
    const pose = !T.moving ? 'idleFront' : T.dir === 'up' ? 'idleBack' : T.dir === 'down' ? 'idleFront' : 'walk';
    const bob = T.moving && (!art || pose !== 'walk') ? Math.abs(Math.sin(Renderer.t * 10)) * 5 : 0;
    ctx.fillStyle = 'rgba(0,0,0,.25)'; ctx.beginPath(); ctx.ellipse(T.x, T.y, 26, 8, 0, 0, 7); ctx.fill();
    ctx.save(); ctx.translate(T.x, T.y - bob); ctx.scale(T.face || 1, 1);
    Renderer.drawCat(ctx, 0, 0, s, c => c, { phase: 'idle', pose, shadow: false }); // 复用钓鱼模块画的小猫
    ctx.restore();
  },
  drawNpc(ctx, n) {
    ctx.fillStyle = 'rgba(0,0,0,.25)'; ctx.beginPath(); ctx.ellipse(n.x, n.y, 22, 7, 0, 0, 7); ctx.fill();
    ctx.fillStyle = n.color; ctx.beginPath(); ctx.ellipse(n.x, n.y - 34, 20, 30, 0, 0, 7); ctx.fill();
    ctx.beginPath(); ctx.arc(n.x, n.y - 74, 16, 0, 7); ctx.fill();
    ctx.fillStyle = '#000'; ctx.fillRect(n.x - 6, n.y - 78, 3, 4); ctx.fillRect(n.x + 3, n.y - 78, 3, 4);
    ctx.font = '13px FusionPixel, sans-serif'; ctx.textAlign = 'center'; ctx.fillStyle = '#fff'; ctx.fillText(n.name, n.x, n.y - 100);
    // 还没聊过天的居民头上冒一个对话气泡
    if (!Story.seen(n.story) && typeof Art !== 'undefined' && Art.ready('cat')) Art.draw(ctx, 'cat', 'talk', n.x + 22, n.y - 108 - Math.abs(Math.sin(Renderer.t * 3)) * 4, 0.45);
  },
};

// 1. 存档字段（新模块请用自己的名字当字段名，不会和别人冲突）
CF.module({
  id: '_template',
  state: () => ({ town: { x: 800, y: 600, face: 1, talked: 0 } }),
  init() {
    // 3. 自己的 HUD：插到底部，进入小镇时显示
    $('#hud-bottom').insertAdjacentHTML('afterbegin', '<div id="town-ctl" class="hidden"><span class="tip panel-glass">🏘️ 示例小镇 · 方向键/WASD 或点击地面走动 · 靠近居民会聊天</span><button class="btn primary" data-back>⛵ 回码头</button></div>');
    $('#town-ctl [data-back]').addEventListener('click', () => CF.modes.leave());
    document.addEventListener('keydown', e => { if (CF.modes.is('town')) Town.keys[e.key.length === 1 ? e.key.toLowerCase() : e.key] = true; });
    document.addEventListener('keyup', e => { Town.keys[e.key.length === 1 ? e.key.toLowerCase() : e.key] = false; });
    $('#scene').addEventListener('click', e => { if (CF.modes.is('town') && Town.cam) Town.target = { x: e.clientX + Town.cam.x, y: e.clientY + Town.cam.y }; });

    // 2. 新的画面模式
    CF.modes.define('town', {
      name: '小镇',
      hud: ['town-ctl'],                 // 这些 HUD 只在小镇里显示；钓鱼的 HUD 会自动隐藏
      enter() { Town.keys = {}; Town.target = null; },
      tick: dt => Town.tick(dt),         // 战斗、剧情、事件进行中，内核会自动暂停这里
      render: (dt, view) => Town.render(dt, view),
      key: e => ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'w', 'a', 's', 'd'].includes(e.key), // 这些键自己处理，不打开面板
      retreat: () => CF.modes.leave(),
    });
  },
});

// 4. 导航按钮 + 面板 + 按钮动作
CF.panel('town', {
  title: '🏘️ 示例小镇',
  render() {
    const T = Game.S.town;
    return [`<div class="hint">这是一个新模块的示例：它自己有存档字段（S.town）、自己的画面模式、自己的 HUD 和面板，没有改动任何已有的文件。</div>
      <div class="kv"><span class="k">聊过天的居民</span><span>${T.talked || 0}/${Town.npcs.length}</span><span class="k">上次的位置</span><span>${Math.round(T.x)}, ${Math.round(T.y)}</span></div>`,
      `<span class="info"></span><button class="btn primary" data-act="town_go" ${CF.modes.busy() ? 'disabled' : ''}>🚶 去小镇</button>`];
  },
});
UI.nav({ id: 'town', label: '小镇', icon: 'home', order: 105 });
UI.actions({ town_go() { this.close(); Town.enter(); } });

// 5. 剧情
CF.story.chars({ baker: { name: '面包师', face: '🥐', pitch: 600 }, fisher: { name: '老渔夫', face: '🎣', pitch: 260 } });
CF.story.lines({
  town_baker: [['baker', '欢迎来到小镇！刚出炉的鱼形面包，要不要尝尝？'], ['narr', '* （这只是个示例，你可以在这里做商店、任务……）']],
  town_fisher: [['fisher', '年轻的猫，码头那边的鱼还够你钓吗？'], ['fisher', '小镇以后会越来越热闹的。']],
});

// 6. 和别的模块协作：钓到新鱼时，小镇的居民会听说（事件）
CF.on('fish:caught', d => { if (d.isNew && !d.quiet && Game.S.town) Game.S.town.news = FISH_BY_ID[d.item.id].name; });
