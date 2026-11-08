// ===== 邮件：后台给玩家发东西 =====
// 后台发出去的东西先放在服务器的「邮箱」里，玩家的游戏在线时每分钟来取一次，取到就放进背包并弹出「获得物品」。
// 这样不用直接改玩家的存档（玩家在线时直接改存档会和他的游戏互相覆盖）。
//   玩家：GET  /api/mail            我的邮件
//         POST /api/mail/ack {ids}  已经领取
//   后台：POST /api/admin/mail { to: [玩家id] | 'all', items: [...], note }
// 物品格式：
//   { type: 'coins', n }                         金币
//   { type: 'gear', slot, tier, q }              普通装备（q：0 普通 ~ 4 传说）
//   { type: 'unique', id }                       隐藏装备 / 自定义装备
//   { type: 'bait' | 'item' | 'treasure' | 'mat' | 'dish', id, n }   鱼饵、道具、宝藏、素材、料理
'use strict';
const crypto = require('crypto');
const { httpError } = require('../core/http');

const KINDS = ['bait', 'item', 'treasure', 'mat', 'dish'];
const SLOTS = ['weapon', 'hat', 'armor', 'boots', 'charm'];

function cleanItem(it) {
  const n = Math.round(+it.n || 0);
  switch (it.type) {
    case 'coins': if (n <= 0 || n > 1e12) throw httpError(400, '金币数量不对'); return { type: 'coins', n };
    case 'gear': {
      const tier = Math.round(+it.tier), q = Math.round(+it.q || 0);
      if (!SLOTS.includes(it.slot) || !(tier >= 1 && tier <= 5) || !(q >= 0 && q <= 4)) throw httpError(400, '装备的部位/等级/品质不对');
      return { type: 'gear', slot: it.slot, tier, q, n: Math.min(20, Math.max(1, n || 1)) };
    }
    case 'unique': if (!/^(u|cg)_\w+$/.test(String(it.id || ''))) throw httpError(400, '装备编号不对'); return { type: 'unique', id: String(it.id) };
    default:
      if (!KINDS.includes(it.type)) throw httpError(400, '不认识的物品种类：' + it.type);
      if (!/^\w{1,32}$/.test(String(it.id || ''))) throw httpError(400, '物品编号不对');
      if (n <= 0 || n > 1e6) throw httpError(400, '数量不对');
      return { type: it.type, id: String(it.id), n };
  }
}

module.exports = {
  name: '邮件',
  init(app, ctx) {
    const { store, log } = ctx;
    const box = store.table('mail', () => ({}));
    ctx.mailPending = uid => uid ? (box[uid] || []).length : Object.values(box).reduce((s, l) => s + l.length, 0);

    app.get('/api/mail', req => { const u = ctx.requireUser(req); return { mail: box[u.id] || [] }; });
    app.post('/api/mail/ack', req => {
      const u = ctx.requireUser(req);
      const ids = new Set((req.body.ids || []).map(String));
      box[u.id] = (box[u.id] || []).filter(m => !ids.has(m.id));
      if (!box[u.id].length) delete box[u.id];
      store.touch('mail');
      return { ok: true };
    });

    app.post('/api/admin/mail', req => {
      ctx.requireAdmin(req);
      const items = (req.body.items || []).map(cleanItem);
      if (!items.length) throw httpError(400, '至少要发一样东西');
      const note = String(req.body.note || '').slice(0, 100);
      const all = Object.values(ctx.users.list);
      const to = req.body.to === 'all' ? all.map(u => u.id) : (req.body.to || []).map(String).filter(id => ctx.users.list[id]);
      if (!to.length) throw httpError(400, '没有选玩家');
      for (const uid of to) (box[uid] = box[uid] || []).push({ id: crypto.randomBytes(6).toString('hex'), items, note, ts: Date.now() });
      store.touch('mail');
      log.info(`后台给 ${to.length} 个玩家发了邮件：${items.map(i => i.type + (i.id ? ':' + i.id : '') + (i.n ? '×' + i.n : '')).join('、')}`);
      return { sent: to.length };
    });
  },
};
