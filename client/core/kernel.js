// ===== 内核 · CF（Cat Fishing）=====
// 内核只负责「把模块装起来、让它们互相说话」，不包含任何玩法。
//
//   模块清单   CF.manifest({...})            写在 modules/<id>/module.js 里：依赖和文件列表
//   模块定义   CF.module({...})              写在模块的主文件里：存档字段、生命周期
//   事件总线   CF.on / CF.emit              「发生了什么」——谁都可以听
//   钩子       CF.hook / call / sum / first / filter   「我也想参与计算」——比如加成、拦截
//   内容注册   CF.content.define(type, id, def)        鱼、怪物、副本、技能、料理……
//
// 模块之间不直接修改对方的代码；需要协作时，用事件和钩子。
'use strict';

const CF = {
  version: '0.5.0',
  manifests: {},   // id -> { id, name, requires, files, css }
  modules: {},     // id -> 运行时定义
  order: [],       // 加载顺序（已按依赖排序）
  started: false,

  // ---------- 模块 ----------
  manifest(m) {
    if (!m || !m.id) throw new Error('manifest 缺少 id');
    this.manifests[m.id] = Object.assign({ requires: [], optional: [], files: [], css: [] }, m);
  },
  // 一个模块可以分好几个文件，每个文件都可以调用 CF.module({ id, ... })，生命周期函数会依次执行
  module(def) {
    if (!def || !def.id) throw new Error('CF.module 缺少 id');
    const m = this.modules[def.id] || (this.modules[def.id] = { id: def.id, parts: [] });
    m.parts.push(def); this._parts = null;
    return m;
  },
  parts() {
    if (this._parts) return this._parts;
    const out = []; for (const id of this.order) { const m = this.modules[id]; if (m) out.push(...m.parts); }
    return (this._parts = out);
  },
  has(id) { return !!this.manifests[id] && this.order.includes(id); },

  // ---------- 资源预加载 ----------
  // 模块可以把「要先加载完的东西」（图片、图集……）放进来：CF.preload.push(promise)
  // 内核会在显示登录界面、读存档之前等它们（最多等 ms 毫秒，加载失败也不会卡住游戏）
  preload: [],

  // ---------- 可调参数（后台管理页面里改的那些数值）----------
  // 用法：CF.tune('fish.biteBase', 7) —— 后台没改过就用后面的默认值。
  // 新增一个可调参数：在代码里这样写，再到 server/tuning/schema.js 里加一行（默认值要和这里一样）。
  tuning: {},
  tune(key, def) { const v = this.tuning[key]; return v === undefined || v === null || v === '' || Number.isNaN(v) ? def : v; },
  waitPreload(ms) {
    const all = Promise.all(this.preload.map(p => Promise.resolve(p).catch(e => console.warn('[CF] 资源加载失败', e))));
    return Promise.race([all, new Promise(r => setTimeout(r, ms || 4000))]);
  },
  // 按 requires 做拓扑排序；缺依赖的模块会被跳过并报错
  sortManifests(ids) {
    const out = [], state = {}, M = this.manifests;
    const visit = (id, chain) => {
      if (state[id] === 2) return true;
      if (state[id] === 1) { console.error('[CF] 模块循环依赖：', chain.concat(id).join(' → ')); return false; }
      const m = M[id];
      if (!m) { console.error(`[CF] 找不到模块「${id}」（被 ${chain[chain.length - 1] || '清单'} 需要）`); return false; }
      state[id] = 1;
      for (const r of m.requires) if (!visit(r, chain.concat(id))) { state[id] = 3; console.error(`[CF] 模块「${id}」缺少依赖「${r}」，已跳过`); return false; }
      for (const r of m.optional) if (M[r] && ids.includes(r)) visit(r, chain.concat(id));
      state[id] = 2; out.push(id); return true;
    };
    for (const id of ids) visit(id, []);
    return out;
  },
  each(fnName, ...args) {
    for (const p of this.parts()) {
      if (typeof p[fnName] === 'function') {
        try { p[fnName](...args); } catch (e) { console.error(`[CF] ${p.id}.${fnName} 出错`, e); }
      }
    }
  },

  // ---------- 事件总线 ----------
  _ev: {},
  on(ev, fn) { (this._ev[ev] = this._ev[ev] || []).push(fn); return () => this.off(ev, fn); },
  off(ev, fn) { const l = this._ev[ev]; if (l) { const i = l.indexOf(fn); if (i >= 0) l.splice(i, 1); } },
  emit(ev, data) {
    const l = this._ev[ev]; if (!l) return;
    for (const fn of l.slice()) { try { fn(data); } catch (e) { console.error(`[CF] 事件 ${ev} 的监听出错`, e); } }
  },

  // ---------- 钩子 ----------
  // 钩子是「可以被别的模块参与的计算」。例如钓鱼幸运 = 鱼竿幸运 + CF.sum('fish.luck')，
  // 装备模块、料理模块各自 CF.hook('fish.luck', () => 数值) 就能加成，钓鱼模块完全不用知道它们。
  _hooks: {},
  hook(name, fn, priority) {
    const l = (this._hooks[name] = this._hooks[name] || []);
    l.push({ fn, p: priority || 0 }); l.sort((a, b) => a.p - b.p);
    return () => { const i = l.findIndex(h => h.fn === fn); if (i >= 0) l.splice(i, 1); };
  },
  hooks(name) { return this._hooks[name] || []; },
  call(name, ...args) {   // 调用全部，返回结果数组
    const out = [];
    for (const h of this.hooks(name)) { try { out.push(h.fn(...args)); } catch (e) { console.error(`[CF] 钩子 ${name} 出错`, e); } }
    return out;
  },
  sum(name, ...args) { return this.call(name, ...args).reduce((s, v) => s + (+v || 0), 0); },
  first(name, ...args) {  // 返回第一个「有结果」的钩子
    for (const h of this.hooks(name)) {
      let v; try { v = h.fn(...args); } catch (e) { console.error(`[CF] 钩子 ${name} 出错`, e); }
      if (v !== undefined && v !== null && v !== false) return v;
    }
    return undefined;
  },
  filter(name, value, ...args) { // 依次加工一个值
    for (const h of this.hooks(name)) { try { const v = h.fn(value, ...args); if (v !== undefined) value = v; } catch (e) { console.error(`[CF] 钩子 ${name} 出错`, e); } }
    return value;
  },

  // ---------- 内容注册表 ----------
  // 每种内容（fish、monster、dungeon……）是一张表。type() 声明表（可以绑定到现成的数组/对象上），
  // define() 往表里加一条。新内容只需要在自己的文件里 define，不用改任何已有文件。
  content: {
    _t: {},
    type(name, opt) {
      const t = this._t[name] || (this._t[name] = { list: [], map: {}, onDefine: [] });
      if (opt && opt.list) { t.list = opt.list; }
      if (opt && opt.map) { t.map = opt.map; }
      if (opt && opt.onDefine) t.onDefine.push(opt.onDefine);
      return t;
    },
    define(type, id, def) {
      const t = this.type(type);
      if (t.map[id] && t.list.includes(t.map[id])) t.list.splice(t.list.indexOf(t.map[id]), 1);
      if (def && typeof def === 'object' && !Array.isArray(def) && def.id === undefined) def.id = id;
      t.map[id] = def; if (def && typeof def === 'object' && !Array.isArray(def)) t.list.push(def);
      for (const fn of t.onDefine) { try { fn(id, def); } catch (e) { console.error(`[CF] 注册 ${type}:${id} 出错`, e); } }
      return def;
    },
    get(type, id) { const t = this._t[type]; return t ? t.map[id] : undefined; },
    all(type) { const t = this._t[type]; return t ? t.list : []; },
    map(type) { return this.type(type).map; },
  },

  // ---------- 存档读写适配器 ----------
  // 内核不关心存档存在哪里：默认存在浏览器本地；account 模块会把它换成「服务器云存档」。
  storage: {
    key: 'catfish_save_v1',
    async load() {
      let raw = null; try { raw = localStorage.getItem(this.key); } catch (e) { /* ignore */ }
      return { raw, away: null };
    },
    save(json) { try { localStorage.setItem(this.key, json); } catch (e) { /* ignore */ } },
    flush() {},
    clear() { try { localStorage.removeItem(this.key); } catch (e) { /* ignore */ } },
  },
  useStorage(adapter) { this.storage = adapter; },
};
window.CF = CF;
