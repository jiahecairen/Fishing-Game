// ===== 像素战斗场景：宝可梦式的站位、攻击/受击动作、打击特效 =====
// 内部分辨率 240×135，整数倍放大显示，保证像素清晰
'use strict';

const BW = 240, BH = 135;
const BattleFX = {
  cv: null, ctx: null, t: 0, shake: 0,
  hero: { x: 0, y: 0, flash: 0, shakeT: 0, alpha: 1, lunge: 0, lungeDir: 1 },
  foe: { x: 0, y: 0, flash: 0, shakeT: 0, alpha: 1, lunge: 0, sink: 0, frozen: 0 },
  parts: [], nums: [], fx: [], queue: [],

  init() {
    this.cv = document.getElementById('b-canvas');
    this.cv.width = BW; this.cv.height = BH;
    this.ctx = this.cv.getContext('2d');
    this.ctx.imageSmoothingEnabled = false;
    Game.on('battleStart', B => this.start(B));
    Game.on('battleLog', B => this.onStep(B));
  },
  start(B) {
    this.B = B; this.parts = []; this.nums = []; this.fx = []; this.queue = [];
    Object.assign(this.hero, { flash: 0, shakeT: 0, alpha: 1, lunge: 0 });
    Object.assign(this.foe, { flash: 0, shakeT: 0, alpha: 0, lunge: 0, sink: 0, frozen: 0, enter: 1 });
    this.hero.enter = 1;
    this.theme = this.pickTheme();
  },
  pickTheme() {
    const S = Game.S;
    if (S.mode === 'dungeon' && S.dungeon) return { kind: 'cave', st: DUNGEON_STYLE[S.dungeon.id] || DUNGEON_STYLE.rat };
    if (S.mode === 'voyage') return { kind: 'sea', scene: 'sea' };
    return { kind: 'out', scene: S.scene };
  },
  // 位置
  get foePos() { return { x: 176, y: 70 }; },
  get heroPos() { return { x: 56, y: 122 }; },

  onStep(B) {
    const f = B.fx; if (!f) return;
    const hp = this.heroPos, fp = this.foePos;
    if (f.who === 'foe' && f.kind === 'hit') { // 小橘攻击
      this.lunge(this.hero, 1);
      this.later(0.12, () => this.skillFx(f.skill || 'punch', fp, f));
      this.later(0.2, () => { this.hitTarget(this.foe, fp, f.n, f.crit); });
    } else if (f.who === 'hero' && f.kind === 'hit') { // 怪物攻击
      this.lunge(this.foe, -1);
      this.later(0.14, () => this.enemyFx(hp, f.foeSkill));
      this.later(0.22, () => this.hitTarget(this.hero, hp, f.n, false, f.foeSkill));
    } else if (f.kind === 'heal') {
      for (let i = 0; i < 16; i++) this.part(hp.x + rand(-18, 18), hp.y - rand(0, 40), rand(-6, 6), rand(-30, -12), '#7cff9a', 0.9, 2);
      this.num(hp.x, hp.y - 52, '+', '#7cff9a');
    } else if (f.kind === 'buff') {
      this.fx.push({ type: 'shield', x: hp.x, y: hp.y - 26, t: 0, life: 0.8 });
    } else if (f.kind === 'dodge') {
      this.lunge(this.foe, -1);
      this.hero.dodge = 0.5;
      this.later(0.2, () => this.num(hp.x + 10, hp.y - 50, 'MISS', '#e0f2ff'));
    } else if (f.kind === 'frozen') {
      this.foe.frozen = 0.9;
      this.num(fp.x, fp.y - 52, '冻结', '#9fe8ff');
    }
    if (B.over && (B.result === 'win' || B.result === 'spare')) this.later(0.5, () => { this.foe.dying = true; });
    if (B.over && B.result === 'lose') this.later(0.5, () => { this.hero.dying = true; });
  },
  later(sec, fn) { this.queue.push({ t: sec, fn }); },
  lunge(o, dir) { o.lunge = 0.3; o.lungeDir = dir; },
  hitTarget(o, p, n, crit, big) {
    o.flash = 0.36; o.shakeT = 0.3;
    this.shake = Math.max(this.shake, crit || big ? 0.35 : 0.15);
    if (n !== undefined) this.num(p.x + rand(-6, 6), p.y - 50, String(n), crit ? '#ffe14a' : (o === this.hero ? '#ff6b6b' : '#ffffff'), crit);
    if (crit) this.num(p.x, p.y - 64, '会心一击!', '#ffb300');
    for (let i = 0; i < (crit ? 18 : 10); i++) this.part(p.x + rand(-6, 6), p.y - 24 + rand(-6, 6), rand(-60, 60), rand(-70, 10), crit ? '#ffe14a' : '#ffffff', 0.5, 2);
  },
  skillFx(id, p, f) {
    if (id === 'claw') {
      for (let i = 0; i < (f.hits || 2); i++) this.fx.push({ type: 'slash', x: p.x - 4 + i * 8, y: p.y - 30, t: -i * 0.12, life: 0.3 });
    } else if (id === 'bone') {
      const hp = this.heroPos;
      this.fx.push({ type: 'proj', x0: hp.x + 10, y0: hp.y - 30, x1: p.x, y1: p.y - 24, t: -0.05, life: 0.25 });
      this.later(0.25, () => this.fx.push({ type: 'burst', x: p.x, y: p.y - 24, t: 0, life: 0.35, color: '#f4efe0' }));
    } else if (id === 'sweep') {
      this.fx.push({ type: 'arc', x: p.x, y: p.y - 24, t: 0, life: 0.45 });
      this.shake = 0.45;
    } else this.fx.push({ type: 'star', x: p.x, y: p.y - 26, t: 0, life: 0.25 });
  },
  enemyFx(p, big) {
    const pal = (SPRITES[this.B.foe.id] || {}).pal || {};
    const col = Object.values(pal).find(c => c !== SPR_K && c !== '#fff' && c !== '#ffffff') || '#ff6b6b';
    if (big) { this.fx.push({ type: 'burst', x: p.x, y: p.y - 26, t: 0, life: 0.45, color: col, big: true }); this.shake = 0.4; }
    else this.fx.push({ type: 'star', x: p.x, y: p.y - 28, t: 0, life: 0.25, color: '#ffd0d0' });
  },
  part(x, y, vx, vy, color, life, s) { this.parts.push({ x, y, vx, vy, color, life, t: 0, s: s || 2 }); },
  num(x, y, text, color, big) { this.nums.push({ x, y, text, color, t: 0, big }); },

  // ---------- 绘制 ----------
  frame(dt) {
    if (!this.cv || !this.B || $('#battle').classList.contains('hidden')) return;
    this.t += dt;
    for (let i = this.queue.length - 1; i >= 0; i--) { const q = this.queue[i]; q.t -= dt; if (q.t <= 0) { this.queue.splice(i, 1); q.fn(); } }
    const x = this.ctx, B = this.B;
    x.save();
    if (this.shake > 0) { this.shake -= dt; x.translate(Math.round(rand(-3, 3) * this.shake * 6), Math.round(rand(-2, 2) * this.shake * 6)); }
    this.drawBg(x);
    // 站台
    const fp = this.foePos, hp = this.heroPos;
    this.platform(x, fp.x, fp.y + 2, 46, 8);
    this.platform(x, hp.x, hp.y + 3, 44, 8);
    // 敌人
    const F = this.foe;
    if (F.enter > 0) { F.enter = Math.max(0, F.enter - dt * 2.5); }
    F.alpha = F.dying ? Math.max(0, F.alpha - dt * 1.6) : Math.min(1, F.alpha + dt * 4);
    if (F.dying) F.sink = Math.min(20, F.sink + dt * 30);
    const foeSc = B.foe.boss ? 3 : 3;
    this.drawUnit(x, B.foe.id, foeSc, fp.x + F.enter * 120, fp.y + F.sink, F, -1, dt, 0);
    if (F.frozen > 0) { F.frozen -= dt; const img = spriteCanvas(B.foe.id, foeSc); x.fillStyle = 'rgba(150,220,255,0.45)'; x.fillRect(fp.x - img.width / 2 + 2, fp.y - img.height + 2, img.width - 4, img.height - 4); }
    // 小橘
    const H = this.hero;
    if (H.enter > 0) H.enter = Math.max(0, H.enter - dt * 2.5);
    if (H.dying) H.alpha = Math.max(0.2, H.alpha - dt * 1.2);
    let hx = hp.x - H.enter * 120;
    if (H.dodge > 0) { H.dodge -= dt; hx -= Math.sin((0.5 - H.dodge) / 0.5 * Math.PI) * 18; }
    this.drawUnit(x, 'hero', 3, hx, hp.y, H, 1, dt, 1.7);
    // 护盾
    if (B.guard) { x.strokeStyle = `rgba(140,210,255,${0.5 + 0.3 * Math.sin(this.t * 6)})`; x.lineWidth = 1; this.pixelCircle(x, hp.x, hp.y - 30, 30); }
    this.drawFx(x, dt);
    // 粒子
    for (let i = this.parts.length - 1; i >= 0; i--) {
      const p = this.parts[i]; p.t += dt; if (p.t > p.life) { this.parts.splice(i, 1); continue; }
      p.vy += 160 * dt; p.x += p.vx * dt; p.y += p.vy * dt;
      x.globalAlpha = 1 - p.t / p.life; x.fillStyle = p.color; x.fillRect(Math.round(p.x), Math.round(p.y), p.s, p.s);
    }
    x.globalAlpha = 1;
    // 伤害数字
    x.textAlign = 'center'; x.textBaseline = 'middle';
    for (let i = this.nums.length - 1; i >= 0; i--) {
      const n = this.nums[i]; n.t += dt; if (n.t > 0.9) { this.nums.splice(i, 1); continue; }
      const k = n.t / 0.9, y = Math.round(n.y - Math.min(1, n.t * 5) * 8 - k * 4);
      x.font = `${n.big ? 24 : 12}px FusionPixel, monospace`;
      x.globalAlpha = k > 0.7 ? (1 - k) / 0.3 : 1;
      x.fillStyle = '#000'; for (const [ox, oy] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) x.fillText(n.text, Math.round(n.x) + ox, y + oy);
      x.fillStyle = n.color; x.fillText(n.text, Math.round(n.x), y);
    }
    x.globalAlpha = 1;
    x.restore();
  },
  drawUnit(x, id, sc, cx, by, o, dir, dt, phase) {
    const img = spriteCanvas(id, sc); if (!img) return;
    const wimg = spriteCanvas(id, sc, true);
    let dx = 0, dy = Math.round(Math.sin(this.t * 3 + phase) * 1.2);
    if (o.lunge > 0) { o.lunge -= dt; const k = Math.sin((0.3 - o.lunge) / 0.3 * Math.PI); dx = Math.round(k * 16 * o.lungeDir); dy -= Math.round(k * 6 * o.lungeDir); }
    if (o.shakeT > 0) { o.shakeT -= dt; dx += Math.round(Math.sin(o.shakeT * 70) * 3); }
    const px = Math.round(cx - img.width / 2 + dx), py = Math.round(by - img.height + dy);
    x.globalAlpha = o.alpha;
    // 阴影
    x.fillStyle = 'rgba(0,0,0,0.25)'; x.fillRect(Math.round(cx - img.width / 3), by - 1, Math.round(img.width / 1.5), 2);
    x.drawImage(img, px, py);
    if (o.flash > 0) { o.flash -= dt; if (Math.floor(o.flash * 20) % 2 === 0) x.drawImage(wimg, px, py); }
    x.globalAlpha = 1;
  },
  platform(x, cx, cy, rw, rh) {
    const th = this.theme;
    const col = th.kind === 'cave' ? th.st.floor : { lake: '#6aa84f', river: '#7d9a5a', bamboo: '#6f9a4a', sea: '#d9c38a', coral: '#f0d9a0', ice: '#e6f2fa', abyss: '#5a4a7a' }[th.scene] || '#7a9a5a';
    for (let yy = -rh; yy <= rh; yy++) {
      const w = Math.round(rw * Math.sqrt(1 - (yy * yy) / (rh * rh)));
      x.fillStyle = yy < -rh / 2 ? mix(col, '#ffffff', 0.15) : yy > rh / 2 ? mix(col, '#000000', 0.25) : col;
      x.fillRect(cx - w, cy + yy, w * 2, 1);
    }
  },
  pixelCircle(x, cx, cy, r) {
    for (let a = 0; a < 64; a++) { const t = a / 64 * Math.PI * 2; x.fillStyle = x.strokeStyle; x.fillRect(Math.round(cx + Math.cos(t) * r), Math.round(cy + Math.sin(t) * r * 0.9), 1, 1); }
  },
  drawFx(x, dt) {
    for (let i = this.fx.length - 1; i >= 0; i--) {
      const e = this.fx[i]; e.t += dt; if (e.t < 0) continue; if (e.t > e.life) { this.fx.splice(i, 1); continue; }
      const k = e.t / e.life;
      if (e.type === 'slash') {
        x.fillStyle = '#ffffff';
        for (let j = 0; j < 3; j++) { const len = Math.round(26 * Math.min(1, k * 2)); for (let s = 0; s < len; s++) x.fillRect(e.x - 13 + s + j * 4, e.y - 13 + s - j * 2, 2, 1); }
      } else if (e.type === 'proj') {
        const px = e.x0 + (e.x1 - e.x0) * k, py = e.y0 + (e.y1 - e.y0) * k - Math.sin(k * Math.PI) * 18;
        x.save(); x.translate(Math.round(px), Math.round(py)); x.rotate(this.t * 20);
        x.fillStyle = '#f4efe0'; x.fillRect(-6, -1, 12, 2); x.fillRect(-6, -3, 2, 6); x.fillRect(4, -3, 2, 6);
        x.restore();
      } else if (e.type === 'arc') {
        x.fillStyle = `rgba(255,230,140,${1 - k})`;
        for (let a = -1.2; a < 1.2; a += 0.05) { const r = 34 + Math.sin(k * Math.PI) * 6; if (a / 2.4 + 0.5 > k * 1.4) continue; x.fillRect(Math.round(e.x + Math.cos(a + Math.PI) * -r), Math.round(e.y + Math.sin(a) * r * 0.7), 3, 3); }
        if (e.t < dt * 2) for (let j = 0; j < 24; j++) this.part(e.x + rand(-20, 20), e.y + rand(-16, 16), rand(-80, 80), rand(-80, 20), '#ffe082', 0.6, 2);
      } else if (e.type === 'star' || e.type === 'burst') {
        const r = Math.round((e.big ? 22 : e.type === 'burst' ? 14 : 9) * Math.min(1, k * 1.6));
        x.fillStyle = e.color || '#ffffff'; x.globalAlpha = 1 - k;
        for (let a = 0; a < 8; a++) { const t = a / 8 * Math.PI * 2; for (let s = r * 0.4; s < r; s += 2) x.fillRect(Math.round(e.x + Math.cos(t) * s), Math.round(e.y + Math.sin(t) * s), 2, 2); }
        x.globalAlpha = 1;
      } else if (e.type === 'shield') {
        x.strokeStyle = `rgba(160,220,255,${1 - k})`; this.pixelCircle(x, e.x, e.y, 18 + k * 16);
      }
    }
  },
  drawBg(x) {
    const th = this.theme;
    if (th.kind === 'cave') {
      const st = th.st;
      x.fillStyle = st.wall; x.fillRect(0, 0, BW, BH);
      x.fillStyle = mix(st.wall, '#000', 0.35);
      for (let r = 0; r < 7; r++) for (let c = -1; c < 13; c++) x.fillRect(c * 20 + (r % 2) * 10, r * 12, 19, 1), x.fillRect(c * 20 + (r % 2) * 10, r * 12, 1, 12);
      for (const tx of [30, 210]) { const g = 0.6 + 0.4 * Math.sin(this.t * 10 + tx); x.fillStyle = hexA(st.torch, 0.18 * g); x.fillRect(tx - 18, 12, 36, 36); x.fillStyle = st.torch; x.fillRect(tx - 1, 22, 3, 5); x.fillStyle = '#3a2a1a'; x.fillRect(tx - 1, 27, 3, 8); }
      x.fillStyle = st.floor; x.fillRect(0, 84, BW, BH - 84);
      x.fillStyle = mix(st.floor, '#fff', 0.08); for (let i = 0; i < 30; i++) x.fillRect((i * 37) % BW, 88 + (i * 13) % 44, 3, 1);
      return;
    }
    const h = Game.hour(), sky = Renderer.skyColors(h, Game.S.weather);
    for (let y = 0; y < 64; y += 2) { x.fillStyle = rgbStr(mixRGB(sky.top, sky.bot, y / 64)); x.fillRect(0, y, BW, 2); }
    const sc = th.scene, light = Renderer.daylight(h);
    const sh = (c, k) => rgbStr(mixRGB(mixArr(c, '#000000', k || 0), [10, 16, 48], (1 - light) * 0.75));
    // 远景
    x.fillStyle = sh({ lake: '#5f8f5c', river: '#6b7d6a', bamboo: '#4f7a3a', sea: '#8aa6c0', coral: '#7fbf9a', ice: '#d7e4f0', abyss: '#3b2a5e' }[sc] || '#5f8f5c');
    for (let i = 0; i < BW; i += 2) { const hh = sc === 'sea' || sc === 'coral' ? (i > 150 && i < 200 ? 6 : 0) : 6 + Math.round(5 * Math.sin(i * 0.05) + 3 * Math.sin(i * 0.13)); x.fillRect(i, 64 - hh, 2, hh); }
    if (sc === 'bamboo') { x.fillStyle = sh('#3f6f2a'); for (let i = 0; i < 14; i++) x.fillRect(8 + i * 17, 10, 2, 54); }
    // 水面 / 地面
    const water = { lake: '#4f8fb0', river: '#4fa3a8', bamboo: '#3f7f6a', sea: '#2f7fc0', coral: '#3fc0c8', ice: '#9fd0e0', abyss: '#4a2f7a' }[sc] || '#4f8fb0';
    for (let y = 64; y < BH; y += 2) { x.fillStyle = sh(water, (y - 64) / 140); x.fillRect(0, y, BW, 2); }
    x.fillStyle = 'rgba(255,255,255,0.25)';
    for (let i = 0; i < 16; i++) { const yy = 68 + (i * 7) % 60, xx = Math.round((i * 53 + this.t * (8 + i % 4 * 4)) % (BW + 20)) - 10; x.fillRect(xx, yy, 6 + i % 3 * 3, 1); }
  },
};
