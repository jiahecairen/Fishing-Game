// ===== 冒险画面：航行中的船、目的地小岛、副本洞穴 =====
'use strict';

const DUNGEON_STYLE = {
  rat:     { wall: '#3a2c1e', wall2: '#5a4430', floor: '#241a12', torch: '#ffb347', deco: 'cheese' },
  falls:   { wall: '#173236', wall2: '#2a5257', floor: '#0e2124', torch: '#7fe0d8', deco: 'drip' },
  tide:    { wall: '#14284a', wall2: '#244a78', floor: '#0b1830', torch: '#6fc3ff', deco: 'bubble' },
  crystal: { wall: '#294260', wall2: '#6f9cc4', floor: '#1a2b40', torch: '#bdf2ff', deco: 'shard' },
  abyss:   { wall: '#1d1033', wall2: '#46287a', floor: '#100820', torch: '#c58cff', deco: 'bubble' },
};

Object.assign(Renderer, {
  drawVoyageFar(ctx, shade, W, H, hz, night) {
    const v = Game.S.voyage; if (!v) return;
    const p = clamp(v.t / v.dur, 0, 1);
    const to = v.to;
    const col = { river: '#56705a', sea: '#7a6a50', ice: '#dfe9f2', abyss: '#3a2457', lake: '#4f7a4f' }[to] || '#56705a';
    // 远处海平线的小岛，越接近越大
    const x = W * (0.95 - p * 0.15), s = 0.25 + p * 0.85;
    ctx.fillStyle = shade(col, 0.8);
    ctx.beginPath(); ctx.ellipse(x, hz + 1, W * 0.12 * s, H * 0.06 * s, 0, Math.PI, 0); ctx.fill();
    if (to === 'abyss') {
      const g = ctx.createRadialGradient(x, hz - H * 0.03 * s, 2, x, hz, W * 0.15 * s);
      g.addColorStop(0, `rgba(190,120,255,${0.35 + 0.15 * Math.sin(this.t * 2)})`); g.addColorStop(1, 'rgba(190,120,255,0)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, hz, W * 0.15 * s, 0, 7); ctx.fill();
    } else if (to === 'ice') {
      ctx.fillStyle = shade('#ffffff', 0.7);
      ctx.beginPath(); ctx.moveTo(x - W * 0.05 * s, hz); ctx.lineTo(x, hz - H * 0.09 * s); ctx.lineTo(x + W * 0.06 * s, hz); ctx.fill();
    } else {
      for (let i = -2; i <= 2; i++) this.pine(ctx, x + i * W * 0.02 * s, hz - H * 0.035 * s * (1 - Math.abs(i) * 0.3), H * 0.04 * s, shade('#2c4a32', 0.85));
    }
    // 远处的海鸥
    ctx.strokeStyle = shade('#ffffff', 0.6); ctx.lineWidth = 1.5;
    for (let i = 0; i < 3; i++) {
      const gx = ((this.t * 25 + i * 300) % (W + 200)) - 100, gy = hz * (0.45 + i * 0.12) + Math.sin(this.t * 2 + i) * 8;
      const f = Math.sin(this.t * 8 + i) * 4;
      ctx.beginPath(); ctx.moveTo(gx - 8, gy - f); ctx.quadraticCurveTo(gx - 4, gy - 5, gx, gy); ctx.quadraticCurveTo(gx + 4, gy - 5, gx + 8, gy - f); ctx.stroke();
    }
  },

  drawBoat(ctx, dt, shade, night) {
    const W = this.W, H = this.H, hz = this.horizon, S = Game.S;
    const tier = Math.max(1, S.boat);
    const x = W * 0.36, wl = hz + (H - hz) * 0.5;
    const bob = Math.sin(this.t * 1.6) * 5, tilt = Math.sin(this.t * 1.1) * 0.035;
    const w = W * 0.13 + tier * W * 0.02, h = H * 0.06;
    // 尾迹
    ctx.strokeStyle = 'rgba(255,255,255,0.35)'; ctx.lineWidth = 2;
    for (let i = 0; i < 6; i++) {
      const k = ((this.t * 0.8 + i / 6) % 1);
      ctx.globalAlpha = 1 - k;
      ctx.beginPath(); ctx.ellipse(x - w - k * W * 0.25, wl + 6 + k * 10, 20 + k * 60, 3 + k * 4, 0, 0, Math.PI); ctx.stroke();
    }
    ctx.globalAlpha = 1;
    ctx.save();
    ctx.translate(x, wl + bob); ctx.rotate(tilt);
    // 帆
    if (tier >= 2) {
      ctx.fillStyle = shade('#6b4a2a', 0.7); ctx.fillRect(-4, -H * 0.36, 7, H * 0.36);
      ctx.fillStyle = shade(tier === 3 ? '#f2e6d0' : '#fbf6ea', 0.6);
      const puff = Math.sin(this.t * 1.3) * 6;
      ctx.beginPath(); ctx.moveTo(6, -H * 0.34); ctx.quadraticCurveTo(w * 0.75 + puff, -H * 0.2, 6, -h * 0.4); ctx.closePath(); ctx.fill();
      ctx.beginPath(); ctx.moveTo(-6, -H * 0.3); ctx.quadraticCurveTo(-w * 0.55 - puff, -H * 0.17, -6, -h * 0.4); ctx.closePath(); ctx.fill();
      ctx.fillStyle = shade('#e85a4f', 0.6);
      ctx.beginPath(); ctx.moveTo(3, -H * 0.36); ctx.lineTo(30, -H * 0.345 + Math.sin(this.t * 6) * 3); ctx.lineTo(3, -H * 0.33); ctx.fill();
    }
    // 船身
    const hull = tier === 3 ? '#5a6470' : '#8b5e3c', trim = tier === 3 ? '#c0392b' : '#d9b25a';
    ctx.fillStyle = shade(hull, 0.75);
    ctx.beginPath(); ctx.moveTo(-w, -h * 0.4); ctx.lineTo(w * 1.08, -h * 0.55); ctx.quadraticCurveTo(w * 0.9, h * 0.7, w * 0.5, h * 0.75);
    ctx.lineTo(-w * 0.8, h * 0.75); ctx.quadraticCurveTo(-w * 1.02, h * 0.3, -w, -h * 0.4); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,0.3)'; ctx.lineWidth = 2; ctx.stroke();
    ctx.fillStyle = shade(trim, 0.7); ctx.fillRect(-w, -h * 0.45, w * 2.05, h * 0.16);
    if (tier === 1) { // 船桨
      const a = Math.sin(this.t * 2.5) * 0.5;
      ctx.strokeStyle = shade('#6b4a2a', 0.7); ctx.lineWidth = 4;
      ctx.beginPath(); ctx.moveTo(w * 0.1, -h * 0.4); ctx.lineTo(w * 0.1 + Math.cos(a + 1.2) * h * 1.8, -h * 0.4 + Math.sin(a + 1.2) * h * 1.8); ctx.stroke();
    }
    // 窗口灯光
    if (night > 0.4) { ctx.fillStyle = 'rgba(255,210,120,0.9)'; for (let i = 0; i < tier; i++) { ctx.beginPath(); ctx.arc(-w * 0.5 + i * w * 0.45, h * 0.1, 4, 0, 7); ctx.fill(); } }
    ctx.restore();
    // 小猫坐在船上
    const s = this.catS * 0.9;
    this.drawCat(ctx, x - w * 0.45, wl + bob - h * 0.42, s, shade, { phase: 'idle' });
    // 水桶里的泡泡
    const bx = x + w * 0.55, by = wl + bob - h * 0.45;
    ctx.fillStyle = shade('#7aa0b8', 0.8);
    ctx.beginPath(); ctx.moveTo(bx - 12, by - 20); ctx.lineTo(bx + 12, by - 20); ctx.lineTo(bx + 10, by); ctx.lineTo(bx - 10, by); ctx.closePath(); ctx.fill();
    ctx.save(); ctx.translate(bx, by - 24 + Math.sin(this.t * 3) * 2); drawFishShape(ctx, { id: 'pao', shape: 'fish', c1: '#ff8a3d', c2: '#ffd08a' }, 22, { t: this.t }); ctx.restore();
  },

  frameDungeon(dt) {
    const ctx = this.ctx, W = this.W, H = this.H, D = Game.S.dungeon;
    if (!D) return;
    const st = DUNGEON_STYLE[D.id] || DUNGEON_STYLE.rat;
    const walking = D.phase === 'walk' && !Adv.battle && !Adv.storyActive();
    this.dOff = (this.dOff || 0) + (walking ? dt * 70 : 0);
    const floorY = H * 0.7;
    let g = ctx.createLinearGradient(0, 0, 0, floorY);
    g.addColorStop(0, '#05030a'); g.addColorStop(0.3, st.wall); g.addColorStop(1, st.wall2);
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, floorY);
    // 砖墙
    ctx.strokeStyle = 'rgba(0,0,0,0.28)'; ctx.lineWidth = 2;
    const bw = 90, bh = 42;
    for (let row = 0; row * bh < floorY; row++) {
      const y = row * bh, shift = (row % 2) * bw / 2 - (this.dOff % bw);
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
      for (let x = shift - bw; x < W + bw; x += bw) { ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y + bh); ctx.stroke(); }
    }
    // 火把
    const tg = 420, off = this.dOff % tg;
    for (let x = -off + 120; x < W + tg; x += tg) {
      const ty = floorY * 0.45, fl = 0.85 + 0.15 * Math.sin(this.t * 13 + x);
      const rg = ctx.createRadialGradient(x, ty, 4, x, ty, 170 * fl);
      rg.addColorStop(0, hexA(st.torch, 0.45)); rg.addColorStop(1, hexA(st.torch, 0));
      ctx.fillStyle = rg; ctx.beginPath(); ctx.arc(x, ty, 170 * fl, 0, 7); ctx.fill();
      ctx.fillStyle = '#3a2a1a'; ctx.fillRect(x - 4, ty, 8, 34);
      ctx.fillStyle = st.torch; ctx.beginPath(); ctx.ellipse(x, ty - 6, 8 * fl, 15 * fl, 0, 0, 7); ctx.fill();
      ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.ellipse(x, ty - 3, 3, 6, 0, 0, 7); ctx.fill();
    }
    // 地面
    g = ctx.createLinearGradient(0, floorY, 0, H);
    g.addColorStop(0, st.floor); g.addColorStop(1, '#000');
    ctx.fillStyle = g; ctx.fillRect(0, floorY, W, H - floorY);
    ctx.strokeStyle = 'rgba(255,255,255,0.05)';
    for (let i = -10; i < 20; i++) { const x0 = i * 120 - (this.dOff * 1.4 % 120); ctx.beginPath(); ctx.moveTo(x0, floorY); ctx.lineTo(x0 - 200, H); ctx.stroke(); }
    // 装饰粒子
    this.dParts = this.dParts || [];
    if (this.dParts.length < 40) this.dParts.push({ x: Math.random() * W, y: Math.random() * H, v: rand(10, 40), r: rand(1, 3.5) });
    for (const p of this.dParts) {
      if (st.deco === 'bubble') { p.y -= p.v * dt; if (p.y < 0) p.y = H; ctx.strokeStyle = 'rgba(200,230,255,0.4)'; ctx.beginPath(); ctx.arc(p.x, p.y, p.r * 1.5, 0, 7); ctx.stroke(); }
      else if (st.deco === 'drip') { p.y += p.v * 4 * dt; if (p.y > floorY) p.y = 0; ctx.fillStyle = 'rgba(160,230,230,0.5)'; ctx.fillRect(p.x, p.y, 1.5, 6); }
      else if (st.deco === 'shard') { p.y += p.v * 0.5 * dt; if (p.y > H) p.y = 0; ctx.fillStyle = 'rgba(220,245,255,0.6)'; ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(this.t + p.x); ctx.fillRect(-p.r, -p.r, p.r * 2, p.r * 2); ctx.restore(); }
      else { p.y += p.v * 0.3 * dt; p.x += Math.sin(this.t + p.y) * 0.3; if (p.y > H) p.y = 0; ctx.fillStyle = 'rgba(255,220,150,0.25)'; ctx.fillRect(p.x, p.y, p.r, p.r); }
    }
    // 小猫
    const s = this.catS, cx = W * 0.3, bob = walking ? Math.abs(Math.sin(this.t * 8)) * 6 : 0;
    ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.beginPath(); ctx.ellipse(cx + s * 0.1, floorY + s * 0.02 + 30, s * 0.5, s * 0.08, 0, 0, 7); ctx.fill();
    this.drawCat(ctx, cx, floorY + 30 - bob, s, c => c, { phase: 'idle' });
    // 前方的门（boss 房）
    if (D.phase === 'boss' || D.phase === 'bossTalk' || D.phase === 'bossWait') {
      const dx = W * 0.72;
      ctx.fillStyle = '#120a06'; ctx.beginPath(); ctx.moveTo(dx - 90, floorY); ctx.lineTo(dx - 90, floorY - 200); ctx.quadraticCurveTo(dx, floorY - 290, dx + 90, floorY - 200); ctx.lineTo(dx + 90, floorY); ctx.fill();
      ctx.strokeStyle = st.torch; ctx.lineWidth = 4; ctx.stroke();
      const bimg = this.sprImg(DUNGEONS.find(x => x.id === D.id).boss);
      if (bimg.complete && bimg.width) { ctx.imageSmoothingEnabled = false; ctx.globalAlpha = 0.85 + 0.15 * Math.sin(this.t * 3); ctx.drawImage(bimg, dx - 60, floorY - 200 + Math.sin(this.t * 2) * 6, 120, 120); ctx.globalAlpha = 1; }
    }
    // 闪光（战斗受击）
    if (this.flash > 0) { ctx.fillStyle = `rgba(255,255,255,${this.flash})`; ctx.fillRect(0, 0, W, H); this.flash -= dt * 2.5; }
  },
});
Renderer.sprImg = function (id) {
  this._spr = this._spr || {};
  if (!this._spr[id]) { const im = new Image(); im.src = spriteURL(id, 4); this._spr[id] = im; }
  return this._spr[id];
};
function hexA(h, a) { const c = hex2rgb(h); return `rgba(${c[0]},${c[1]},${c[2]},${a})`; }
