// ===== 副本 · 画面：一直往前走的地下通道 =====
// 每个副本的配色来自副本文件里的 style：{ wall, wall2, floor, torch, deco: bubble|drip|shard|dust }
'use strict';

const DungeonRender = {
  frame(dt) {
    const R = Renderer;
    R.t += dt;
    const ctx = R.ctx, W = R.W, H = R.H, D = Game.S.dungeon;
    if (!D) return;
    const def = Dungeon.def(), st = def.style;
    const walking = D.phase === 'walk' && !Battle.battle && !Story.active;
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
      const ty = floorY * 0.45, fl = 0.85 + 0.15 * Math.sin(R.t * 13 + x);
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
      else if (st.deco === 'shard') { p.y += p.v * 0.5 * dt; if (p.y > H) p.y = 0; ctx.fillStyle = 'rgba(220,245,255,0.6)'; ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(R.t + p.x); ctx.fillRect(-p.r, -p.r, p.r * 2, p.r * 2); ctx.restore(); }
      else { p.y += p.v * 0.3 * dt; p.x += Math.sin(R.t + p.y) * 0.3; if (p.y > H) p.y = 0; ctx.fillStyle = 'rgba(255,220,150,0.25)'; ctx.fillRect(p.x, p.y, p.r, p.r); }
    }
    // 小猫
    const art = R.artOn(), s = R.catS, cx = W * 0.3, bob = walking && !art ? Math.abs(Math.sin(R.t * 8)) * 6 : 0;
    ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.beginPath(); ctx.ellipse(cx + s * 0.1, floorY + s * 0.02 + 30, s * 0.5, s * 0.08, 0, 0, 7); ctx.fill();
    // 像素图集：走路时播放走路动画，停下来（战斗、剧情、boss 房前）就站着左右张望
    R.drawCat(ctx, cx, floorY + 30 - bob, s, c => c, { phase: 'idle', pose: walking ? 'walk' : (D.phase === 'boss' || D.phase === 'bossWait' ? 'idle' : 'look'), shadow: false });
    // 前方的门（boss 房）
    if (D.phase === 'boss' || D.phase === 'bossTalk' || D.phase === 'bossWait') {
      const dx = W * 0.72;
      ctx.fillStyle = '#120a06'; ctx.beginPath(); ctx.moveTo(dx - 90, floorY); ctx.lineTo(dx - 90, floorY - 200); ctx.quadraticCurveTo(dx, floorY - 290, dx + 90, floorY - 200); ctx.lineTo(dx + 90, floorY); ctx.fill();
      ctx.strokeStyle = st.torch; ctx.lineWidth = 4; ctx.stroke();
      const bimg = this.sprImg(def.boss);
      if (bimg.complete && bimg.width) { ctx.imageSmoothingEnabled = false; ctx.globalAlpha = 0.85 + 0.15 * Math.sin(R.t * 3); ctx.drawImage(bimg, dx - 60, floorY - 200 + Math.sin(R.t * 2) * 6, 120, 120); ctx.globalAlpha = 1; }
    }
    // 闪光（战斗受击）
    if (R.flash > 0) { ctx.fillStyle = `rgba(255,255,255,${R.flash})`; ctx.fillRect(0, 0, W, H); R.flash -= dt * 2.5; }
  },
  sprImg(id) {
    this._spr = this._spr || {};
    if (!this._spr[id]) { const im = new Image(); im.src = spriteURL(id, 4); this._spr[id] = im; }
    return this._spr[id];
  },
};
