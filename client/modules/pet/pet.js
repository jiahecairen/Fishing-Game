// ===== 桌面宠物 =====
// 点导航栏「桌面宠物」→ 网页把画面换成一只坐在小船上钓鱼的小猫（背景透明），
// 同时告诉 Mac App 把窗口变成透明、无边框、置顶的小浮窗（拖动、右键菜单、点穿空白处都在 App 里做）。
// 右键 →「还原窗口」：App 恢复原来的窗口，再调用 Pet.leave(true)。
//
// 同步：画面每一帧都直接读游戏的实时状态——
//   Fishing.fsm（抛竿 / 等鱼 / 咬钩 / 收线 / 结果 / 背包满）、钓到和跑掉的事件、
//   当前模式（航海 / 副本）、战斗、剧情、天气、昼夜。游戏本身照常在后台运行，宠物只是换了一种画法。
//
// 和 App 的约定（webkit.messageHandlers.native.postMessage）：
//   { cmd: 'pet', on: true, w, h, hit: [[x, y, 宽, 高], ...] }   进入宠物模式；hit = 能点到的区域，其余地方点穿到桌面
//   { cmd: 'pet', on: false }                                     网页主动退出（一般由 App 的右键菜单发起）
'use strict';

const PET = {
  W: 240, H: 150,          // 浮窗大小（点）
  wy: 128,                 // 水面
  cat: { x: 62, y: 118 },  // 小猫脚底（藏在船舷后面）
  boat: { x: 18, y: 112 }, // 船身左上角
  bob: { x: 206, y: 129 }, // 浮漂落点
  sc: 0.7,                 // 小猫缩放
  hit: [[14, 34, 132, 112]],
};

const Pet = {
  on: false,
  t: 0,
  mood: { kind: 'idle', t: 9 },
  ripples: [], drops: [], flyers: [], texts: [], sky: [],
  last: { phase: null },
  timers: { ripple: 0, splash: 0, wake: 0 },
  bobber: { x: PET.bob.x, y: PET.bob.y },
  _boat: null,
  autoChanged: false,

  native() { return !!(window.__NATIVE__ && window.webkit && webkit.messageHandlers && webkit.messageHandlers.native); },
  post(msg) { try { webkit.messageHandlers.native.postMessage(msg); } catch (e) { console.warn('[Pet] 发不出消息给 App', e); } },

  // ---------- 进入 / 退出 ----------
  enter() {
    if (this.on) return;
    if (!this.native()) { Game.toast('桌面宠物只能在 Mac App 里用：双击「双击打包.command」打包，然后打开 App', 'warn'); return; }
    if (typeof Account !== 'undefined' && Account.stopped) { Game.toast('存档同步已停止，先重新载入再变成宠物吧', 'warn'); return; }
    UI.close();
    const S = Game.S;
    if (!S.settings.auto) { S.settings.auto = true; this.autoChanged = true; const t = $('#auto-toggle'); if (t) t.checked = true; }
    this.on = true;
    this.t = 0; this.ripples = []; this.drops = []; this.flyers = []; this.texts = []; this.sky = [];
    this.last.phase = Fishing.fsm.phase;
    document.documentElement.classList.add('pet');
    this.post({ cmd: 'pet', on: true, w: PET.W, h: PET.H, hit: PET.hit });
    CF.emit('pet', true);
  },
  leave(fromNative) {
    if (!this.on) return;
    this.on = false;
    document.documentElement.classList.remove('pet');
    if (this.autoChanged) { // 进宠物模式时帮你打开的自动挂机，还原时关回去
      Game.S.settings.auto = false; this.autoChanged = false;
      const t = $('#auto-toggle'); if (t) t.checked = false;
    }
    if (!fromNative) this.post({ cmd: 'pet', on: false });
    CF.emit('pet', false);
  },

  // ---------- 宠物模式下，原本要你点一下的东西自动处理 ----------
  tick(dt) {
    if (!this.on) return;
    if (document.getElementById('account')) { this.leave(); return; }          // 登录过期 / 被顶下线：还原窗口让你看到
    if (typeof Events !== 'undefined' && Events.cur && Events.cur.left > 3) Events.cur.left = 3; // 突发事件：3 秒后选默认
    if (typeof Battle !== 'undefined' && Battle.battle && Battle.battle.await) Battle.heroAct({ type: 'auto' }); // 手动战斗：交给小橘
  },
  // 需要你回来看看的事情（头顶冒气泡）
  attention() {
    if (typeof Story !== 'undefined' && Story.active) return 'talk';
    if (typeof Battle !== 'undefined' && Battle.battle && Battle.battle.pause) return 'talk';
    if (CF.modes.is('dungeon') && Game.S.dungeon && Game.S.dungeon.phase === 'bossWait') return 'talk';
    return null;
  },

  // ---------- 游戏事件 ----------
  onCast() { this.mood = { kind: 'idle', t: 0 }; },
  onBite() { this.burst(this.bobber.x, PET.wy, 3, 7); },
  onCatch(d) {
    this.mood = { kind: 'happy', t: 0 };
    const f = d.fish || (d.item && FISH_BY_ID[d.item.id]); if (!f) return;
    this.flyers.push({ x0: this.bobber.x, y0: PET.wy, x1: PET.cat.x + 34, y1: PET.boat.y + 12, t: 0, dur: 0.9, rar: f.rarity });
    this.burst(this.bobber.x, PET.wy, 2, 8);
    const star = d.item && d.item.star ? '★' : '';
    this.texts.push({ s: star + f.name, color: (RARITY[f.rarity] || RARITY.common).color, x: PET.cat.x + 18, y: PET.wy - 72, t: -0.6, life: 1.8 });
  },
  onEscape() {
    this.mood = { kind: 'sad', t: 0 };
    this.texts.push({ s: '跑了…', color: '#c9d2dc', x: this.bobber.x - 6, y: PET.wy - 16, t: 0, life: 1.4 });
  },

  // ---------- 特效 ----------
  ripple(x, y, r0, r1, life, a) { this.ripples.push({ x, y, r0, r1, life, a, t: 0 }); },
  burst(x, y, rings, drops) {
    for (let i = 0; i < rings; i++) this.ripples.push({ x, y, r0: 2, r1: 16 + i * 6, life: 0.9 + i * 0.25, a: 0.9, t: -i * 0.15 });
    for (let i = 0; i < drops; i++) this.drops.push({ x, y: y - 1, vx: rand(-28, 28), vy: rand(-70, -35), t: 0 });
  },

  // ---------- 画面 ----------
  render(dt, view) {
    const ctx = view.ctx, W = view.W, H = view.H;
    ctx.clearRect(0, 0, W, H);
    this.t += dt; this.mood.t += dt;
    const k = Math.min(W / PET.W, H / PET.H);
    ctx.save();
    ctx.translate(Math.round((W - PET.W * k) / 2), Math.round((H - PET.H * k) / 2));
    ctx.scale(k, k);
    this.scene(ctx, dt);
    ctx.restore();
  },

  scene(ctx, dt) {
    const S = Game.S, f = Fishing.fsm, mode = CF.modes.id, t = this.t;
    const inBattle = typeof Battle !== 'undefined' && !!Battle.battle;
    const fishing = mode === 'fish' && !inBattle;
    const sailing = mode === 'voyage';
    const day = Game.phase(), weather = S.weather;

    // 状态切换时的特效（落水的水花）
    if (f.phase !== this.last.phase) {
      if (this.last.phase === 'casting' && f.phase === 'waiting') this.burst(PET.bob.x, PET.wy, 2, 5);
      this.last.phase = f.phase;
    }

    // 船和小猫一起随水起伏
    const bob = Math.sin(t * (sailing ? 2.4 : 1.6)) * (sailing ? 1.8 : 1);
    const tilt = sailing ? Math.sin(t * 1.2) * 0.025 : 0;

    // 天气（在最后面）
    this.drawWeather(ctx, dt, weather);

    // ---- 小猫 ----
    const pose = this.pose(f, fishing, sailing, inBattle, mode);
    const tint = this.tint(day);
    ctx.save();
    ctx.translate(PET.cat.x + 18, PET.wy); ctx.rotate(tilt); ctx.translate(-(PET.cat.x + 18), -PET.wy);
    const hop = (pose.hop || 0) * 14, shake = pose.shake ? Math.sin(t * 40) * pose.shake : 0;
    const r = Art.draw(ctx, 'cat', pose.name, PET.cat.x + shake, PET.cat.y + bob - hop, PET.sc, { tint, sy: pose.breathe ? 1 + Math.sin(t * 2) * 0.012 : 1 });
    // ---- 船 ----
    this.drawBoat(ctx, PET.boat.x, PET.boat.y + bob, tint);
    ctx.restore();

    // ---- 鱼线和浮漂 ----
    const tip = r && r.tip && fishing && !pose.noLine ? r.tip : null;
    if (tip) this.drawLine(ctx, dt, f, tip);
    else this.bobber = { x: PET.bob.x, y: PET.wy };

    // ---- 水面（盖住船底和浮漂下半截）+ 水波 ----
    this.drawWater(ctx, dt, day, sailing, bob);
    this.drawRipples(ctx, dt);
    this.drawDrops(ctx, dt);

    // ---- 钓上来的鱼、文字、头顶的东西 ----
    this.drawFlyers(ctx, dt);
    this.drawTexts(ctx, dt);
    const headX = PET.cat.x + 6, headY = (r ? r.top : PET.cat.y - 60) - 4;
    if (fishing && f.phase === 'bite') Art.draw(ctx, 'cat', 'bang', headX + 12, headY - Math.abs(Math.sin(t * 9)) * 3, 0.32);
    const att = this.attention();
    if (att) Art.draw(ctx, 'cat', att, headX + 14, headY - Math.abs(Math.sin(t * 3)) * 2, 0.32);
    else if (inBattle) this.badge(ctx, '⚔️', headX + 14, headY - 2);
    else if (mode === 'dungeon') this.badge(ctx, '🗺️', headX + 14, headY - 2);
    if (pose.sleep) this.drawZzz(ctx, headX + 18, headY + 4);
  },

  // 这一刻小猫用哪一帧
  pose(f, fishing, sailing, inBattle, mode) {
    const m = this.mood, t = this.t;
    if (sailing) return { name: Art.at('cat', 'idle', t), breathe: true, noLine: true };
    if (mode === 'dungeon') return { name: Art.at('cat', 'look', t), noLine: true };
    if (inBattle) return { name: 'fishR2', breathe: true, noLine: true };
    if (!fishing) return { name: Art.at('cat', 'idle', t), noLine: true };
    if (f.blocked) return { name: Art.at('cat', 'idle', t), sleep: true, noLine: true };
    if (m.kind === 'happy' && m.t < 1.4) return { name: 'jump0', hop: Math.abs(Math.sin(m.t * 8)) * Math.max(0, 1 - m.t / 1.4) };
    if (m.kind === 'sad' && m.t < 1.3) return { name: Art.at('cat', 'hurt', m.t), noLine: true };
    if (f.phase === 'casting') { const p = f.t / f.dur; return { name: p < 0.32 ? 'fishR0' : p < 0.55 ? 'fishR1' : 'fishR2' }; }
    if (f.phase === 'waiting') return { name: f.dur - f.t < 1.2 ? Art.at('cat', 'nibble', t) : 'fishR2', breathe: true };
    if (f.phase === 'bite') return { name: 'fishR3', shake: 1.2 };
    if (f.phase === 'reeling') return f.escaped && f.t > f.dur * 0.6 ? { name: 'fishR2' } : { name: Art.at('cat', 'reel', t), shake: 0.6 };
    return { name: 'fishR2', breathe: true };
  },
  tint(day) {
    if (day === 'night') return [['#0a1030', 0.32]];
    if (day === 'dusk') return [['#ff7a3c', 0.1]];
    if (day === 'dawn') return [['#ffc0a0', 0.08]];
    return null;
  },

  // 像素小船：程序生成一张 60×13 的小图，放大 2 倍（像素清晰）
  boatCanvas() {
    if (this._boat) return this._boat;
    const CW = 60, CH = 13, c = document.createElement('canvas'); c.width = CW; c.height = CH;
    const x = c.getContext('2d');
    const K = '#2a1a10', rail = '#e0a86a', rail2 = '#b97f45', p1 = '#a8693a', p2 = '#8f5630', seam = '#6b3d20';
    for (let r = 0; r < CH; r++) {
      const u = r / (CH - 1);
      const L = Math.round(2 + 7 * u * u), R = Math.round(CW - 1 - 12 * Math.pow(u, 1.5));
      for (let cx = L; cx <= R; cx++) {
        let col = r === 1 ? rail : r === 2 ? rail2 : ((r - 3) % 3 === 2 ? seam : (Math.floor((r - 3) / 3) % 2 ? p2 : p1));
        if (r === 0 || r === CH - 1 || cx === L || cx === R) col = K;
        x.fillStyle = col; x.fillRect(cx, r, 1, 1);
      }
    }
    // 船头微微翘起
    x.fillStyle = K; x.fillRect(CW - 4, 0, 3, 1); x.fillRect(CW - 2, 0, 1, 2);
    // 船舷上的木钉
    x.fillStyle = '#5a341b'; for (const px of [10, 24, 38, 50]) x.fillRect(px, 5, 1, 1);
    return (this._boat = c);
  },
  drawBoat(ctx, x, y, tint) {
    const c = tint ? this.tinted(this.boatCanvas(), tint) : this.boatCanvas();
    ctx.save(); ctx.imageSmoothingEnabled = false;
    ctx.drawImage(c, x, y, c.width * 2, c.height * 2);
    ctx.restore();
  },
  // 夜晚 / 黄昏：给小船叠一层颜色（缓存起来，不用每帧重算）
  tinted(src, tint) {
    const key = tint.map(t => t[0] + t[1]).join();
    this._tint = this._tint || {};
    if (this._tint[key]) return this._tint[key];
    const c = document.createElement('canvas'); c.width = src.width; c.height = src.height;
    const x = c.getContext('2d'); x.drawImage(src, 0, 0);
    x.globalCompositeOperation = 'source-atop';
    for (const [col, a] of tint) { x.globalAlpha = a; x.fillStyle = col; x.fillRect(0, 0, c.width, c.height); }
    return (this._tint[key] = c);
  },

  // 鱼线 + 浮漂：位置跟着钓鱼的进度走
  drawLine(ctx, dt, f, tip) {
    const t = this.t, B = PET.bob, wy = PET.wy;
    let bx = B.x, by = wy - 2 + Math.sin(t * 2.2) * 0.8, sag = 16, inWater = true;
    switch (f.phase) {
      case 'casting': {
        const p = f.t / f.dur;
        if (p < 0.45) { bx = tip.x + 2; by = tip.y + 10; sag = 2; inWater = false; }
        else { const u = (p - 0.45) / 0.55; bx = tip.x + (B.x - tip.x) * u; by = tip.y + (wy - 2 - tip.y) * u - Math.sin(u * Math.PI) * 26; sag = 4; inWater = u > 0.98; }
        break;
      }
      case 'waiting': {
        const near = f.dur - f.t < 1.2;
        if (near) by += Math.max(0, Math.sin(t * 13)) * 2; // 鱼在试探：一点一点往下点
        this.every('ripple', dt, near ? 0.32 : 1.5, () => this.ripple(bx, wy, 2, near ? 9 : 13, near ? 0.6 : 1.3, near ? 0.75 : 0.55));
        break;
      }
      case 'bite':
        by = wy + 3; bx += Math.sin(t * 30) * 1.2; sag = 6;
        this.every('ripple', dt, 0.22, () => this.ripple(bx, wy, 3, 18, 0.7, 0.9));
        this.every('splash', dt, 0.3, () => this.burst(bx, wy, 0, 2));
        break;
      case 'reeling': {
        const u = f.t / f.dur;
        if (f.escaped && u > 0.6) { bx = B.x - 30; by = wy - 2; sag = 14; }
        else { bx = B.x - u * 52; by = wy + 1; sag = 1; this.every('ripple', dt, 0.12, () => this.ripple(bx + 3, wy, 2, 10, 0.55, 0.8)); this.every('splash', dt, 0.25, () => this.burst(bx, wy, 0, 2)); }
        break;
      }
      case 'result': case 'idle': default:
        bx = tip.x + 2; by = tip.y + 12 + Math.sin(t * 3) * 1; sag = 1; inWater = false;
    }
    this.bobber = { x: bx, y: by, inWater };
    // 线：竿尖 → 浮漂，等鱼时垂一点，收线时绷直
    ctx.save();
    ctx.strokeStyle = 'rgba(255,255,255,0.85)'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(tip.x, tip.y);
    ctx.quadraticCurveTo((tip.x + bx) / 2, Math.max(tip.y, by) + sag - (inWater ? 0 : sag * 0.5), bx, by - 3);
    ctx.stroke();
    // 浮漂（像素）：上白下红
    const X = Math.round(bx), Y = Math.round(by);
    ctx.fillStyle = '#1b1424'; ctx.fillRect(X - 3, Y - 6, 6, 9); ctx.fillRect(X, Y - 9, 1, 3);
    ctx.fillStyle = '#ffffff'; ctx.fillRect(X - 2, Y - 5, 4, 3);
    ctx.fillStyle = '#e8443a'; ctx.fillRect(X - 2, Y - 2, 4, 4);
    ctx.restore();
  },
  every(key, dt, period, fn) { this.timers[key] -= dt; if (this.timers[key] <= 0) { this.timers[key] = period; fn(); } },

  // 一条窄窄的水面（两头渐隐），颜色跟着昼夜变
  drawWater(ctx, dt, day, sailing, bob) {
    const wy = PET.wy, t = this.t;
    const col = { dawn: [150, 175, 225], day: [90, 172, 232], dusk: [232, 150, 112], night: [44, 66, 128] }[day] || [90, 172, 232];
    for (let x = 4; x < PET.W - 4; x += 2) {
      const edge = Math.min(1, (x - 4) / 40, (PET.W - 4 - x) / 40);
      const a = 0.62 * Math.max(0, edge);
      const top = wy - 1 + Math.round(Math.sin(x * 0.14 + t * (sailing ? 4 : 2)) * 1.1);
      const g = ctx.createLinearGradient(0, top, 0, wy + 13);
      g.addColorStop(0, `rgba(${col[0] + 40},${col[1] + 40},${col[2] + 20},${a})`);
      g.addColorStop(0.25, `rgba(${col[0]},${col[1]},${col[2]},${a})`);
      g.addColorStop(1, `rgba(${col[0]},${col[1]},${col[2]},0)`);
      ctx.fillStyle = g; ctx.fillRect(x, top, 2, wy + 13 - top);
    }
    // 波光：几道短短的亮线慢慢漂
    ctx.fillStyle = 'rgba(255,255,255,0.55)';
    const speed = sailing ? 30 : 6;
    for (let i = 0; i < 7; i++) {
      const span = PET.W - 60, x = 30 + ((i * 37 + (sailing ? -1 : 1) * t * speed) % span + span) % span, y = wy + 3 + (i % 3) * 3;
      const len = 4 + (i % 3) * 2;
      ctx.globalAlpha = 0.35 + 0.35 * Math.sin(t * 2 + i);
      ctx.fillRect(Math.round(x), y, len, 1);
    }
    ctx.globalAlpha = 1;
    // 航行时船尾的水花
    if (sailing) this.every('wake', dt, 0.25, () => this.ripple(PET.boat.x + 6, wy + 1, 3, 14, 0.9, 0.6));
  },
  drawRipples(ctx, dt) {
    ctx.save(); ctx.lineWidth = 1;
    for (let i = this.ripples.length - 1; i >= 0; i--) {
      const R = this.ripples[i]; R.t += dt;
      if (R.t < 0) continue;
      if (R.t > R.life) { this.ripples.splice(i, 1); continue; }
      const p = R.t / R.life, rx = R.r0 + (R.r1 - R.r0) * (1 - (1 - p) * (1 - p));
      ctx.strokeStyle = `rgba(255,255,255,${R.a * (1 - p)})`;
      ctx.beginPath(); ctx.ellipse(R.x, R.y + 1, rx, Math.max(1, rx * 0.3), 0, 0, Math.PI * 2); ctx.stroke();
    }
    ctx.restore();
  },
  drawDrops(ctx, dt) {
    ctx.fillStyle = 'rgba(235,248,255,0.95)';
    for (let i = this.drops.length - 1; i >= 0; i--) {
      const d = this.drops[i]; d.t += dt; d.vy += 220 * dt; d.x += d.vx * dt; d.y += d.vy * dt;
      if (d.y > PET.wy + 1 && d.vy > 0) { this.drops.splice(i, 1); continue; }
      ctx.fillRect(Math.round(d.x), Math.round(d.y), 2, 2);
    }
  },
  drawFlyers(ctx, dt) {
    for (let i = this.flyers.length - 1; i >= 0; i--) {
      const F = this.flyers[i]; F.t += dt;
      const u = Math.min(1, F.t / F.dur);
      const x = F.x0 + (F.x1 - F.x0) * u, y = F.y0 + (F.y1 - F.y0) * u - Math.sin(u * Math.PI) * 46;
      const tint = F.rar === 'legendary' ? [['#ffd54f', 0.45]] : F.rar === 'epic' ? [['#d58cf0', 0.35]] : F.rar === 'rare' ? [['#4fc3f7', 0.3]] : null;
      ctx.save();
      if (u > 0.5) { ctx.beginPath(); ctx.rect(0, 0, PET.W, PET.boat.y + 2); ctx.clip(); } // 落进船舱：被船舷挡住
      Art.draw(ctx, 'cat', 'fish', x, y + 8, 0.34, { rot: -0.6 + u * 4.2, tint });
      ctx.restore();
      if (F.rar === 'legendary' || F.rar === 'epic') { ctx.fillStyle = '#fff6c8'; ctx.fillRect(Math.round(x + Math.sin(F.t * 20) * 8), Math.round(y - 4), 2, 2); }
      if (u >= 1) this.flyers.splice(i, 1);
    }
  },
  drawTexts(ctx, dt) {
    ctx.save(); ctx.font = '11px FusionPixel, "PingFang SC", monospace'; ctx.textAlign = 'center'; ctx.lineJoin = 'round';
    for (let i = this.texts.length - 1; i >= 0; i--) {
      const T = this.texts[i]; T.t += dt;
      if (T.t > T.life) { this.texts.splice(i, 1); continue; }
      if (T.t < 0) continue;
      const p = T.t / T.life;
      ctx.globalAlpha = p > 0.7 ? (1 - p) / 0.3 : 1;
      const y = Math.round(T.y - p * 10);
      ctx.strokeStyle = 'rgba(20,14,28,0.9)'; ctx.lineWidth = 3; ctx.strokeText(T.s, T.x, y);
      ctx.fillStyle = T.color; ctx.fillText(T.s, T.x, y);
    }
    ctx.restore();
  },
  badge(ctx, s, x, y) {
    ctx.save(); ctx.font = '13px "Apple Color Emoji", sans-serif'; ctx.textAlign = 'center';
    ctx.fillText(s, x, y - Math.abs(Math.sin(this.t * 3)) * 2); ctx.restore();
  },
  drawZzz(ctx, x, y) {
    ctx.save(); ctx.font = '10px FusionPixel, monospace'; ctx.fillStyle = 'rgba(255,255,255,0.9)'; ctx.strokeStyle = 'rgba(20,14,28,0.8)'; ctx.lineWidth = 3;
    for (let i = 0; i < 2; i++) {
      const k = (this.t * 0.5 + i * 0.5) % 1;
      ctx.globalAlpha = 1 - k; ctx.strokeText('z', x + k * 10, y - k * 16); ctx.fillText('z', x + k * 10, y - k * 16);
    }
    ctx.restore();
  },
  // 雨、雪：只在浮窗里飘一点点
  drawWeather(ctx, dt, weather) {
    const rain = weather === 'rain' || weather === 'storm', snow = weather === 'snow';
    if (rain || snow) {
      const want = weather === 'storm' ? 40 : rain ? 22 : 18;
      while (this.sky.length < want) this.sky.push({ x: rand(8, PET.W - 8), y: rand(-PET.H, PET.wy), v: snow ? rand(12, 22) : rand(110, 150), p: Math.random() * 6 });
    } else if (this.sky.length) this.sky = [];
    ctx.save();
    for (const d of this.sky) {
      d.y += d.v * dt; if (snow) d.x += Math.sin(this.t + d.p) * 6 * dt;
      if (d.y > PET.wy) { if (rain && Math.random() < 0.5) this.ripple(d.x, PET.wy, 1, 5, 0.4, 0.5); d.y = rand(-20, 0); d.x = rand(8, PET.W - 8); }
      const edge = Math.min(1, d.x / 30, (PET.W - d.x) / 30);
      if (snow) { ctx.fillStyle = `rgba(255,255,255,${0.85 * edge})`; ctx.fillRect(Math.round(d.x), Math.round(d.y), 2, 2); }
      else { ctx.fillStyle = `rgba(190,215,255,${0.55 * edge})`; ctx.fillRect(Math.round(d.x), Math.round(d.y), 1, 4); }
    }
    ctx.restore();
  },
};

// 宠物模式时接管整个画面；键盘不响应
CF.hook('view.render', (dt, view) => { if (!Pet.on) return false; Pet.render(dt, view); return true; });
CF.hook('ui.keyBlocked', () => Pet.on);

// 导航栏按钮（只在 Mac App 里出现）
if (window.__NATIVE__) UI.nav({ id: 'pet', label: '桌面宠物', icon: 'paw', order: 130, key: 'p', run: () => Pet.enter() });

window.Pet = Pet;

CF.module({
  id: 'pet',
  init() {
    Game.on('cast', () => Pet.onCast());
    Game.on('bite', () => Pet.onBite());
    Game.on('catch', d => Pet.onCatch(d));
    Game.on('escape', d => Pet.onEscape(d));
  },
  tick(dt) { Pet.tick(dt); },
});
