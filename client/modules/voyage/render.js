// ===== 航海 · 画面：远方的目的地、海上的船 =====
// 天空、云、水面复用钓鱼模块的 Renderer.frameOutdoor，这里只画远景和船。
'use strict';

// 注意：这两个函数由 Renderer.frameOutdoor 调用，里面的 this 是 Renderer（可以用它的 t、W、H、drawCat 等）
const VoyageRender = {
  far(ctx, shade, W, H, hz, night) {
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

  boat(ctx, dt, shade, night) {
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
    this.drawCat(ctx, x - w * 0.45, wl + bob - h * 0.42, s, shade, { phase: 'idle', pose: 'idle', shadow: false });
    // 水桶里的泡泡
    const bx = x + w * 0.55, by = wl + bob - h * 0.45;
    ctx.fillStyle = shade('#7aa0b8', 0.8);
    ctx.beginPath(); ctx.moveTo(bx - 12, by - 20); ctx.lineTo(bx + 12, by - 20); ctx.lineTo(bx + 10, by); ctx.lineTo(bx - 10, by); ctx.closePath(); ctx.fill();
    ctx.save(); ctx.translate(bx, by - 24 + Math.sin(this.t * 3) * 2); drawFishShape(ctx, { id: 'pao', shape: 'fish', c1: '#ff8a3d', c2: '#ffd08a' }, 22, { t: this.t }); ctx.restore();
  },
};
