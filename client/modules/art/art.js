// ===== 美术资源 · 图集引擎 =====
// 一张大图（图集）+ 一份「帧清单」：每一帧在大图里的位置、脚底锚点，钓鱼帧还有竿尖位置。
//
//   Art.sheet('cat', { src, frames: { 名字: [x, y, w, h, 锚点x, 锚点y, 竿尖x?, 竿尖y?] }, scale: { 名字: 系数 }, anims: { 动画: { frames, fps, once } } })
//   Art.ready('cat')                                         图集加载好了吗（没好就用程序画的老样子）
//   Art.draw(ctx, 'cat', 'walk0', x, y, 缩放, opt)            画一帧，(x, y) 是脚底中心；返回 { tip, top, w, h }
//   Art.play(ctx, 'cat', 'walk', 秒, x, y, 缩放, opt)          按时间播放动画
//   Art.img('cat', 'front', 高度)                             HTML 里用的 <img>（立绘、头像）
// opt：{ flip 左右翻转, alpha 透明度, tint: [[颜色, 强度], ...] 叠一层颜色（夜晚压暗、季节色调）, sy 竖直缩放（呼吸） }
// 放大时用最近邻（像素清晰），缩小时用平滑（不会碎）。
'use strict';

const Art = {
  sheets: {},
  sheet(id, def) {
    const s = this.sheets[id] = Object.assign({ id, frames: {}, anims: {}, img: null, ready: false, urls: {} }, def);
    s.promise = new Promise(done => {
      const img = new Image();
      img.onload = () => { s.img = img; s.ready = true; CF.emit('art:ready', id); done(); };
      img.onerror = () => { console.warn('[Art] 图集加载失败：' + s.src); done(); };
      img.src = s.src + '?v=' + ((window.CF_CONFIG && CF_CONFIG.build) || 1);
    });
    CF.preload.push(s.promise);
    return s;
  },
  ready(id) { const s = this.sheets[id]; return !!(s && s.ready); },
  has(id, name) { const s = this.sheets[id]; return !!(s && s.frames[name]); },
  frame(id, name) {
    const s = this.sheets[id], f = s && s.frames[name]; if (!f) return null;
    return { x: f[0], y: f[1], w: f[2], h: f[3], ax: f[4], ay: f[5], tip: f.length > 6 ? { x: f[6], y: f[7] } : null };
  },
  // 动画在第 t 秒显示哪一帧（不是动画名就原样返回，当成帧名）
  at(id, anim, t) {
    const s = this.sheets[id], a = s && s.anims[anim]; if (!a) return anim;
    const i = Math.floor(Math.max(0, t) * (a.fps || 8));
    return a.frames[a.once ? Math.min(i, a.frames.length - 1) : i % a.frames.length];
  },
  draw(ctx, id, name, x, y, sc, o) {
    o = o || {};
    const s = this.sheets[id], f = s && s.ready && s.frames[name]; if (!f) return null;
    sc *= (s.scale && s.scale[name]) || 1; // 统一不同排的大小
    const [fx, fy, w, h, ax, ay] = f, sy = o.sy || 1;
    ctx.save();
    ctx.translate(x, y);
    if (o.flip) ctx.scale(-1, 1);
    if (o.rot) ctx.rotate(o.rot);
    if (o.alpha != null) ctx.globalAlpha *= o.alpha;
    const m = ctx.getTransform ? ctx.getTransform() : { a: 1, b: 0 };
    const dev = Math.abs(sc) * Math.hypot(m.a, m.b);
    ctx.imageSmoothingEnabled = dev < 0.98;
    if (ctx.imageSmoothingEnabled) ctx.imageSmoothingQuality = 'high';
    let src = s.img, sx = fx, sy0 = fy;
    if (o.tint && o.tint.some(t => t && t[1] > 0.01)) { src = this.tinted(s, f, o.tint); sx = 0; sy0 = 0; }
    ctx.drawImage(src, sx, sy0, w, h, -ax * sc, -ay * sc * sy, w * sc, h * sc * sy);
    ctx.restore();
    const out = { top: y - ay * sc * sy, w: w * sc, h: h * sc * sy, left: x + (o.flip ? (ax - w) : -ax) * sc };
    if (f.length > 6) out.tip = { x: x + (o.flip ? -1 : 1) * (f[6] - ax) * sc, y: y + (f[7] - ay) * sc * sy };
    return out;
  },
  play(ctx, id, anim, t, x, y, sc, o) { return this.draw(ctx, id, this.at(id, anim, t), x, y, sc, o); },
  // 叠色：先把这一帧画到小画布上，再只在有像素的地方涂一层颜色
  tinted(s, f, tint) {
    const [fx, fy, w, h] = f;
    const c = this._cv || (this._cv = document.createElement('canvas'));
    if (c.width < w || c.height < h) { c.width = Math.max(c.width, w); c.height = Math.max(c.height, h); }
    const x = c.getContext('2d');
    x.globalCompositeOperation = 'source-over'; x.globalAlpha = 1; x.clearRect(0, 0, w, h);
    x.drawImage(s.img, fx, fy, w, h, 0, 0, w, h);
    x.globalCompositeOperation = 'source-atop';
    for (const t of tint) { if (!t || t[1] <= 0.01) continue; x.globalAlpha = Math.min(1, t[1]); x.fillStyle = t[0]; x.fillRect(0, 0, w, h); }
    x.globalCompositeOperation = 'source-over'; x.globalAlpha = 1;
    return c;
  },
  // 单独一帧的图片地址（给 HTML 用），第一次用到时生成
  url(id, name) {
    const s = this.sheets[id], f = s && s.ready && s.frames[name]; if (!f) return '';
    if (s.urls[name]) return s.urls[name];
    const c = document.createElement('canvas'); c.width = f[2]; c.height = f[3];
    c.getContext('2d').drawImage(s.img, f[0], f[1], f[2], f[3], 0, 0, f[2], f[3]);
    return (s.urls[name] = c.toDataURL());
  },
  img(id, name, h, cls, attrs) {
    const f = this.frame(id, name); if (!f || !this.ready(id)) return '';
    // 比原图小就平滑缩小，比原图大就保持像素
    const smooth = h < f.h ? 'image-rendering:auto;' : '';
    return `<img class="spr art ${cls || ''}" src="${this.url(id, name)}" style="height:${Math.round(h)}px;width:auto;${smooth}" alt="" ${attrs || ''}>`;
  },
};

// 「小橘」的立绘（角色面板、登录界面、剧情头像）换成图集里的正面像
SPRITE_ART.hero = (scale, cls, attrs) => {
  if (!Art.ready('cat') || (Game.S && Game.S.settings && Game.S.settings.vectorCat)) return '';
  return Art.img('cat', 'front', 16 * (scale || 6) * 1.25, cls, attrs);
};

CF.module({
  id: 'art',
  shared: { settings: { vectorCat: false } },
  init() {
    UI.setting(55, S => `<div class="set-row"><div>经典小猫<small>打开后换回程序画的小猫；关掉就用像素图集里的小猫（走路、钓鱼、战斗都有动作）</small></div>
      <label class="switch"><input type="checkbox" data-act="setting" data-key="vectorCat" ${S.settings.vectorCat ? 'checked' : ''}><span class="slider"></span></label></div>`);
  },
});
