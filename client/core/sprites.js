// ===== 内核 · 像素立绘引擎 =====
// 立绘数据由各模块注册（怪物在 modules/monsters/ 里，每只一个文件）：
//   CF.sprite('gull', { mirror: true, pal: { w: '#fff', ... }, rows: ['....', ...] });
// 每个立绘是一张像素网格。mirror:true 时只画左半边，右半边自动镜像。
// 画完后会自动加一圈深色描边，并按 scale 放大成清晰的像素图。
'use strict';

const SPR_K = '#1b1424';
const SPRITES = {};
CF.content.type('sprite', { map: SPRITES });
CF.sprite = (id, def) => CF.content.define('sprite', id, def);
const _sprCache = {};
function spriteGrid(id) {
  const d = SPRITES[id]; if (!d) return null;
  const rows = d.rows.map(r => d.mirror ? r + r.split('').reverse().join('') : r);
  const h = rows.length, w = Math.max(...rows.map(r => r.length));
  const g = rows.map(r => (r + '.'.repeat(w)).slice(0, w).split(''));
  for (const [x, y, c] of d.patch || []) if (g[y] && x < w) g[y][x] = c;
  return { g, w, h, pal: d.pal };
}
// 返回 dataURL；flash=true 时返回纯白剪影（受击闪白）
function spriteURL(id, scale, flash) {
  const key = id + ':' + (scale || 6) + (flash ? 'f' : '');
  if (_sprCache[key]) return _sprCache[key];
  const c = spriteCanvas(id, scale, flash); if (!c) return '';
  return (_sprCache[key] = c.toDataURL());
}
const _sprCv = {};
function spriteCanvas(id, scale, flash) {
  const key = id + ':' + (scale || 6) + (flash ? 'f' : '');
  if (_sprCv[key]) return _sprCv[key];
  const s = spriteGrid(id); if (!s) return null;
  const sc = scale || 6, W = s.w + 2, H = s.h + 2;
  const c = document.createElement('canvas'); c.width = W * sc; c.height = H * sc;
  const x = c.getContext('2d');
  const filled = (gx, gy) => gx >= 0 && gy >= 0 && gx < s.w && gy < s.h && s.g[gy][gx] !== '.';
  // 描边
  x.fillStyle = flash ? '#ffffff' : SPR_K;
  for (let gy = -1; gy <= s.h; gy++) for (let gx = -1; gx <= s.w; gx++) {
    if (filled(gx, gy)) continue;
    if (filled(gx - 1, gy) || filled(gx + 1, gy) || filled(gx, gy - 1) || filled(gx, gy + 1)) x.fillRect((gx + 1) * sc, (gy + 1) * sc, sc, sc);
  }
  for (let gy = 0; gy < s.h; gy++) for (let gx = 0; gx < s.w; gx++) {
    const ch = s.g[gy][gx]; if (ch === '.') continue;
    x.fillStyle = flash ? '#ffffff' : (s.pal[ch] || '#ff00ff');
    x.fillRect((gx + 1) * sc, (gy + 1) * sc, sc, sc);
  }
  // 左上角一点高光，让像素更有体积
  if (!flash) {
    x.fillStyle = 'rgba(255,255,255,0.18)';
    for (let gy = 0; gy < s.h; gy++) for (let gx = 0; gx < s.w; gx++) {
      if (s.g[gy][gx] === '.' || s.g[gy][gx] === 'k') continue;
      if (!filled(gx, gy - 1) || !filled(gx - 1, gy)) x.fillRect((gx + 1) * sc, (gy + 1) * sc, sc, sc);
    }
  }
  return (_sprCv[key] = c);
}
// 用画好的图替换某个程序画的立绘（art 模块用它把「小橘」换成像素图集里的正面像）：
//   SPRITE_ART.hero = (scale, cls, attrs) => '<img ...>'   返回空就继续用原来的像素网格
const SPRITE_ART = {};
// <img> 标签（自动带上 pixelated 的 class）
function sprImg(id, scale, cls, attrs) {
  const art = SPRITE_ART[id] && SPRITE_ART[id](scale, cls, attrs); if (art) return art;
  return `<img class="spr ${cls || ''}" src="${spriteURL(id, scale)}" ${attrs || ''}>`;
}
