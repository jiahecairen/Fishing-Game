// ===== 钓鱼 · 画面：天色、天气、钓点风景、小猫、鱼 =====
// Renderer.frameOutdoor(dt, opt) 画一整幅户外场景。航海模块会传入自己的远景和前景（船），
// 以后的新模式（比如潜水）也可以复用这里的天空、云、水面。
'use strict';

// 天空关键帧：[小时, 顶部, 底部]
const SKY_KEYS = [
  [0, '#070b1f', '#18223f'], [4.5, '#0d1230', '#2a2b55'], [5.5, '#3b4a85', '#e59a7c'], [6.5, '#5e8fd0', '#f7c79a'],
  [8, '#5aa7e6', '#cfe9f7'], [12, '#3f9ae6', '#bfe4fb'], [16, '#4f93d8', '#e2eef0'], [17.5, '#5a76c0', '#f5b77c'],
  [18.7, '#3b3f86', '#ef7f5a'], [19.8, '#1a1f4f', '#4a3a6a'], [21, '#0a0f2a', '#1d2546'], [24, '#070b1f', '#18223f'],
];
const WEATHER_TINT = { sunny: ['#000000', 0], cloudy: ['#9aa4ae', 0.3], rain: ['#6f7b86', 0.5], storm: ['#3a4048', 0.65], fog: ['#c3c9cf', 0.6], snow: ['#d5dde6', 0.4] };
// 像素图集里的小猫：画面上的缩放 = catS × 这个系数（catS 是程序画小猫时用的尺寸）
const CAT_ART_K = 0.0154;
const WEATHER_LIGHT = { sunny: 1, cloudy: 0.9, rain: 0.75, storm: 0.55, fog: 0.85, snow: 0.88 };

const SCENE_STYLE = {
  bamboo: { far: '#7f9a8a', mid: '#5a7f4a', near: '#3f6a35', tree: '#4f8a3a', water: '#3f7f6a', deep: '#163a30', dock: '#7d6a48' },
  coral: { far: '#9fc8d8', mid: '#e8d8a8', near: '#c8b088', tree: '#3f8a4a', water: '#2fc0c8', deep: '#0f5a80', dock: '#a08060' },
  lake:  { far: '#7d9fbe', mid: '#5f8f5c', near: '#3a6b45', tree: '#2c5a3a', water: '#4f8fb0', deep: '#1d4a66', dock: '#8b6a4a' },
  river: { far: '#8193a6', mid: '#6b7d6a', near: '#4f6150', tree: '#3a5a40', water: '#4fa3a8', deep: '#1f5a5e', dock: '#7d5f43' },
  sea:   { far: '#8aa6c0', mid: '#a8956f', near: '#7a6a50', tree: '#4a5a3a', water: '#2f7fc0', deep: '#0f3c70', dock: '#90704f' },
  abyss: { far: '#3b2a5e', mid: '#2a1d47', near: '#1f1636', tree: '#4a3470', water: '#4a2f7a', deep: '#140a2e', dock: '#5a4a5a' },
  ice:   { far: '#c9d8e8', mid: '#e8f0f8', near: '#b8cde0', tree: '#3f5f5a', water: '#7fb8d0', deep: '#3a6f8f', dock: '#7a6a5a' },
};

// ---------- 鱼的绘制（局部坐标，头朝右） ----------
function drawFishShape(ctx, def, len, opt) {
  opt = opt || {};
  const c1 = def.c1, c2 = def.c2, t = opt.t || 0;
  ctx.save();
  ctx.lineJoin = 'round'; ctx.lineCap = 'round';
  if (def.pattern === 'glow' && !opt.silhouette) { ctx.shadowColor = c2; ctx.shadowBlur = len * 0.25; }
  const outline = 'rgba(20,25,35,0.55)';
  ctx.lineWidth = Math.max(1, len * 0.025);
  ctx.strokeStyle = outline;
  const eye = (x, y, r) => {
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fill();
    ctx.fillStyle = '#111'; ctx.beginPath(); ctx.arc(x + r * 0.2, y, r * 0.55, 0, 7); ctx.fill();
  };
  const wag = Math.sin(t * 12) * 0.12;
  switch (def.shape) {
    case 'fish': case 'flat': case 'catfish': {
      const rx = len * 0.38, ry = len * (def.shape === 'flat' ? 0.27 : def.shape === 'catfish' ? 0.14 : 0.17);
      // 尾巴
      ctx.fillStyle = c1;
      ctx.beginPath();
      ctx.moveTo(-rx * 0.85, 0);
      ctx.lineTo(-len * 0.52, -len * (0.16 + wag));
      ctx.quadraticCurveTo(-len * 0.45, 0, -len * 0.52, len * (0.16 - wag));
      ctx.closePath(); ctx.fill(); ctx.stroke();
      // 背鳍
      ctx.beginPath();
      ctx.moveTo(-rx * 0.35, -ry * 0.9);
      ctx.quadraticCurveTo(-rx * 0.05, -ry * 1.7, rx * 0.3, -ry * 0.85);
      ctx.closePath(); ctx.fill(); ctx.stroke();
      // 身体
      const g = ctx.createLinearGradient(0, -ry, 0, ry);
      g.addColorStop(0, c1); g.addColorStop(1, def.pattern === 'spots' && def.id === 'koi' ? c1 : c2);
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      ctx.save(); ctx.beginPath(); ctx.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2); ctx.clip();
      ctx.shadowBlur = 0;
      if (def.pattern === 'spots') {
        const rng = mulberry32(def.id.length * 97 + def.id.charCodeAt(0));
        ctx.fillStyle = def.id === 'koi' ? c2 : (def.id === 'whaleshark' ? c2 : 'rgba(40,30,20,0.35)');
        const n = def.id === 'koi' ? 4 : 9;
        for (let i = 0; i < n; i++) {
          const sx = (rng() - 0.5) * rx * 1.6, sy = (rng() - 0.6) * ry * 1.4, sr = len * (def.id === 'koi' ? 0.07 + rng() * 0.05 : 0.02 + rng() * 0.02);
          ctx.beginPath(); ctx.arc(sx, sy, sr, 0, 7); ctx.fill();
        }
      } else if (def.pattern === 'stripes') {
        ctx.strokeStyle = def.id === 'trout' || def.id === 'zacco' ? c2 : 'rgba(10,20,40,0.35)';
        ctx.lineWidth = len * 0.03;
        if (def.id === 'trout') { ctx.beginPath(); ctx.moveTo(-rx, 0); ctx.lineTo(rx, 0); ctx.lineWidth = len * 0.06; ctx.stroke(); }
        else for (let i = -2; i <= 2; i++) { ctx.beginPath(); ctx.moveTo(i * rx * 0.3, -ry); ctx.quadraticCurveTo(i * rx * 0.3 + rx * 0.1, 0, i * rx * 0.3, ry * 0.2); ctx.stroke(); }
      } else if (def.pattern === 'glow') {
        ctx.fillStyle = 'rgba(255,255,255,0.35)';
        ctx.beginPath(); ctx.ellipse(rx * 0.1, -ry * 0.35, rx * 0.55, ry * 0.25, 0, 0, 7); ctx.fill();
      }
      ctx.restore();
      // 腮
      ctx.strokeStyle = 'rgba(20,25,35,0.35)';
      ctx.beginPath(); ctx.arc(rx * 0.45, 0, ry * 0.7, -1, 1); ctx.stroke();
      eye(rx * 0.68, -ry * 0.2, len * 0.04);
      if (def.shape === 'catfish') {
        ctx.strokeStyle = c1; ctx.lineWidth = len * 0.015;
        ctx.beginPath(); ctx.moveTo(rx * 0.95, ry * 0.2); ctx.quadraticCurveTo(rx * 1.3, ry * 0.8, rx * 1.2, ry * 1.6); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(rx * 0.95, 0); ctx.quadraticCurveTo(rx * 1.4, -ry * 0.2, rx * 1.45, ry * 0.9); ctx.stroke();
      }
      break;
    }
    case 'eel': {
      const g = ctx.createLinearGradient(0, -len * 0.06, 0, len * 0.06);
      g.addColorStop(0, c1); g.addColorStop(1, c2);
      ctx.beginPath();
      for (let i = 0; i <= 20; i++) {
        const x = -len * 0.5 + len * i / 20;
        const y = Math.sin(i / 20 * Math.PI * 2 + t * 6) * len * 0.06 * (1 - i / 22);
        if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.lineWidth = len * 0.11 + 2; ctx.strokeStyle = outline; ctx.stroke();
      ctx.lineWidth = len * 0.11; ctx.strokeStyle = g; ctx.stroke();
      eye(len * 0.44, -len * 0.012, len * 0.025);
      break;
    }
    case 'shrimp': {
      ctx.fillStyle = c1;
      for (let i = 0; i < 6; i++) {
        const a = -0.6 + i * 0.42, r = len * 0.28;
        ctx.beginPath(); ctx.ellipse(Math.cos(a + Math.PI) * r * 0.6 + len * 0.05, Math.sin(a) * r * 0.5, len * (0.1 - i * 0.008), len * 0.09, a, 0, 7);
        ctx.fill(); ctx.stroke();
      }
      ctx.beginPath(); ctx.moveTo(-len * 0.25, len * 0.1); ctx.lineTo(-len * 0.45, len * 0.02); ctx.lineTo(-len * 0.42, len * 0.22); ctx.closePath(); ctx.fill(); ctx.stroke();
      // 钳子
      ctx.fillStyle = c2;
      ctx.beginPath(); ctx.ellipse(len * 0.38, -len * 0.12, len * 0.1, len * 0.05, -0.4, 0, 7); ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.ellipse(len * 0.36, len * 0.08, len * 0.1, len * 0.05, 0.4, 0, 7); ctx.fill(); ctx.stroke();
      ctx.strokeStyle = c1; ctx.lineWidth = len * 0.012;
      ctx.beginPath(); ctx.moveTo(len * 0.2, -len * 0.05); ctx.quadraticCurveTo(len * 0.5, -len * 0.4, len * 0.55, -len * 0.25); ctx.stroke();
      eye(len * 0.22, -len * 0.04, len * 0.03);
      break;
    }
    case 'squid': {
      ctx.strokeStyle = c1; ctx.lineWidth = len * 0.03;
      for (let i = 0; i < 6; i++) {
        const oy = (i - 2.5) * len * 0.035;
        ctx.beginPath(); ctx.moveTo(-len * 0.1, oy);
        ctx.quadraticCurveTo(-len * 0.3, oy + Math.sin(t * 5 + i) * len * 0.08, -len * 0.5, oy * 1.8);
        ctx.stroke();
      }
      ctx.fillStyle = c1; ctx.strokeStyle = outline; ctx.lineWidth = Math.max(1, len * 0.02);
      ctx.beginPath(); ctx.moveTo(-len * 0.12, -len * 0.1);
      ctx.quadraticCurveTo(len * 0.25, -len * 0.14, len * 0.45, 0);
      ctx.quadraticCurveTo(len * 0.25, len * 0.14, -len * 0.12, len * 0.1);
      ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.fillStyle = c2;
      ctx.beginPath(); ctx.moveTo(len * 0.3, -len * 0.06); ctx.lineTo(len * 0.42, -len * 0.16); ctx.lineTo(len * 0.44, 0); ctx.closePath(); ctx.fill();
      ctx.beginPath(); ctx.moveTo(len * 0.3, len * 0.06); ctx.lineTo(len * 0.42, len * 0.16); ctx.lineTo(len * 0.44, 0); ctx.closePath(); ctx.fill();
      eye(-len * 0.06, -len * 0.04, len * 0.035);
      break;
    }
    case 'crab': {
      ctx.strokeStyle = c1; ctx.lineWidth = len * 0.04;
      for (let s = -1; s <= 1; s += 2) for (let i = 0; i < 3; i++) {
        const lx = (i - 1) * len * 0.12;
        ctx.beginPath(); ctx.moveTo(lx, 0); ctx.lineTo(lx + s * len * 0.05, s * len * 0.25); ctx.lineTo(lx + s * len * 0.12, s * len * 0.33); ctx.stroke();
      }
      ctx.fillStyle = c1; ctx.strokeStyle = outline; ctx.lineWidth = Math.max(1, len * 0.02);
      ctx.beginPath(); ctx.ellipse(len * 0.38, -len * 0.2, len * 0.1, len * 0.07, -0.5, 0, 7); ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.ellipse(len * 0.38, len * 0.2, len * 0.1, len * 0.07, 0.5, 0, 7); ctx.fill(); ctx.stroke();
      const g = ctx.createRadialGradient(0, -len * 0.05, 1, 0, 0, len * 0.3);
      g.addColorStop(0, c2); g.addColorStop(1, c1);
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.ellipse(0, 0, len * 0.26, len * 0.2, 0, 0, 7); ctx.fill(); ctx.stroke();
      eye(len * 0.2, -len * 0.07, len * 0.035); eye(len * 0.2, len * 0.07, len * 0.035);
      break;
    }
    case 'boot': {
      ctx.fillStyle = c1;
      ctx.beginPath();
      ctx.moveTo(-len * 0.2, -len * 0.4); ctx.lineTo(len * 0.05, -len * 0.4); ctx.lineTo(len * 0.05, 0);
      ctx.quadraticCurveTo(len * 0.4, 0, len * 0.42, len * 0.15); ctx.lineTo(len * 0.42, len * 0.22);
      ctx.lineTo(-len * 0.22, len * 0.22); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.fillStyle = c2; ctx.fillRect(-len * 0.22, len * 0.16, len * 0.64, len * 0.06);
      break;
    }
    case 'can': {
      ctx.fillStyle = c2; ctx.beginPath(); ctx.ellipse(0, -len * 0.3, len * 0.16, len * 0.05, 0, 0, 7); ctx.fill(); ctx.stroke();
      ctx.fillStyle = c1; ctx.fillRect(-len * 0.16, -len * 0.3, len * 0.32, len * 0.6); ctx.strokeRect(-len * 0.16, -len * 0.3, len * 0.32, len * 0.6);
      ctx.fillStyle = '#fff'; ctx.fillRect(-len * 0.16, -len * 0.06, len * 0.32, len * 0.08);
      break;
    }
    case 'weed': {
      ctx.lineWidth = len * 0.05;
      for (let i = 0; i < 5; i++) {
        ctx.strokeStyle = i % 2 ? c1 : c2;
        ctx.beginPath(); ctx.moveTo(-len * 0.4, (i - 2) * len * 0.05);
        ctx.bezierCurveTo(-len * 0.1, -len * 0.3 + i * len * 0.1, len * 0.1, len * 0.3 - i * len * 0.1, len * 0.4, (i - 2) * len * 0.08);
        ctx.stroke();
      }
      break;
    }
    case 'key': {
      ctx.lineWidth = len * 0.07; ctx.strokeStyle = c1;
      ctx.beginPath(); ctx.arc(-len * 0.25, 0, len * 0.14, 0, 7); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(-len * 0.11, 0); ctx.lineTo(len * 0.42, 0); ctx.stroke();
      ctx.lineWidth = len * 0.06;
      ctx.beginPath(); ctx.moveTo(len * 0.3, 0); ctx.lineTo(len * 0.3, len * 0.13); ctx.moveTo(len * 0.4, 0); ctx.lineTo(len * 0.4, len * 0.1); ctx.stroke();
      ctx.strokeStyle = c2; ctx.lineWidth = len * 0.02;
      ctx.beginPath(); ctx.arc(-len * 0.25, 0, len * 0.1, 0, 7); ctx.stroke();
      break;
    }
    case 'chest': {
      const w = len * 0.42, h = len * 0.26;
      ctx.fillStyle = c1;
      ctx.beginPath(); ctx.rect(-w, -h * 0.2, w * 2, h * 1.2); ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(-w, -h * 0.2); ctx.quadraticCurveTo(0, -h * 1.3, w, -h * 0.2); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.fillStyle = c2;
      ctx.fillRect(-w, -h * 0.25, w * 2, h * 0.18);
      ctx.fillRect(-w * 0.62, -h * 0.85, w * 0.14, h * 1.85); ctx.fillRect(w * 0.48, -h * 0.85, w * 0.14, h * 1.85);
      ctx.fillStyle = '#3a2a10'; ctx.fillRect(-w * 0.1, -h * 0.15, w * 0.2, h * 0.3);
      if (def.id === 'chest_gold') { ctx.shadowColor = '#fff3a0'; ctx.shadowBlur = len * 0.3; ctx.fillStyle = 'rgba(255,250,200,0.9)'; ctx.beginPath(); ctx.arc(w * 0.7, -h, len * 0.04, 0, 7); ctx.fill(); }
      break;
    }
    case 'scroll': {
      ctx.fillStyle = c1;
      ctx.beginPath(); ctx.rect(-len * 0.34, -len * 0.22, len * 0.68, len * 0.44); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#c9ad74';
      ctx.beginPath(); ctx.ellipse(-len * 0.36, 0, len * 0.06, len * 0.25, 0, 0, 7); ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.ellipse(len * 0.36, 0, len * 0.06, len * 0.25, 0, 0, 7); ctx.fill(); ctx.stroke();
      ctx.strokeStyle = 'rgba(90,60,30,0.6)'; ctx.setLineDash([len * 0.04, len * 0.03]); ctx.lineWidth = len * 0.02;
      ctx.beginPath(); ctx.moveTo(-len * 0.25, len * 0.12); ctx.quadraticCurveTo(-len * 0.05, -len * 0.2, len * 0.15, len * 0.02); ctx.stroke(); ctx.setLineDash([]);
      ctx.strokeStyle = c2; ctx.lineWidth = len * 0.035;
      ctx.beginPath(); ctx.moveTo(len * 0.12, -len * 0.04); ctx.lineTo(len * 0.22, len * 0.08); ctx.moveTo(len * 0.22, -len * 0.04); ctx.lineTo(len * 0.12, len * 0.08); ctx.stroke();
      break;
    }
    case 'glove': {
      ctx.fillStyle = c1;
      ctx.beginPath(); ctx.ellipse(0, len * 0.08, len * 0.22, len * 0.2, 0, 0, 7); ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.ellipse(-len * 0.2, -len * 0.08, len * 0.08, len * 0.13, -0.6, 0, 7); ctx.fill(); ctx.stroke();
      ctx.fillStyle = c2; ctx.fillRect(-len * 0.22, len * 0.22, len * 0.44, len * 0.1);
      break;
    }
  }
  ctx.restore();
}

const _iconCache = {};
function fishIcon(id, silhouette) {
  const key = id + (silhouette ? '_s' : '');
  if (_iconCache[key]) return _iconCache[key];
  const def = FISH_BY_ID[id];
  const c = document.createElement('canvas');
  c.width = 160; c.height = 100;
  const x = c.getContext('2d');
  x.translate(80, 52);
  drawFishShape(x, def, ['eel'].includes(def.shape) ? 135 : 125, { silhouette });
  if (silhouette) {
    x.setTransform(1, 0, 0, 1, 0, 0);
    x.globalCompositeOperation = 'source-in';
    x.fillStyle = '#26323e'; x.fillRect(0, 0, 160, 100);
  }
  return (_iconCache[key] = c.toDataURL());
}

// ---------- 渲染器 ----------
const Renderer = {
  init() {
    this.t = 0;
    this.stars = []; const r = mulberry32(7);
    for (let i = 0; i < 140; i++) this.stars.push({ x: r(), y: r() * 0.95, s: r() * 1.4 + 0.4, p: r() * 6 });
    this.clouds = [];
    for (let i = 0; i < 14; i++) this.clouds.push({ x: r() * 1.4 - 0.2, y: 0.04 + r() * 0.26, s: 0.6 + r() * 0.9, v: 0.004 + r() * 0.008, seed: r() * 100 });
    this.drops = []; this.ripples = []; this.splashes = []; this.flyers = []; this.bursts = [];
    this.flash = 0; this.nextBolt = 8; this.bolt = null;
    this.catMood = { kind: 'idle', t: 0 };
    this.resize();
    CF.on('resize', () => this.resize());
    Game.on('catch', d => this.onCatch(d));
    Game.on('escape', () => { this.catMood = { kind: 'sad', t: 0 }; });
    Game.on('bite', () => { this.catMood = { kind: 'alert', t: 0 }; this.splash(this.bobberTarget(), 10, 0.8); });
    Game.on('cast', () => { this.catMood = { kind: 'idle', t: 0 }; });
  },
  resize() { this.cv = CF.view.cv; this.ctx = CF.view.ctx; this.W = CF.view.W; this.H = CF.view.H; },
  // 布局
  get horizon() { return this.H * 0.45; },
  get dockY() { return this.H * 0.71; },
  get catS() { return Math.min(this.H * 0.12, this.W * 0.09); },
  catPos() { return { x: this.W * 0.24, y: this.dockY }; },
  bobberTarget() { return { x: this.W * 0.6, y: this.horizon + (this.H - this.horizon) * 0.4 }; },

  daylight(h) {
    const up = smooth(4.8, 7.2, h), down = 1 - smooth(17.3, 19.8, h);
    return 0.16 + 0.84 * Math.min(up, down);
  },
  skyColors(h, weather) {
    let i = 0; while (i < SKY_KEYS.length - 2 && h >= SKY_KEYS[i + 1][0]) i++;
    const a = SKY_KEYS[i], b = SKY_KEYS[i + 1], t = (h - a[0]) / (b[0] - a[0]);
    let top = mixArr(a[1], b[1], t), bot = mixArr(a[2], b[2], t);
    const [tc, ta] = WEATHER_TINT[weather];
    if (ta > 0) {
      const lvl = this.daylight(h);
      const tint = mixArr(tc, '#0c1020', 1 - lvl);
      top = mixRGB(top, tint, ta); bot = mixRGB(bot, tint, ta * 0.9);
    }
    if (Game.S.scene === 'abyss' && CF.modes.is('fish')) { top = mixRGB(top, [60, 20, 90], 0.45); bot = mixRGB(bot, Game.S.story.ending === 'spare' ? [240, 140, 90] : [150, 80, 170], 0.4); }
    return { top, bot };
  },

  onCatch(d) {
    this.catMood = { kind: 'happy', t: 0 };
    const from = this.bobberTarget();
    const cp = this.catPos();
    from.x = this.W * 0.42;
    this.splash(from, 16, 1.2);
    const rar = d.fish.rarity;
    const baseLen = { junk: 0.55, common: 0.6, rare: 0.7, epic: 0.85, legendary: 1.0 }[rar];
    this.flyers.push({ def: d.fish, x0: from.x, y0: from.y, x1: cp.x + this.catS * 0.6, y1: cp.y - this.catS * 2.0, t: 0, len: this.catS * baseLen });
    if (rar === 'epic' || rar === 'legendary') this.bursts.push({ x: cp.x + this.catS * 0.6, y: cp.y - this.catS * 2.0, t: 0, color: RARITY[rar].color });
  },
  splash(p, n, power) {
    for (let i = 0; i < n; i++) this.splashes.push({ x: p.x, y: p.y, vx: rand(-60, 60) * power, vy: rand(-160, -60) * power, life: rand(0.5, 0.9), t: 0 });
    this.ripples.push({ x: p.x, y: p.y, t: 0, life: 1.4, big: power > 1 });
  },

  // opt：{ far(ctx, shade, W, H, hz, night) 远景, fore(ctx, dt, shade, night) 前景, water 水面风格 }
  // 不传 opt 就是钓鱼码头
  frameOutdoor(dt, opt) {
    opt = opt || {};
    this.t += dt;
    const voyage = !!opt.fore;
    const ctx = this.ctx, W = this.W, H = this.H, S = Game.S;
    const h = Game.hour(), weather = S.weather, scene = S.scene;
    const light = this.daylight(h) * WEATHER_LIGHT[weather];
    const sky = this.skyColors(h, weather);
    const st = SCENE_STYLE[scene];
    const night = 1 - this.daylight(h);
    const season = Game.season();
    const seasonTint = { spring: ['#ffd6e6', 0.1], summer: ['#fff3b0', 0.05], autumn: ['#d9772a', 0.28], winter: ['#f2f7fc', 0.42] }[season];
    const shade = (c, k) => mix(mixArr(c, seasonTint[0], seasonTint[1]), '#0a1030', clamp((1 - light) * (k || 0.85), 0, 0.9));
    const hz = this.horizon;
    this.light = light; this.seasonTint = seasonTint; this._outdoor = true; // 给像素图集叠色用

    // 天空
    let g = ctx.createLinearGradient(0, 0, 0, hz);
    g.addColorStop(0, rgbStr(sky.top)); g.addColorStop(1, rgbStr(sky.bot));
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, hz + 2);

    // 星星
    const clear = { sunny: 1, cloudy: 0.45, snow: 0.15, fog: 0.05, rain: 0, storm: 0 }[weather];
    if (night > 0.3 && clear > 0) {
      for (const s of this.stars) {
        const a = (night - 0.3) * clear * (0.6 + 0.4 * Math.sin(this.t * 2 + s.p));
        ctx.fillStyle = `rgba(255,255,240,${a})`;
        ctx.fillRect(s.x * W, s.y * hz * 0.9, s.s, s.s);
      }
    }
    // 极光
    if (scene === 'ice' && night > 0.5 && (weather === 'sunny' || weather === 'cloudy')) this.drawAurora(ctx, W, hz, (night - 0.5) * 2 * (weather === 'sunny' ? 1 : 0.4));

    // 太阳 / 月亮
    const bodyVis = { sunny: 1, cloudy: 0.55, snow: 0.3, fog: 0.25, rain: 0.1, storm: 0 }[weather];
    if (h >= 5.5 && h <= 19) {
      const p = (h - 5.5) / 13.5;
      const x = W * (0.08 + 0.84 * p), y = hz - Math.sin(p * Math.PI) * hz * 0.82 + 10;
      const warm = 1 - Math.sin(p * Math.PI);
      const col = mix('#fff6c8', '#ff8a4a', warm);
      ctx.save(); ctx.globalAlpha = bodyVis;
      const rg = ctx.createRadialGradient(x, y, 4, x, y, 90);
      rg.addColorStop(0, col.replace('rgb', 'rgba').replace(')', ',0.55)')); rg.addColorStop(1, 'rgba(255,220,150,0)');
      ctx.fillStyle = rg; ctx.beginPath(); ctx.arc(x, y, 90, 0, 7); ctx.fill();
      ctx.fillStyle = col; ctx.beginPath(); ctx.arc(x, y, 26, 0, 7); ctx.fill();
      ctx.restore();
      this.sunX = x; this.sunVis = bodyVis * (1 - night);
    } else this.sunVis = 0;
    if (h >= 18.5 || h <= 6) {
      const hh = h >= 18.5 ? h - 18.5 : h + 5.5;
      const p = hh / 11.5;
      const x = W * (0.1 + 0.8 * p), y = hz - Math.sin(p * Math.PI) * hz * 0.75 + 10;
      ctx.save(); ctx.globalAlpha = bodyVis * clamp(night * 1.4, 0, 1);
      const rg = ctx.createRadialGradient(x, y, 4, x, y, 70);
      rg.addColorStop(0, 'rgba(220,230,255,0.35)'); rg.addColorStop(1, 'rgba(220,230,255,0)');
      ctx.fillStyle = rg; ctx.beginPath(); ctx.arc(x, y, 70, 0, 7); ctx.fill();
      ctx.fillStyle = '#eef2ff'; ctx.beginPath(); ctx.arc(x, y, 20, 0, 7); ctx.fill();
      ctx.fillStyle = rgbStr(sky.top); ctx.beginPath(); ctx.arc(x + 9, y - 5, 17, 0, 7); ctx.fill();
      ctx.restore();
      this.moonX = x; this.moonVis = bodyVis * night;
    } else this.moonVis = 0;

    // 云
    this.drawClouds(ctx, dt, W, hz, weather, light);

    // 远景
    if (opt.far) opt.far.call(this, ctx, shade, W, H, hz, night); else this.drawLandscape(ctx, scene, st, shade, W, H, hz, weather, night);

    // 水面
    this.drawWater(ctx, opt.water ? 'voyage' : scene, opt.water ? SCENE_STYLE[opt.water] : st, sky, shade, W, H, hz, light, night, dt, weather);

    // 码头 + 灯笼
    if (opt.fore) opt.fore.call(this, ctx, dt, shade, night); else this.drawDock(ctx, scene, st, shade, W, H, night);

    // 钓竿、鱼线、浮漂、小猫
    if (!voyage) this.drawFishing(ctx, dt, shade, night);

    // 飞起的鱼、水花、爆光
    this.drawEffects(ctx, dt);

    // 天气粒子
    this.drawWeather(ctx, dt, W, H, hz, weather, scene);
    if (!voyage) this.drawSeason(ctx, dt, W, H, season);

    // 夜晚整体压暗（不影响 UI）
    if (night > 0.05) { ctx.fillStyle = `rgba(8,12,40,${night * 0.18})`; ctx.fillRect(0, 0, W, H); }
    // 闪电
    if (this.flash > 0) { ctx.fillStyle = `rgba(235,240,255,${this.flash})`; ctx.fillRect(0, 0, W, H); this.flash -= dt * 2.2; }
    this._outdoor = false;
  },

  drawAurora(ctx, W, hz, a) {
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    for (let k = 0; k < 3; k++) {
      ctx.beginPath();
      for (let i = 0; i <= 40; i++) {
        const x = W * i / 40;
        const y = hz * (0.18 + k * 0.08) + Math.sin(i * 0.35 + this.t * 0.4 + k) * hz * 0.06;
        if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.lineWidth = hz * 0.12;
      ctx.strokeStyle = k === 1 ? `rgba(180,120,255,${0.12 * a})` : `rgba(90,255,180,${0.16 * a})`;
      ctx.stroke();
    }
    ctx.restore();
  },

  drawClouds(ctx, dt, W, hz, weather, light) {
    const n = { sunny: 3, cloudy: 9, rain: 11, storm: 14, fog: 6, snow: 9 }[weather];
    const dark = { sunny: 0, cloudy: 0.15, rain: 0.4, storm: 0.65, fog: 0.1, snow: 0.15 }[weather];
    const base = mixArr(mixArr('#ffffff', '#5a6370', dark), '#1a2038', clamp(1 - light, 0, 0.85));
    const speed = weather === 'storm' ? 3 : 1;
    for (let i = 0; i < n; i++) {
      const c = this.clouds[i];
      c.x += c.v * dt * speed * 0.3;
      if (c.x > 1.25) c.x = -0.25;
      const x = c.x * W, y = c.y * hz, s = c.s * Math.min(W, 1400) * 0.032 * (weather === 'storm' || weather === 'rain' ? 1.5 : 1);
      ctx.fillStyle = rgbStr(base, weather === 'sunny' ? 0.85 : 0.92);
      const r = mulberry32(c.seed * 1000 | 0);
      ctx.beginPath();
      for (let k = 0; k < 6; k++) {
        const ox = (r() - 0.5) * s * 3.2, oy = (r() - 0.3) * s * 0.5, rr = s * (0.5 + r() * 0.5);
        ctx.moveTo(x + ox + rr * 1.5, y + oy); ctx.ellipse(x + ox, y + oy, rr * 1.5, rr, 0, 0, 7);
      }
      ctx.fill();
    }
  },

  ridge(seed, W, baseY, amp, freq, rough) {
    const pts = [];
    const r = mulberry32(seed);
    const ph = [r() * 10, r() * 10, r() * 10];
    for (let i = 0; i <= 60; i++) {
      const x = W * i / 60;
      const u = i / 60;
      let y = baseY - amp * (0.55 * Math.sin(u * freq + ph[0]) + 0.3 * Math.sin(u * freq * 2.3 + ph[1]) + 0.15 * Math.sin(u * freq * 5.1 + ph[2]));
      if (rough) y -= amp * rough * Math.abs(Math.sin(u * freq * 9 + ph[2]));
      pts.push([x, y]);
    }
    return pts;
  },
  fillRidge(ctx, pts, bottom, color) {
    ctx.fillStyle = color;
    ctx.beginPath(); ctx.moveTo(0, bottom);
    for (const [x, y] of pts) ctx.lineTo(x, y);
    ctx.lineTo(this.W, bottom); ctx.closePath(); ctx.fill();
  },
  pine(ctx, x, y, h, color, snow) {
    ctx.fillStyle = color;
    for (let k = 0; k < 3; k++) {
      const yy = y - h * (0.25 + k * 0.25), w = h * (0.32 - k * 0.07);
      ctx.beginPath(); ctx.moveTo(x - w, yy + h * 0.25); ctx.lineTo(x, yy - h * 0.2); ctx.lineTo(x + w, yy + h * 0.25); ctx.closePath(); ctx.fill();
      if (snow) { ctx.fillStyle = 'rgba(245,250,255,0.85)'; ctx.beginPath(); ctx.moveTo(x - w * 0.4, yy); ctx.lineTo(x, yy - h * 0.2); ctx.lineTo(x + w * 0.4, yy); ctx.closePath(); ctx.fill(); ctx.fillStyle = color; }
    }
    ctx.fillRect(x - h * 0.03, y - h * 0.1, h * 0.06, h * 0.1);
  },

  drawLandscape(ctx, scene, st, shade, W, H, hz, weather, night) {
    const haze = weather === 'fog' ? 0.55 : weather === 'rain' || weather === 'snow' ? 0.25 : weather === 'storm' ? 0.3 : 0;
    const hazeC = weather === 'fog' ? '#c8cdd2' : '#8a96a2';
    const sh = (c, k) => { const base = shade(c, k); return haze ? mix(base.match(/\d+/g).map(Number), hex2rgb(hazeC).map(v => v * (1 - night * 0.8)), haze) : base; };
    if (scene === 'lake') {
      this.fillRidge(ctx, this.ridge(11, W, hz - H * 0.08, H * 0.07, 6), hz + 1, sh(st.far));
      this.fillRidge(ctx, this.ridge(23, W, hz - H * 0.025, H * 0.03, 9), hz + 1, sh(st.mid));
      const r = mulberry32(5);
      for (let i = 0; i < 46; i++) { const x = r() * W; this.pine(ctx, x, hz + 1, H * (0.03 + r() * 0.035), sh(st.tree)); }
    } else if (scene === 'river') {
      this.fillRidge(ctx, this.ridge(31, W, hz - H * 0.11, H * 0.09, 5, 0.25), hz + 1, sh(st.far));
      this.fillRidge(ctx, this.ridge(37, W, hz - H * 0.06, H * 0.06, 7, 0.15), hz + 1, sh(st.mid));
      // 瀑布
      const wx = W * 0.8, wy = hz - H * 0.13;
      ctx.fillStyle = sh('#dff3f7', 0.7);
      ctx.fillRect(wx, wy, W * 0.025, hz - wy);
      ctx.strokeStyle = 'rgba(255,255,255,0.6)'; ctx.lineWidth = 1.5;
      for (let i = 0; i < 5; i++) {
        const yy = wy + ((this.t * 120 + i * 40) % (hz - wy));
        ctx.beginPath(); ctx.moveTo(wx + 3 + i * 3, yy); ctx.lineTo(wx + 3 + i * 3, yy + 18); ctx.stroke();
      }
      ctx.fillStyle = 'rgba(255,255,255,0.4)'; ctx.beginPath(); ctx.ellipse(wx + W * 0.0125, hz, W * 0.03, 6, 0, 0, 7); ctx.fill();
      const r = mulberry32(9);
      for (let i = 0; i < 30; i++) { const x = r() * W; if (Math.abs(x - wx) > 40) this.pine(ctx, x, hz + 1, H * (0.025 + r() * 0.03), sh(st.tree)); }
    } else if (scene === 'sea') {
      // 远处小岛
      ctx.fillStyle = sh(st.far);
      ctx.beginPath(); ctx.ellipse(W * 0.3, hz + 1, W * 0.12, H * 0.025, 0, Math.PI, 0); ctx.fill();
      ctx.beginPath(); ctx.ellipse(W * 0.45, hz + 1, W * 0.05, H * 0.012, 0, Math.PI, 0); ctx.fill();
      // 灯塔礁石
      const lx = W * 0.86;
      ctx.fillStyle = sh(st.near);
      ctx.beginPath(); ctx.moveTo(lx - W * 0.09, hz + H * 0.03); ctx.quadraticCurveTo(lx - W * 0.04, hz - H * 0.04, lx, hz - H * 0.045);
      ctx.quadraticCurveTo(lx + W * 0.06, hz - H * 0.04, lx + W * 0.12, hz + H * 0.03); ctx.closePath(); ctx.fill();
      const th = H * 0.17, tw = W * 0.018, ty = hz - H * 0.045;
      ctx.fillStyle = sh('#f5f5f0', 0.7);
      ctx.beginPath(); ctx.moveTo(lx - tw, ty); ctx.lineTo(lx - tw * 0.6, ty - th); ctx.lineTo(lx + tw * 0.6, ty - th); ctx.lineTo(lx + tw, ty); ctx.closePath(); ctx.fill();
      ctx.fillStyle = sh('#d84b3c', 0.7);
      for (let k = 0; k < 3; k++) { const y0 = ty - th * (0.15 + k * 0.3); ctx.fillRect(lx - tw * (0.9 - k * 0.1), y0 - th * 0.08, tw * 2 * (0.9 - k * 0.1), th * 0.08); }
      ctx.fillStyle = sh('#333', 0.5); ctx.fillRect(lx - tw * 0.8, ty - th - H * 0.03, tw * 1.6, H * 0.03);
      const lampY = ty - th - H * 0.015;
      if (night > 0.35 || weather === 'fog' || weather === 'storm') {
        const a = Math.max(night, 0.5);
        ctx.fillStyle = `rgba(255,240,170,${a})`; ctx.beginPath(); ctx.arc(lx, lampY, 6, 0, 7); ctx.fill();
        const ang = this.t * 0.8;
        ctx.save(); ctx.globalCompositeOperation = 'lighter';
        const dir = Math.cos(ang);
        const len = W * 0.45 * Math.abs(dir) + 40;
        const gg = ctx.createLinearGradient(lx, lampY, lx + dir * len, lampY);
        gg.addColorStop(0, `rgba(255,240,170,${0.35 * a})`); gg.addColorStop(1, 'rgba(255,240,170,0)');
        ctx.fillStyle = gg;
        ctx.beginPath(); ctx.moveTo(lx, lampY); ctx.lineTo(lx + dir * len, lampY - 30); ctx.lineTo(lx + dir * len, lampY + 30); ctx.closePath(); ctx.fill();
        ctx.restore();
      }
    } else if (scene === 'bamboo') {
      this.fillRidge(ctx, this.ridge(61, W, hz - H * 0.09, H * 0.08, 6, 0.1), hz + 1, sh(st.far));
      const r = mulberry32(17);
      for (let i = 0; i < 60; i++) {
        const x = r() * W, hgt = H * (0.12 + r() * 0.3), w = 3 + r() * 4;
        ctx.fillStyle = sh(i % 3 ? st.tree : st.mid, 0.8);
        ctx.fillRect(x, hz - hgt, w, hgt + 2);
        ctx.fillStyle = 'rgba(0,0,0,0.18)';
        for (let k = 1; k < 5; k++) ctx.fillRect(x, hz - hgt * k / 5, w, 2);
        ctx.fillStyle = sh('#6fae4a', 0.8);
        ctx.beginPath(); ctx.ellipse(x + w / 2 + 10, hz - hgt, 14, 4, -0.4, 0, 7); ctx.fill();
      }
    } else if (scene === 'coral') {
      // 远处的棕榈小岛
      const ix = W * 0.75;
      ctx.fillStyle = sh(st.mid);
      ctx.beginPath(); ctx.ellipse(ix, hz + 1, W * 0.1, H * 0.025, 0, Math.PI, 0); ctx.fill();
      for (let i = 0; i < 3; i++) {
        const tx = ix - W * 0.04 + i * W * 0.035, th = H * (0.08 + i % 2 * 0.03);
        ctx.strokeStyle = sh('#7a5a3a'); ctx.lineWidth = 4;
        ctx.beginPath(); ctx.moveTo(tx, hz - H * 0.015); ctx.quadraticCurveTo(tx + 10, hz - th / 2, tx + 4, hz - th); ctx.stroke();
        ctx.fillStyle = sh(st.tree);
        for (let a = 0; a < 5; a++) { ctx.beginPath(); ctx.ellipse(tx + 4 + Math.cos(a * 1.3) * 16, hz - th + Math.sin(a * 1.3) * 4, 18, 5, a * 1.3, 0, 7); ctx.fill(); }
      }
    } else if (scene === 'abyss') {
      // 远处的墨（饶恕结局后，它会在远方陪你钓鱼）
      if (Game.S.story.ending === 'spare') {
        const mx = W * 0.72 + Math.sin(this.t * 0.05) * 30, my = hz + 2;
        ctx.fillStyle = sh('#2b3a67', 0.6);
        ctx.beginPath(); ctx.ellipse(mx, my, W * 0.16, H * 0.05, 0, Math.PI, 0); ctx.fill();
        ctx.fillStyle = 'rgba(255,213,74,0.8)'; ctx.beginPath(); ctx.arc(mx - W * 0.09, my - H * 0.022, 3, 0, 7); ctx.fill();
        if ((this.t % 9) < 1.4) { const k = (this.t % 9) / 1.4; ctx.strokeStyle = `rgba(220,235,255,${1 - k})`; ctx.lineWidth = 3; for (let i = -1; i <= 1; i++) { ctx.beginPath(); ctx.moveTo(mx - W * 0.03, my - H * 0.05); ctx.quadraticCurveTo(mx - W * 0.03 + i * 20, my - H * 0.05 - 60 * k, mx - W * 0.03 + i * 34, my - H * 0.03 - 40 * k); ctx.stroke(); } }
      }
      // 沉没的石柱
      const r = mulberry32(99);
      for (let i = 0; i < 7; i++) {
        const x = r() * W, ph = H * (0.05 + r() * 0.12), pw = W * (0.012 + r() * 0.012), tilt = (r() - 0.5) * 0.3;
        ctx.save(); ctx.translate(x, hz + 2); ctx.rotate(tilt);
        ctx.fillStyle = sh(st.far, 0.7); ctx.fillRect(-pw / 2, -ph, pw, ph);
        ctx.fillRect(-pw * 0.8, -ph - 6, pw * 1.6, 6);
        ctx.restore();
      }
      // 漂浮的岩石
      for (let i = 0; i < 4; i++) {
        const x = W * (0.15 + i * 0.22), y = hz * (0.45 + (i % 2) * 0.15) + Math.sin(this.t * 0.6 + i) * 8, rw = W * (0.03 + (i % 3) * 0.012);
        ctx.fillStyle = sh(st.mid, 0.7);
        ctx.beginPath(); ctx.moveTo(x - rw, y); ctx.lineTo(x + rw, y); ctx.lineTo(x + rw * 0.3, y + rw * 0.9); ctx.lineTo(x - rw * 0.4, y + rw * 0.6); ctx.closePath(); ctx.fill();
        ctx.fillStyle = 'rgba(190,140,255,0.25)'; ctx.beginPath(); ctx.ellipse(x, y + rw, rw * 0.6, 4, 0, 0, 7); ctx.fill();
      }
    } else if (scene === 'ice') {
      const far = this.ridge(51, W, hz - H * 0.1, H * 0.08, 5, 0.3);
      this.fillRidge(ctx, far, hz + 1, sh(st.far));
      // 雪顶
      ctx.save(); ctx.beginPath(); ctx.moveTo(0, hz);
      for (const [x, y] of far) ctx.lineTo(x, y);
      ctx.lineTo(W, hz); ctx.closePath(); ctx.clip();
      ctx.fillStyle = sh('#ffffff', 0.75);
      ctx.beginPath(); ctx.moveTo(0, 0);
      for (const [x, y] of far) ctx.lineTo(x, y + H * 0.03 + Math.sin(x * 0.05) * 4);
      ctx.lineTo(W, 0); ctx.closePath(); ctx.fill();
      ctx.restore();
      this.fillRidge(ctx, this.ridge(57, W, hz - H * 0.03, H * 0.03, 8), hz + 1, sh(st.mid, 0.8));
      const r = mulberry32(13);
      for (let i = 0; i < 34; i++) { const x = r() * W; this.pine(ctx, x, hz + 1, H * (0.03 + r() * 0.035), sh(st.tree), true); }
    }
  },

  drawWater(ctx, scene, st, sky, shade, W, H, hz, light, night, dt, weather) {
    const top = mixArr(sky.bot, hex2rgb(st.water).map(v => v * (0.3 + 0.7 * light)), 0.55);
    const bot = mixArr(st.deep, '#050a1c', clamp(1 - light, 0, 0.85));
    const g = ctx.createLinearGradient(0, hz, 0, H);
    g.addColorStop(0, rgbStr(top)); g.addColorStop(1, rgbStr(bot));
    ctx.fillStyle = g; ctx.fillRect(0, hz, W, H - hz);

    // 太阳/月亮倒影
    const refl = (x, vis, col) => {
      if (vis <= 0.02) return;
      for (let i = 0; i < 26; i++) {
        const k = i / 26, y = hz + 4 + k * k * (H - hz) * 0.9;
        const w = (10 + k * 60) * (0.6 + 0.4 * Math.sin(this.t * 3 + i * 1.7));
        ctx.fillStyle = col.replace(')', `,${vis * (0.5 - k * 0.4)})`).replace('rgb', 'rgba');
        ctx.fillRect(x - w / 2 + Math.sin(this.t * 2 + i) * 6, y, w, 2 + k * 2);
      }
    };
    refl(this.sunX, this.sunVis, 'rgb(255,230,170)');
    refl(this.moonX, this.moonVis, 'rgb(225,232,255)');

    // 波纹
    const speed = scene === 'voyage' ? 4 : scene === 'river' ? 2.2 : weather === 'storm' ? 2.5 : 1;
    ctx.lineWidth = 1.2;
    for (let i = 0; i < 26; i++) {
      const k = (i + 0.5) / 26, y = hz + k * k * (H - hz);
      const a = 0.05 + k * 0.12;
      ctx.strokeStyle = `rgba(255,255,255,${a * (0.4 + 0.6 * light)})`;
      const seg = 40 + k * 120, gap = seg * 1.6;
      const off = ((this.t * 14 * speed * (0.5 + k) + i * 53) % (seg + gap));
      ctx.beginPath();
      for (let x = -seg - gap + off; x < W; x += seg + gap) {
        const yy = y + Math.sin(x * 0.01 + this.t + i) * (1 + k * 3);
        ctx.moveTo(x, yy); ctx.quadraticCurveTo(x + seg / 2, yy - 1.5 - k * 2, x + seg, yy);
      }
      ctx.stroke();
    }
    // 冰湖浮冰
    if (scene === 'ice') {
      const r = mulberry32(77);
      for (let i = 0; i < 9; i++) {
        const k = 0.1 + r() * 0.85, y = hz + k * k * (H - hz);
        const x = ((r() * W + this.t * 4 * (0.5 + k)) % (W + 200)) - 100;
        ctx.fillStyle = shade('#eef6fb', 0.7);
        ctx.beginPath(); ctx.ellipse(x, y, 20 + k * 70, 3 + k * 10, 0, 0, 7); ctx.fill();
      }
    }
    // 河中石头
    if (scene === 'river') {
      const r = mulberry32(41);
      for (let i = 0; i < 6; i++) {
        const k = 0.15 + r() * 0.7, y = hz + k * k * (H - hz), x = W * (0.45 + r() * 0.55);
        ctx.fillStyle = shade('#6d6a62', 0.85);
        ctx.beginPath(); ctx.ellipse(x, y, 12 + k * 40, 5 + k * 14, 0, Math.PI, 0); ctx.fill();
        ctx.strokeStyle = 'rgba(255,255,255,0.35)';
        ctx.beginPath(); ctx.ellipse(x, y + 2, 16 + k * 48, 3 + k * 4, 0, 0, Math.PI); ctx.stroke();
      }
    }
    // 雨点涟漪
    if (weather === 'rain' || weather === 'storm') {
      if (Math.random() < (weather === 'storm' ? 0.9 : 0.5)) this.ripples.push({ x: Math.random() * W, y: hz + Math.pow(Math.random(), 0.7) * (H - hz), t: 0, life: 0.7, tiny: true });
    }
    for (let i = this.ripples.length - 1; i >= 0; i--) {
      const r = this.ripples[i]; r.t += dt;
      if (r.t > r.life) { this.ripples.splice(i, 1); continue; }
      const p = r.t / r.life, k = (r.y - hz) / (H - hz);
      const rad = (r.tiny ? 6 + k * 10 : r.big ? 60 : 36) * p;
      ctx.strokeStyle = `rgba(255,255,255,${(1 - p) * (r.tiny ? 0.35 : 0.7)})`;
      ctx.lineWidth = r.tiny ? 1 : 2;
      ctx.beginPath(); ctx.ellipse(r.x, r.y, rad, rad * 0.28, 0, 0, 7); ctx.stroke();
    }
  },

  drawSeason(ctx, dt, W, H, season) {
    if (season !== 'spring' && season !== 'autumn') return;
    this.sParts = this.sParts || [];
    while (this.sParts.length < 36) this.sParts.push({ x: Math.random() * W, y: Math.random() * H, v: rand(20, 45), p: Math.random() * 6, s: rand(3, 6) });
    ctx.fillStyle = season === 'spring' ? 'rgba(255,182,206,0.9)' : 'rgba(230,120,40,0.9)';
    for (const p of this.sParts) {
      p.y += p.v * dt; p.x += (Math.sin(this.t * 1.5 + p.p) * 30 - 15) * dt;
      if (p.y > H) { p.y = -10; p.x = Math.random() * W * 1.2; }
      ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(this.t * 2 + p.p);
      ctx.fillRect(-p.s / 2, -p.s / 4, p.s, p.s / 2);
      ctx.restore();
    }
  },
  drawDock(ctx, scene, st, shade, W, H, night) {
    if (scene === 'coral') {
      const r = mulberry32(23), hz = this.horizon;
      for (let i = 0; i < 18; i++) {
        const k = 0.35 + r() * 0.6, y = hz + k * k * (H - hz), x = r() * W, sz = 6 + k * 22;
        ctx.fillStyle = shade(['#ff7f7f', '#ffb74d', '#ba68c8', '#4dd0e1'][i % 4], 0.7).replace('rgb', 'rgba').replace(')', ',0.45)');
        ctx.beginPath(); ctx.ellipse(x, y, sz, sz * 0.35, 0, 0, 7); ctx.fill();
      }
    }
    const y = this.dockY, end = W * 0.34, th = H * 0.035;
    const wood = shade(st.dock, 0.8), dark = shade(mix(st.dock, '#000', 0.4).match(/\d+/g).map(Number).reduce((s, v) => s + v.toString(16).padStart(2, '0'), '#'), 0.8);
    // 柱子
    ctx.fillStyle = dark;
    for (let x = W * 0.03; x < end; x += W * 0.07) ctx.fillRect(x, y, W * 0.012, H - y);
    // 柱子水中倒影
    ctx.fillStyle = 'rgba(0,0,0,0.12)';
    ctx.fillRect(0, y + th, end + 10, H * 0.02);
    // 木板
    ctx.fillStyle = wood;
    ctx.fillRect(0, y, end, th);
    ctx.strokeStyle = 'rgba(0,0,0,0.25)'; ctx.lineWidth = 1;
    for (let x = 0; x < end; x += 26) { ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y + th); ctx.stroke(); }
    ctx.fillStyle = 'rgba(255,255,255,0.12)'; ctx.fillRect(0, y, end, 2);
    if (scene === 'ice' || Game.season() === 'winter') { ctx.fillStyle = shade('#f4f8fc', 0.6); ctx.beginPath(); ctx.moveTo(0, y + 2); for (let x = 0; x <= end; x += 20) ctx.lineTo(x, y - 3 - Math.sin(x * 0.2) * 2); ctx.lineTo(end, y + 2); ctx.fill(); }
    // 灯笼
    const lx = W * 0.045, ly = y - H * 0.14;
    ctx.fillStyle = dark; ctx.fillRect(lx - 2, ly, 4, y - ly);
    ctx.fillRect(lx, ly, 18, 3);
    const glow = night > 0.3 || Game.S.weather === 'storm' || Game.S.weather === 'fog';
    if (glow) {
      const a = Math.max(0.5, night) * (0.9 + 0.1 * Math.sin(this.t * 7));
      const rg = ctx.createRadialGradient(lx + 16, ly + 18, 2, lx + 16, ly + 18, H * 0.16);
      rg.addColorStop(0, `rgba(255,200,110,${0.5 * a})`); rg.addColorStop(1, 'rgba(255,200,110,0)');
      ctx.fillStyle = rg; ctx.beginPath(); ctx.arc(lx + 16, ly + 18, H * 0.16, 0, 7); ctx.fill();
    }
    ctx.fillStyle = glow ? '#ffd27a' : shade('#d9a35a', 0.7);
    ctx.fillRect(lx + 10, ly + 6, 12, 18);
    ctx.strokeStyle = dark; ctx.strokeRect(lx + 10, ly + 6, 12, 18);
    // 小水桶
    const bx = W * 0.12, bs = H * 0.035;
    if (this.artOn()) {
      const sc = this.catS * CAT_ART_K * 0.36, tint = [[this.seasonTint[0], this.seasonTint[1] * 0.45], ['#0a1030', clamp((1 - this.light) * 0.6, 0, 0.8)]];
      if (Game.S.bag.length > 0) Art.draw(ctx, 'cat', 'fish', bx + 4, y - 79 * sc * 0.55, sc * 0.8, { rot: -1.25, tint }); // 桶里冒出一条鱼
      Art.draw(ctx, 'cat', 'bucket', bx, y + 1, sc, { tint });
      return;
    }
    ctx.fillStyle = shade('#7aa0b8', 0.8);
    ctx.beginPath(); ctx.moveTo(bx - bs * 0.6, y - bs); ctx.lineTo(bx + bs * 0.6, y - bs); ctx.lineTo(bx + bs * 0.5, y); ctx.lineTo(bx - bs * 0.5, y); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = shade('#4a6a80', 0.8); ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(bx, y - bs, bs * 0.6, Math.PI, 0); ctx.stroke();
    if (Game.S.bag.length > 0) { // 桶里冒出一条鱼尾
      ctx.fillStyle = shade('#c9b26a', 0.8);
      ctx.beginPath(); ctx.moveTo(bx, y - bs); ctx.lineTo(bx - 6, y - bs - 10); ctx.lineTo(bx + 6, y - bs - 10); ctx.closePath(); ctx.fill();
    }
  },

  drawFishing(ctx, dt, shade, night) {
    const f = Fishing.fsm, s = this.catS, cp = this.catPos();
    const target = this.bobberTarget();
    this.catMood.t += dt;
    if (this.catMood.t > 2.2 && this.catMood.kind !== 'idle' && f.phase !== 'bite') this.catMood = { kind: 'idle', t: 0 };

    // 竿子
    const hand = { x: cp.x + s * 0.55, y: cp.y - s * 0.62 };
    let tip = { x: cp.x + s * 2.0, y: cp.y - s * 2.5 };
    let bend = 0, art = null;
    if (this.artOn()) {
      // 像素图集：先画小猫（竿子是画在图里的），再从图里的竿尖拉出鱼线
      art = this.fishPose(f);
      art.r = this.drawCatArt(ctx, cp.x, cp.y, s, art);
      tip = (art.r && art.r.tip) || { x: cp.x + s * 0.4, y: cp.y - s * 0.9 };
    } else {
      if (f.phase === 'bite') { bend = 0.35 + Math.sin(this.t * 30) * 0.05; }
      if (f.phase === 'reeling') { bend = f.escaped && f.t > f.dur * 0.6 ? 0 : 0.5 + Math.sin(this.t * 20) * 0.08; }
      if (f.phase === 'casting') {
        const p = f.t / f.dur;
        const ang = p < 0.35 ? -0.9 * (p / 0.35) : -0.9 + 0.9 * smooth(0.35, 0.7, p);
        const dx = tip.x - hand.x, dy = tip.y - hand.y;
        tip = { x: hand.x + dx * Math.cos(ang) - dy * Math.sin(ang), y: hand.y + dx * Math.sin(ang) + dy * Math.cos(ang) };
      }
      tip.y += bend * s * 0.9; tip.x -= bend * s * 0.2;
    }

    // 浮漂位置
    let bob = null, lineTaut = false;
    if (f.phase === 'casting') {
      const p = smooth(0.3, 1, f.t / f.dur);
      if (p > 0) bob = { x: tip.x + (target.x - tip.x) * p, y: tip.y + (target.y - tip.y) * p - Math.sin(p * Math.PI) * s * 1.2 };
      if (p >= 1 && !f.splashed) { f.splashed = true; this.splash(target, 6, 0.5); }
    } else if (f.phase === 'waiting') {
      const nib = (f.dur - f.t < 1.2 && Math.sin(this.t * 25) > 0.6) ? 3 : 0;
      bob = { x: target.x, y: target.y + Math.sin(this.t * 2.2) * 2 + nib };
    } else if (f.phase === 'bite') {
      bob = { x: target.x + Math.sin(this.t * 40) * 2, y: target.y + 8 }; lineTaut = true;
    } else if (f.phase === 'reeling') {
      const p = f.t / f.dur;
      const nx = this.W * 0.42;
      bob = { x: target.x + (nx - target.x) * p, y: target.y + 6 + Math.sin(this.t * 18) * 3 };
      lineTaut = !(f.escaped && p > 0.6);
      if (Math.random() < 0.3) this.splashes.push({ x: bob.x, y: bob.y, vx: rand(-40, 40), vy: rand(-90, -30), life: 0.4, t: 0 });
      // 鱼影
      if (!(f.escaped && p > 0.6)) {
        ctx.save(); ctx.globalAlpha = 0.3; ctx.translate(bob.x + 18, bob.y + 14); ctx.scale(-1, 0.5);
        ctx.fillStyle = '#0a1a28'; ctx.beginPath(); ctx.ellipse(0, 0, s * 0.35, s * 0.12, 0, 0, 7); ctx.fill(); ctx.restore();
      }
    }

    // 竿（像素图集里已经画好了）
    if (!art) {
      ctx.strokeStyle = shade('#6b4a2a', 0.6); ctx.lineWidth = 4; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(hand.x - s * 0.15, hand.y + s * 0.2);
      ctx.quadraticCurveTo((hand.x + tip.x) / 2 + bend * s * 0.3, (hand.y + tip.y) / 2 - bend * s * 0.2, tip.x, tip.y); ctx.stroke();
      ctx.strokeStyle = shade('#c49a5a', 0.6); ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(hand.x, hand.y);
      ctx.quadraticCurveTo((hand.x + tip.x) / 2 + bend * s * 0.3, (hand.y + tip.y) / 2 - bend * s * 0.2, tip.x, tip.y); ctx.stroke();
    }

    // 线
    if (bob) {
      ctx.strokeStyle = night > 0.5 ? 'rgba(220,230,255,0.55)' : 'rgba(255,255,255,0.7)'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(tip.x, tip.y);
      if (lineTaut) ctx.lineTo(bob.x, bob.y);
      else ctx.quadraticCurveTo((tip.x + bob.x) / 2, Math.max(tip.y, bob.y) + s * 0.5, bob.x, bob.y);
      ctx.stroke();
      // 浮漂
      const glowF = Game.S.perms.glowfloat && night > 0.3;
      if (glowF) {
        const rg = ctx.createRadialGradient(bob.x, bob.y, 1, bob.x, bob.y, 26);
        rg.addColorStop(0, 'rgba(140,255,200,0.6)'); rg.addColorStop(1, 'rgba(140,255,200,0)');
        ctx.fillStyle = rg; ctx.beginPath(); ctx.arc(bob.x, bob.y, 26, 0, 7); ctx.fill();
      }
      if (f.phase !== 'bite') {
        ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.ellipse(bob.x, bob.y + 2, 4, 3, 0, 0, Math.PI); ctx.fill();
        ctx.fillStyle = glowF ? '#7dffc4' : '#e8443a'; ctx.beginPath(); ctx.ellipse(bob.x, bob.y, 4, 5, 0, Math.PI, 0); ctx.fill();
        ctx.fillRect(bob.x - 0.8, bob.y - 10, 1.6, 6);
      }
      if (f.phase === 'waiting' && Math.random() < 0.01) this.ripples.push({ x: bob.x, y: bob.y + 2, t: 0, life: 1.2 });
    }

    // 猫
    if (!art) this.drawCat(ctx, cp.x, cp.y, s, shade, f);

    // 头顶感叹号
    if (f.phase === 'bite' && art && art.r) {
      const bounce = Math.abs(Math.sin(this.t * 10)) * 6;
      Art.draw(ctx, 'cat', 'bang', cp.x + s * 0.25, art.r.top + s * 0.05 - bounce, s * CAT_ART_K * 0.62);
    } else if (f.phase === 'bite') {
      const bx = cp.x + s * 0.55, by = cp.y - s * 1.75 - Math.abs(Math.sin(this.t * 10)) * 6;
      ctx.fillStyle = '#fff'; ctx.strokeStyle = '#333'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(bx, by, s * 0.24, 0, 7); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#e53935'; ctx.font = `bold ${s * 0.34}px sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText('!', bx, by + 1);
    }
  },

  // ---------- 像素图集里的小猫（art 模块）----------
  artOn() { return typeof Art !== 'undefined' && Art.ready('cat') && !Game.S.settings.vectorCat; },
  artTint() {
    if (!this._outdoor) return null;
    const st = this.seasonTint || ['#fff', 0];
    return [[st[0], st[1] * 0.45], ['#0a1030', clamp((1 - (this.light == null ? 1 : this.light)) * 0.55, 0, 0.8)]];
  },
  // 钓鱼时每个阶段用哪一帧
  fishPose(f) {
    const m = this.catMood, t = this.t;
    if (f.blocked) return { name: Art.at('cat', 'idle', t), sleep: true };
    if (m.kind === 'happy' && m.t < 1.4) return { name: 'jump0', hop: Math.abs(Math.sin(m.t * 8)) * Math.max(0, 1 - m.t / 1.4) };
    if (m.kind === 'sad' && m.t < 1.3) return { name: Art.at('cat', 'hurt', m.t) };
    if (f.phase === 'casting') { const p = f.t / f.dur; return { name: p < 0.32 ? 'fishR0' : p < 0.55 ? 'fishR1' : 'fishR2' }; }
    if (f.phase === 'waiting') return { name: f.dur - f.t < 1.2 ? Art.at('cat', 'nibble', t) : 'fishR2', breathe: true };
    if (f.phase === 'bite') return { name: 'fishR3', shake: 1.5 };
    if (f.phase === 'reeling') return f.escaped && f.t > f.dur * 0.6 ? { name: 'fishR2' } : { name: Art.at('cat', 'reel', t), shake: 1 };
    return { name: 'fishR2', breathe: true };
  },
  // pose：{ name 帧名, flip, hop 0~1 跳起, shake 抖动, breathe 呼吸, sleep 头顶冒 zzz, shadow:false 不画影子 }
  drawCatArt(ctx, x, y, s, pose) {
    const sc = s * CAT_ART_K, hop = (pose.hop || 0) * s * 0.35;
    const dx = pose.shake ? Math.sin(this.t * 40) * pose.shake : 0;
    if (pose.shadow !== false) {
      ctx.fillStyle = 'rgba(0,0,0,0.22)';
      ctx.beginPath(); ctx.ellipse(x + 2, y + 1, s * 0.4 * (1 - (pose.hop || 0) * 0.35), s * 0.055, 0, 0, 7); ctx.fill();
    }
    const r = Art.draw(ctx, 'cat', pose.name, x + dx, y - hop, sc, { flip: pose.flip, sy: pose.breathe ? 1 + Math.sin(this.t * 2) * 0.012 : 1, tint: this.artTint() });
    if (pose.sleep && r) { // 睡觉 zzz（背包满被卡住时）
      ctx.fillStyle = 'rgba(255,255,255,0.85)'; ctx.font = `bold ${s * 0.2}px sans-serif`;
      const k = (this.t * 0.6) % 1;
      ctx.globalAlpha = 1 - k; ctx.fillText('z', x + s * 0.4 + k * s * 0.3, r.top - k * s * 0.5); ctx.globalAlpha = 1;
    }
    return r;
  },

  drawCat(ctx, x, y, s, shade, f) {
    // 别的模块（航海、副本、小镇）也用这个函数画小猫：f.pose 可以是动画名（idle / walk / look ……）或帧名
    if (this.artOn()) { this.drawCatArt(ctx, x, y, s, { name: Art.at('cat', f.pose || 'idle', f.t != null ? f.t : this.t), flip: f.flip, sleep: f.blocked, shadow: f.shadow }); return; }
    const mood = this.catMood.kind;
    const fur = shade('#f2a246', 0.55), furD = shade('#d07a22', 0.55), belly = shade('#fff1dc', 0.55), pink = shade('#f7a7b5', 0.5);
    const out = 'rgba(60,35,15,0.8)';
    const bounce = mood === 'happy' ? Math.abs(Math.sin(this.catMood.t * 9)) * s * 0.08 * Math.max(0, 1 - this.catMood.t / 1.5) : 0;
    const breathe = Math.sin(this.t * 2) * s * 0.012;
    ctx.save();
    ctx.translate(x, y - bounce);
    ctx.lineWidth = Math.max(1.5, s * 0.025); ctx.strokeStyle = out; ctx.lineJoin = 'round'; ctx.lineCap = 'round';

    // 尾巴
    const sw = Math.sin(this.t * (mood === 'alert' ? 6 : 1.6)) * 0.35;
    ctx.strokeStyle = out; ctx.lineWidth = s * 0.16;
    ctx.beginPath(); ctx.moveTo(-s * 0.35, -s * 0.12);
    ctx.bezierCurveTo(-s * 0.9, -s * 0.05, -s * (0.8 + sw * 0.3), -s * (0.55 + sw), -s * (0.55 + sw * 0.4), -s * (0.85 + sw * 0.6));
    ctx.stroke();
    ctx.strokeStyle = fur; ctx.lineWidth = s * 0.12; ctx.stroke();
    ctx.lineWidth = Math.max(1.5, s * 0.025); ctx.strokeStyle = out;

    // 身体
    ctx.fillStyle = fur;
    ctx.beginPath(); ctx.ellipse(0, -s * 0.38 - breathe, s * 0.42, s * 0.4 + breathe, 0, 0, 7); ctx.fill(); ctx.stroke();
    ctx.fillStyle = belly;
    ctx.beginPath(); ctx.ellipse(s * 0.18, -s * 0.33, s * 0.2, s * 0.28, 0.2, 0, 7); ctx.fill();
    // 背部条纹
    ctx.strokeStyle = furD; ctx.lineWidth = s * 0.05;
    for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.arc(-s * 0.05, -s * 0.38, s * (0.25 + i * 0.001), Math.PI * (1.05 + i * 0.18), Math.PI * (1.15 + i * 0.18)); ctx.stroke(); }
    ctx.strokeStyle = out; ctx.lineWidth = Math.max(1.5, s * 0.025);
    // 后脚
    ctx.fillStyle = fur;
    ctx.beginPath(); ctx.ellipse(-s * 0.12, -s * 0.04, s * 0.2, s * 0.08, 0, 0, 7); ctx.fill(); ctx.stroke();
    // 前爪（握竿）
    ctx.beginPath(); ctx.ellipse(s * 0.5, -s * 0.6, s * 0.1, s * 0.08, -0.4, 0, 7); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(s * 0.28, -s * 0.5); ctx.quadraticCurveTo(s * 0.4, -s * 0.52, s * 0.45, -s * 0.58); ctx.stroke();

    // 头
    const hx = s * 0.22, hy = -s * 0.98 + (mood === 'sad' ? s * 0.06 : 0);
    const tilt = mood === 'alert' ? 0.08 : mood === 'sad' ? 0.15 : Math.sin(this.t * 0.7) * 0.04;
    ctx.save(); ctx.translate(hx, hy); ctx.rotate(tilt);
    ctx.fillStyle = fur;
    const ear = (dx, flip) => {
      ctx.beginPath(); ctx.moveTo(dx - s * 0.15 * flip, -s * 0.15); ctx.lineTo(dx + s * 0.02 * flip, -s * (mood === 'sad' ? 0.36 : 0.47)); ctx.lineTo(dx + s * 0.17 * flip, -s * 0.2); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.fillStyle = pink; ctx.beginPath(); ctx.moveTo(dx - s * 0.07 * flip, -s * 0.19); ctx.lineTo(dx + s * 0.02 * flip, -s * (mood === 'sad' ? 0.31 : 0.39)); ctx.lineTo(dx + s * 0.1 * flip, -s * 0.21); ctx.closePath(); ctx.fill(); ctx.fillStyle = fur;
    };
    ear(-s * 0.14, 1); ear(s * 0.16, 1);
    ctx.beginPath(); ctx.ellipse(0, 0, s * 0.33, s * 0.28, 0, 0, 7); ctx.fill(); ctx.stroke();
    // 额头花纹
    ctx.strokeStyle = furD; ctx.lineWidth = s * 0.035;
    for (let i = -1; i <= 1; i++) { ctx.beginPath(); ctx.moveTo(s * 0.05 + i * s * 0.07, -s * 0.26); ctx.lineTo(s * 0.06 + i * s * 0.06, -s * 0.16); ctx.stroke(); }
    // 嘴周
    ctx.fillStyle = belly; ctx.beginPath(); ctx.ellipse(s * 0.14, s * 0.08, s * 0.15, s * 0.11, 0, 0, 7); ctx.fill();
    // 眼睛
    ctx.strokeStyle = '#2a1a10'; ctx.fillStyle = '#2a1a10'; ctx.lineWidth = s * 0.03;
    const blink = (this.t % 4.3) < 0.12;
    const eyeAt = (ex) => {
      if (mood === 'happy') { ctx.beginPath(); ctx.arc(ex, -s * 0.02, s * 0.05, Math.PI * 1.1, Math.PI * 1.9); ctx.stroke(); }
      else if (mood === 'sad') { ctx.beginPath(); ctx.moveTo(ex - s * 0.05, -s * 0.04); ctx.lineTo(ex + s * 0.05, -s * 0.01); ctx.stroke(); }
      else if (blink && mood !== 'alert') { ctx.beginPath(); ctx.moveTo(ex - s * 0.04, -s * 0.03); ctx.lineTo(ex + s * 0.04, -s * 0.03); ctx.stroke(); }
      else {
        const r = mood === 'alert' ? s * 0.06 : s * 0.045;
        ctx.beginPath(); ctx.ellipse(ex, -s * 0.03, r * 0.85, r, 0, 0, 7); ctx.fill();
        ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(ex + r * 0.3, -s * 0.03 - r * 0.4, r * 0.3, 0, 7); ctx.fill(); ctx.fillStyle = '#2a1a10';
      }
    };
    eyeAt(-s * 0.02); eyeAt(s * 0.2);
    // 鼻子嘴
    ctx.fillStyle = pink; ctx.beginPath(); ctx.moveTo(s * 0.12, s * 0.04); ctx.lineTo(s * 0.17, s * 0.04); ctx.lineTo(s * 0.145, s * 0.075); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = '#5a3a2a'; ctx.lineWidth = s * 0.018;
    if (mood === 'happy') { ctx.fillStyle = '#c0505a'; ctx.beginPath(); ctx.arc(s * 0.145, s * 0.1, s * 0.04, 0, Math.PI); ctx.fill(); }
    else { ctx.beginPath(); ctx.arc(s * 0.12, s * 0.09, s * 0.025, 0, Math.PI); ctx.arc(s * 0.17, s * 0.09, s * 0.025, 0, Math.PI); ctx.stroke(); }
    // 胡须
    ctx.strokeStyle = 'rgba(255,255,255,0.8)'; ctx.lineWidth = 1;
    for (let i = -1; i <= 1; i++) {
      ctx.beginPath(); ctx.moveTo(s * 0.26, s * 0.07); ctx.lineTo(s * 0.48, s * (0.04 + i * 0.05)); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(s * 0.0, s * 0.07); ctx.lineTo(-s * 0.2, s * (0.04 + i * 0.05)); ctx.stroke();
    }
    // 腮红
    ctx.fillStyle = 'rgba(255,120,140,0.3)';
    ctx.beginPath(); ctx.ellipse(-s * 0.08, s * 0.06, s * 0.05, s * 0.03, 0, 0, 7); ctx.fill();
    ctx.beginPath(); ctx.ellipse(s * 0.3, s * 0.06, s * 0.05, s * 0.03, 0, 0, 7); ctx.fill();
    // 草帽
    ctx.fillStyle = shade('#e9c46a', 0.5); ctx.strokeStyle = 'rgba(110,80,20,0.9)'; ctx.lineWidth = Math.max(1.5, s * 0.022);
    ctx.beginPath(); ctx.ellipse(s * 0.02, -s * 0.22, s * 0.42, s * 0.07, -0.08, 0, 7); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.ellipse(s * 0.02, -s * 0.28, s * 0.2, s * 0.13, -0.08, Math.PI, 0); ctx.fill(); ctx.stroke();
    ctx.fillStyle = shade('#d64545', 0.5); ctx.fillRect(-s * 0.17, -s * 0.27, s * 0.38, s * 0.04);
    // 汗滴
    if (mood === 'sad') {
      ctx.fillStyle = '#8fd3ff'; ctx.beginPath(); ctx.moveTo(s * 0.36, -s * 0.15); ctx.quadraticCurveTo(s * 0.44, -s * 0.02, s * 0.36, s * 0.0); ctx.quadraticCurveTo(s * 0.28, -s * 0.02, s * 0.36, -s * 0.15); ctx.fill();
    }
    ctx.restore();
    // 睡觉 zzz（背包满被卡住时）
    if (f.blocked) {
      ctx.fillStyle = 'rgba(255,255,255,0.85)'; ctx.font = `bold ${s * 0.2}px sans-serif`;
      const k = (this.t * 0.6) % 1;
      ctx.globalAlpha = 1 - k; ctx.fillText('z', s * 0.5 + k * s * 0.3, -s * 1.3 - k * s * 0.5);
      ctx.globalAlpha = 1;
    }
    ctx.restore();
  },

  drawEffects(ctx, dt) {
    for (let i = this.splashes.length - 1; i >= 0; i--) {
      const p = this.splashes[i]; p.t += dt;
      if (p.t > p.life) { this.splashes.splice(i, 1); continue; }
      p.vy += 400 * dt; p.x += p.vx * dt; p.y += p.vy * dt;
      ctx.fillStyle = `rgba(230,245,255,${1 - p.t / p.life})`;
      ctx.beginPath(); ctx.arc(p.x, p.y, 2.2, 0, 7); ctx.fill();
    }
    for (let i = this.bursts.length - 1; i >= 0; i--) {
      const b = this.bursts[i]; b.t += dt;
      if (b.t > 1.6) { this.bursts.splice(i, 1); continue; }
      const p = b.t / 1.6;
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      ctx.strokeStyle = b.color; ctx.globalAlpha = 1 - p; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(b.x, b.y, 20 + p * 140, 0, 7); ctx.stroke();
      for (let k = 0; k < 12; k++) {
        const a = k / 12 * Math.PI * 2 + b.t;
        ctx.beginPath(); ctx.moveTo(b.x + Math.cos(a) * (30 + p * 60), b.y + Math.sin(a) * (30 + p * 60));
        ctx.lineTo(b.x + Math.cos(a) * (50 + p * 110), b.y + Math.sin(a) * (50 + p * 110)); ctx.stroke();
      }
      ctx.restore();
    }
    for (let i = this.flyers.length - 1; i >= 0; i--) {
      const fl = this.flyers[i]; fl.t += dt;
      const total = 2.0;
      if (fl.t > total) { this.flyers.splice(i, 1); continue; }
      const p = Math.min(1, fl.t / 0.7);
      const e = 1 - Math.pow(1 - p, 2);
      const x = fl.x0 + (fl.x1 - fl.x0) * e;
      const y = fl.y0 + (fl.y1 - fl.y0) * e - Math.sin(p * Math.PI) * 80;
      ctx.save();
      ctx.globalAlpha = fl.t > total - 0.4 ? (total - fl.t) / 0.4 : 1;
      ctx.translate(x, y + (p >= 1 ? Math.sin(fl.t * 6) * 3 : 0));
      ctx.rotate(p < 1 ? -0.6 + p * 0.6 + Math.sin(fl.t * 25) * 0.2 : Math.sin(fl.t * 8) * 0.1);
      ctx.scale(-1, 1); // 鱼头朝向小猫
      drawFishShape(ctx, fl.def, fl.len, { t: fl.t });
      ctx.restore();
    }
  },

  drawWeather(ctx, dt, W, H, hz, weather, scene) {
    const rainN = weather === 'rain' ? 160 : weather === 'storm' ? 380 : 0;
    const snowN = weather === 'snow' ? 220 : 0;
    // 雨
    while (this.drops.filter(d => !d.snow).length < rainN) this.drops.push({ x: Math.random() * W * 1.2, y: Math.random() * H, v: rand(700, 1000), snow: false });
    while (this.drops.filter(d => d.snow).length < snowN) this.drops.push({ x: Math.random() * W, y: Math.random() * H, v: rand(30, 80), snow: true, p: Math.random() * 6, r: rand(1, 3) });
    let rc = 0, sc = 0;
    ctx.lineWidth = 1;
    ctx.strokeStyle = weather === 'storm' ? 'rgba(200,210,230,0.45)' : 'rgba(210,225,240,0.4)';
    ctx.beginPath();
    for (let i = this.drops.length - 1; i >= 0; i--) {
      const d = this.drops[i];
      if (d.snow) {
        if (++sc > snowN) { this.drops.splice(i, 1); continue; }
        d.y += d.v * dt; d.x += Math.sin(this.t + d.p) * 20 * dt;
        if (d.y > H) { d.y = -5; d.x = Math.random() * W; }
        continue;
      }
      if (++rc > rainN) { this.drops.splice(i, 1); continue; }
      const wind = weather === 'storm' ? 0.35 : 0.15;
      d.y += d.v * dt; d.x -= d.v * wind * dt;
      if (d.y > H) { d.y = -20; d.x = Math.random() * W * 1.3; }
      ctx.moveTo(d.x, d.y); ctx.lineTo(d.x + 14 * wind, d.y - 14);
    }
    ctx.stroke();
    if (snowN) {
      ctx.fillStyle = 'rgba(255,255,255,0.85)';
      for (const d of this.drops) if (d.snow) { ctx.beginPath(); ctx.arc(d.x, d.y, d.r, 0, 7); ctx.fill(); }
    }
    // 闪电
    if (weather === 'storm') {
      this.nextBolt -= dt;
      if (this.nextBolt <= 0) {
        this.nextBolt = rand(5, 14); this.flash = 0.55;
        const pts = []; let x = rand(W * 0.4, W * 0.95), y = 0;
        while (y < hz) { pts.push([x, y]); x += rand(-30, 30); y += rand(15, 40); }
        this.bolt = { pts, t: 0 };
        if (typeof Sound !== 'undefined') Sound.thunder();
      }
      if (this.bolt) {
        this.bolt.t += dt;
        if (this.bolt.t < 0.25) {
          ctx.strokeStyle = `rgba(255,255,255,${1 - this.bolt.t * 4})`; ctx.lineWidth = 2.5;
          ctx.beginPath(); this.bolt.pts.forEach(([x, y], i) => i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)); ctx.stroke();
        } else this.bolt = null;
      }
    }
    // 雾
    if (weather === 'fog') {
      const night = 1 - this.daylight(Game.hour());
      const fc = mixArr('#d8dde2', '#3a4258', night);
      for (let k = 0; k < 4; k++) {
        const y = hz - H * 0.1 + k * H * 0.12;
        const off = Math.sin(this.t * 0.1 + k) * 80;
        const g = ctx.createLinearGradient(0, y - H * 0.1, 0, y + H * 0.1);
        g.addColorStop(0, rgbStr(fc, 0)); g.addColorStop(0.5, rgbStr(fc, 0.32)); g.addColorStop(1, rgbStr(fc, 0));
        ctx.fillStyle = g; ctx.fillRect(off - 100, y - H * 0.1, W + 200, H * 0.2);
      }
    }
  },
};
