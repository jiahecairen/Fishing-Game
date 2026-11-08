// ===== 可调参数 & 装备管理 =====
// 玩家端：GET /api/tuning → { rev, values, gear: { custom, uniques } }，游戏启动时和参数变化时读取
// 后台：
//   GET  /api/admin/tuning                 参数清单 + 当前值 + 装备
//   PUT  /api/admin/tuning   { values }    改参数（只传改了的；传 null = 恢复默认）
//   POST /api/admin/gear     { gear }      新增 / 修改自定义装备
//   POST /api/admin/gear/remove { id }     下架自定义装备（已经拿到的玩家还留着，只是不再掉落）
//   POST /api/admin/gear/restore { id }    重新上架
//   PUT  /api/admin/unique   { id, stats, eff, disabled }   修改游戏自带的隐藏装备
// 数据存在 data/tuning.json。每次修改 rev + 1，玩家端最多 30 秒内就会拿到新数值。
'use strict';
const { httpError } = require('../core/http');
const SCHEMA = require('../tuning/schema');

const SLOTS = ['weapon', 'hat', 'armor', 'boots', 'charm'];
const STATS = ['atk', 'def', 'maxHp', 'spd', 'crit', 'luck'];

module.exports = {
  name: '可调参数',
  init(app, ctx) {
    const { store, log } = ctx;
    const T = store.table('tuning', () => ({ rev: 1, values: {}, custom: {}, uniques: {} }));
    T.values = T.values || {}; T.custom = T.custom || {}; T.uniques = T.uniques || {};
    const items = {}; for (const g of SCHEMA) for (const it of g.items) items[it.key] = it;
    const bump = what => { T.rev++; store.touch('tuning'); log.info(`后台修改了${what}（参数版本 ${T.rev}）`); };
    ctx.tuningRev = () => T.rev;

    const merged = () => { const v = {}; for (const k in items) v[k] = k in T.values ? T.values[k] : items[k].def; return v; };
    const publicGear = () => ({ custom: Object.values(T.custom), uniques: T.uniques });

    app.get('/api/tuning', () => ({ rev: T.rev, values: merged(), gear: publicGear() }));

    app.get('/api/admin/tuning', req => {
      ctx.requireAdmin(req);
      return { rev: T.rev, schema: SCHEMA, effects: SCHEMA.EFFECTS, values: merged(), changed: Object.keys(T.values), gear: publicGear() };
    });
    app.put('/api/admin/tuning', req => {
      ctx.requireAdmin(req);
      const vals = req.body.values || {}, bad = [];
      for (const [k, raw] of Object.entries(vals)) {
        const it = items[k]; if (!it) { bad.push(k); continue; }
        if (raw === null || raw === '' || raw === undefined) { delete T.values[k]; continue; }
        const v = +raw;
        if (!Number.isFinite(v) || v < it.min || v > it.max) { bad.push(`${it.label}（要在 ${it.min} ~ ${it.max} 之间）`); continue; }
        if (v === it.def) delete T.values[k]; else T.values[k] = v;
      }
      if (bad.length) throw httpError(400, '这些参数不对：' + bad.join('、'));
      bump('数值参数');
      return { rev: T.rev, values: merged(), changed: Object.keys(T.values) };
    });

    // ---------- 自定义装备 ----------
    const cleanStats = s => { const o = {}; for (const k of STATS) { const v = +((s || {})[k]); if (Number.isFinite(v) && v) o[k] = (k === 'crit' || k === 'luck') ? Math.min(5, Math.max(0, v)) : Math.round(Math.min(1e6, Math.max(0, v))); } return o; };
    app.post('/api/admin/gear', req => {
      ctx.requireAdmin(req);
      const g = req.body.gear || {};
      const name = String(g.name || '').trim().slice(0, 20);
      if (!name) throw httpError(400, '装备要有名字');
      if (!SLOTS.includes(g.slot)) throw httpError(400, '部位不对');
      const tier = Math.round(+g.tier); if (!(tier >= 1 && tier <= 5)) throw httpError(400, '等级要在 1~5 之间');
      const effect = String(g.effect || ''); if (!(effect in SCHEMA.EFFECTS)) throw httpError(400, '特效不对');
      let id = String(g.id || '');
      if (!id) { id = 'cg_' + Date.now().toString(36); }
      else if (!T.custom[id]) throw httpError(404, '没有这件自定义装备');
      const pct = x => Math.min(1, Math.max(0, +x || 0));
      T.custom[id] = {
        id, name, slot: g.slot, tier, stats: cleanStats(g.stats), effect, eff: effect ? Math.max(0, +g.eff || 0) : 0,
        edesc: String(g.edesc || '').slice(0, 60), src: String(g.src || '后台发放').slice(0, 40), icon: String(g.icon || '').slice(0, 20),
        chest: pct(g.chest), battle: pct(g.battle), removed: !!(T.custom[id] && T.custom[id].removed), custom: true,
      };
      bump(`自定义装备「${name}」`);
      return { gear: T.custom[id] };
    });
    const setRemoved = (req, v) => {
      ctx.requireAdmin(req);
      const g = T.custom[String(req.body.id)]; if (!g) throw httpError(404, '没有这件自定义装备');
      g.removed = v; bump(`自定义装备「${g.name}」${v ? '下架' : '上架'}`);
      return { gear: g };
    };
    app.post('/api/admin/gear/remove', req => setRemoved(req, true));
    app.post('/api/admin/gear/restore', req => setRemoved(req, false));

    // ---------- 游戏自带的隐藏装备 ----------
    app.put('/api/admin/unique', req => {
      ctx.requireAdmin(req);
      const id = String(req.body.id || '');
      if (!/^u_\w+$/.test(id)) throw httpError(400, '装备编号不对');
      if (req.body.reset) delete T.uniques[id];
      else T.uniques[id] = { stats: req.body.stats ? cleanStats(req.body.stats) : undefined, eff: req.body.eff != null && req.body.eff !== '' ? Math.max(0, +req.body.eff) : undefined, disabled: !!req.body.disabled };
      bump(`隐藏装备 ${id}`);
      return { uniques: T.uniques };
    });

    ctx.customGear = id => T.custom[id];
  },
};
