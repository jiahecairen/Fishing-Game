// ===== 内核 · 通用工具（不含任何玩法） =====
'use strict';

const rand = (a, b) => a + Math.random() * (b - a);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
function weightedPick(entries) { // [[key, weight]]
  const total = entries.reduce((s, e) => s + e[1], 0);
  if (total <= 0) return entries[0] && entries[0][0];
  let r = Math.random() * total;
  for (const [k, w] of entries) { if ((r -= w) <= 0) return k; }
  return entries[entries.length - 1][0];
}
function findById(list, id) { return list.find(x => x.id === id); }
function mulberry32(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
function hash01(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
  return mulberry32(h >>> 0)();
}

// ---------- 颜色 ----------
const _hexCache = {};
function hex2rgb(h) {
  if (_hexCache[h]) return _hexCache[h];
  let s = h.replace('#', ''); if (s.length === 3) s = s.split('').map(c => c + c).join('');
  const n = parseInt(s, 16);
  return (_hexCache[h] = [(n >> 16) & 255, (n >> 8) & 255, n & 255]);
}
function rgbStr(c, a) { return a === undefined ? `rgb(${c[0] | 0},${c[1] | 0},${c[2] | 0})` : `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${a})`; }
function mixRGB(a, b, t) { return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t]; }
function mix(h1, h2, t) { return rgbStr(mixRGB(typeof h1 === 'string' ? hex2rgb(h1) : h1, typeof h2 === 'string' ? hex2rgb(h2) : h2, clamp(t, 0, 1))); }
function mixArr(h1, h2, t) { return mixRGB(typeof h1 === 'string' ? hex2rgb(h1) : h1, typeof h2 === 'string' ? hex2rgb(h2) : h2, clamp(t, 0, 1)); }
function hexA(h, a) { const c = hex2rgb(h); return `rgba(${c[0]},${c[1]},${c[2]},${a})`; }

// ---------- 文本 ----------
const $ = sel => document.querySelector(sel);
const fmt = n => n >= 1e6 ? (n / 1e6).toFixed(2) + 'M' : n >= 1e4 ? (n / 1e3).toFixed(1) + 'k' : String(Math.floor(n));
const fmtFull = n => Math.floor(n).toLocaleString('en-US');
const pct = v => Math.round(v * 100) + '%';
const pct1 = v => (v >= 0 ? '+' : '') + (v * 100).toFixed(1) + '%';
function dur(ms) {
  const s = Math.max(0, Math.floor(ms / 1000));
  if (s >= 3600) return `${Math.floor(s / 3600)}小时${Math.floor(s % 3600 / 60)}分`;
  if (s >= 60) return `${Math.floor(s / 60)}分${s % 60}秒`;
  return `${s}秒`;
}
function escapeHTML(s) { return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }
