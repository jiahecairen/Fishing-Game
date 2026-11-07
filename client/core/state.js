// ===== 内核 · 存档状态 =====
// 存档是一个大对象 S。每个模块用 CF.module({ state() {...} }) 声明自己「拥有」哪些顶层字段，
// 内核负责：新存档时填默认值、读旧存档时补齐缺的字段、提醒字段重名。
// 多个模块都想往里加默认值的「公共袋子」（settings / buffs / flags / stats）用 shared 声明。
// 新模块请用自己的 id 当字段名（例如 S.diving = {...}），这样永远不会和别人冲突。
'use strict';

CF.state = {
  S: null,
  owners: {},
  SHARED: ['settings', 'buffs', 'flags', 'stats'],

  fresh() {
    const S = { v: 2, uid: 1, lastSave: Date.now() };
    const owners = {};
    const add = (owner, obj) => {
      for (const k of Object.keys(obj || {})) {
        if (owners[k] && owners[k] !== owner) console.warn(`[CF] 存档字段「${k}」同时被 ${owners[k]} 和 ${owner} 声明了，请改名`);
        owners[k] = owner; S[k] = obj[k];
      }
    };
    add('core', Game.coreState());
    for (const k of this.SHARED) S[k] = S[k] || {};
    for (const m of CF.parts()) {
      if (m.state) add(m.id, m.state());
      if (m.shared) for (const [bag, vals] of Object.entries(m.shared)) S[bag] = Object.assign(S[bag] || {}, typeof vals === 'function' ? vals() : vals);
    }
    this.owners = owners;
    return S;
  },
  // raw：JSON 字符串或对象；返回是否读到了旧存档
  load(raw) {
    let s = null;
    if (raw) { try { s = typeof raw === 'string' ? JSON.parse(raw) : JSON.parse(JSON.stringify(raw)); } catch (e) { console.warn('存档解析失败', e); s = null; } }
    const S = this.fresh();
    if (s && typeof s === 'object') {
      for (const k of Object.keys(s)) {
        const d = S[k], v = s[k];
        // 对象字段做一层合并：默认值里有、旧存档里没有的子字段会被补上
        if (d && v && typeof d === 'object' && typeof v === 'object' && !Array.isArray(d) && !Array.isArray(v)) S[k] = Object.assign(d, v);
        else S[k] = v;
      }
    }
    this.S = S;
    CF.each('migrate', S);
    return !!s;
  },
  serialize() { this.S.lastSave = Date.now(); return JSON.stringify(this.S); },
};
