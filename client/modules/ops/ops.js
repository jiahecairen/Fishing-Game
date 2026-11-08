// ===== 运营：后台数值、自定义装备、邮件、维护 =====
// 1. 启动时读 /api/tuning，把数值放进 CF.tuning（代码里用 CF.tune('键', 默认值) 读），
//    稀有度 / 装备品质 / 宝藏概率这几张表直接改；后台改了以后 30 秒内自动更新，不用重新登录。
// 2. 后台自定义的装备注册成隐藏装备（UNIQUES），按后台设的概率从宝箱 / 战斗里掉。
//    后台下架的装备（自带的或自定义的）不再发放，已经拿到的玩家还留着。
// 3. 每分钟看一次邮箱，后台发的东西直接放进背包并弹出「获得物品」。
// 4. 服务器进入维护：存好档，盖上「维护中」的提示；维护结束自动刷新。
'use strict';

const Ops = {
  rev: 0,
  base: {},          // 自带隐藏装备的原始数值（后台「恢复默认」时还原）
  maint: false,
  forcing: false,    // 后台发放时可以绕过「已下架」

  online() { return typeof Account !== 'undefined' && !!Account.user && !Account.stopped; },

  // ---------- 数值 ----------
  async loadTuning() {
    try { this.apply(await CF.net.api('/api/tuning')); }
    catch (e) { /* 单机模式或连不上服务器：用代码里的默认值 */ }
  },
  apply(r) {
    this.rev = r.rev || 0;
    CF.tuning = r.values || {};
    const T = CF.tuning;
    if (typeof RARITY !== 'undefined') for (const k of Object.keys(RARITY)) if (T['rarity.' + k] != null) RARITY[k].weight = T['rarity.' + k];
    if (typeof QUALITY !== 'undefined') for (const q of QUALITY) if (T['quality.' + q.id] != null) q.w = T['quality.' + q.id];
    if (typeof TREASURE_RATE !== 'undefined') for (const k of ['key', 'chest', 'map']) if (T['treasure.' + k] != null) TREASURE_RATE[k] = T['treasure.' + k];
    if (typeof UNIQUES !== 'undefined') this.applyGear(r.gear || {});
    CF.emit('tuning', r);
  },
  applyGear(gear) {
    for (const [id, U] of Object.entries(UNIQUES)) {
      if (U.custom) continue;
      if (!this.base[id]) this.base[id] = { stats: Object.assign({}, U.stats), eff: U.eff };
      const o = (gear.uniques || {})[id] || {}, b = this.base[id];
      U.stats = o.stats ? Object.assign({}, o.stats) : Object.assign({}, b.stats);
      U.eff = o.eff != null ? o.eff : b.eff;
      U.disabled = !!o.disabled;
    }
    for (const g of gear.custom || []) {
      const icon = g.icon || ((typeof SLOT_GI !== 'undefined' ? SLOT_GI[g.slot] : 'w') + g.tier);
      CF.content.define('unique', g.id, Object.assign({}, g, { icon, custom: true }));
    }
  },
  blocked(u) { const U = UNIQUES[u]; return !this.forcing && !!U && (U.disabled || U.removed); },
  droppable(key) { return Object.values(UNIQUES).filter(U => U.custom && !U.removed && U[key] > 0 && !Hero.ownsUnique(U.id)); },

  // ---------- 维护 / 参数更新 ----------
  async poll() {
    let r; try { r = await CF.net.api('/api/hello'); } catch (e) { return; }
    CF.serverInfo = Object.assign(CF.serverInfo || {}, r);
    if (r.maintenance) this.showMaintenance(r.maintenanceMsg);
    else if (this.maint) location.reload();
    else if (r.tuningRev && r.tuningRev !== this.rev) await this.loadTuning();
  },
  showMaintenance(msg) {
    if (this.maint) return;
    this.maint = true;
    try { Game.save(); CF.storage.flush(); } catch (e) { /* ignore */ }
    const html = `<div class="ac-msg">🔧 服务器维护中</div><div class="ac-help">${escapeHTML(msg || '')}<br>你的进度已经保存，维护结束后会自动刷新。</div>`;
    if (typeof Account !== 'undefined') Account.overlay(html);
    else Game.toast('🔧 服务器维护中：' + (msg || ''), 'warn');
  },

  // ---------- 邮件 ----------
  async checkMail() {
    if (!this.online() || this.maint) return;
    let r; try { r = await CF.net.api('/api/mail'); } catch (e) { return; }
    const mail = r.mail || []; if (!mail.length) return;
    const S = Game.S; S.flags.mailDone = S.flags.mailDone || [];
    const fresh = mail.filter(m => !S.flags.mailDone.includes(m.id));
    for (const m of fresh) {
      const list = this.toLoot(m.items);
      if (typeof Treasure !== 'undefined') Treasure.applyLoot(list);
      else for (const l of list) { if (l.type === 'coins') Game.addCoins(l.n); else if (l.type === 'gear' && !l.g.u) Hero.addGear(l.g, true); else if (l.type !== 'gear') Inv.give(l.type, l.id, l.n); }
      S.flags.mailDone.push(m.id);
      if (list.length) Game.emit('loot', { title: '📮 来自管理员的礼物' + (m.note ? `<div class="hint" style="margin-top:6px">${escapeHTML(m.note)}</div>` : ''), list });
    }
    if (S.flags.mailDone.length > 200) S.flags.mailDone.splice(0, S.flags.mailDone.length - 200);
    if (fresh.length) { Game.changed(); Game.save(); Account.lastUpload = 0; await Account.upload(); }
    if (Account.stopped) return; // 存档没传上去就先不确认，下次再领（mailDone 防止重复）
    try { await CF.net.api('/api/mail/ack', { method: 'POST', body: { ids: mail.map(m => m.id) } }); } catch (e) { /* 下次再确认 */ }
  },
  toLoot(items) {
    const out = [];
    for (const it of items || []) {
      if (it.type === 'coins') out.push({ type: 'coins', n: it.n });
      else if (it.type === 'gear') for (let i = 0; i < (it.n || 1); i++) out.push({ type: 'gear', g: { uid: Game.nextUid(), slot: it.slot, tier: it.tier, q: it.q, e: 0 } });
      else if (it.type === 'unique') {
        if (typeof UNIQUES === 'undefined' || !UNIQUES[it.id]) continue;
        this.forcing = true; const g = Hero.giveUnique(it.id, true); this.forcing = false;
        if (g) out.push({ type: 'gear', g }); else Game.toast(`你已经有「${UNIQUES[it.id].name}」了`, 'warn');
      } else if (Inv.kinds[it.type]) out.push({ type: it.type, id: it.id, n: it.n });
    }
    return out;
  },
};

window.Ops = Ops;

CF.module({
  id: 'ops',
  init() {
    CF.preload.push(Ops.loadTuning());
    CF.hook('hero.uniqueBlocked', u => Ops.blocked(u));
    // 自定义装备：宝箱里掉
    CF.hook('treasure.extraLoot', (tier, out) => {
      if (typeof UNIQUES === 'undefined') return;
      for (const U of Ops.droppable('chest')) if (Math.random() < U.chest) { const g = Hero.giveUnique(U.id, true); if (g) out.push({ type: 'gear', g }); }
    });
    // 自定义装备：打赢怪物掉
    CF.on('battle:win', B => {
      if (typeof UNIQUES === 'undefined') return;
      for (const U of Ops.droppable('battle')) if (Math.random() < U.battle) { const g = Hero.giveUnique(U.id, true); if (g) B.log.push(`* ✨掉落了【${U.name}】！`); }
    });
  },
  start() {
    if (CF.serverInfo && CF.serverInfo.maintenance) Ops.showMaintenance(CF.serverInfo.maintenanceMsg);
    setInterval(() => Ops.poll(), 30000);
    setTimeout(() => Ops.checkMail(), 3000);
    setInterval(() => Ops.checkMail(), 60000);
  },
});
