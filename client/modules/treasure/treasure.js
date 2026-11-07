// ===== 宝藏：钥匙、宝箱、藏宝图、掉落 =====
// 钓鱼模块通过钩子 fish.treasure 问「这一竿有没有宝藏」，这里回答。
// 掉落：Treasure.rollLoot(等级 1~4) 生成一组奖励，applyLoot 发放，Game.emit('loot', {title, list}) 弹窗展示。
'use strict';

const TREASURES = [
  { id: 'key', name: '生锈的钥匙', treasure: true, rarity: 'rare', shape: 'key', c1: '#d9a441', c2: '#8a5a1a', gi: 'key', desc: '能打开一个宝箱。' },
  { id: 'chest_wood', name: '木制宝箱', treasure: true, rarity: 'rare', shape: 'chest', c1: '#9a6a3a', c2: '#d9b25a', tier: 1, gi: 'chest', color: '#c08a4a', desc: '湿漉漉的木箱，需要钥匙。' },
  { id: 'chest_silver', name: '白银宝箱', treasure: true, rarity: 'epic', shape: 'chest', c1: '#8fa3b5', c2: '#e6eef5', tier: 2, gi: 'chest', color: '#b8cde0', desc: '沉甸甸的银箱，需要钥匙。' },
  { id: 'chest_gold', name: '黄金宝箱', treasure: true, rarity: 'legendary', shape: 'chest', c1: '#d4a017', c2: '#fff1a8', tier: 3, gi: 'chest', color: '#ffc93c', desc: '闪闪发光！需要钥匙。' },
  { id: 'map', name: '藏宝图', treasure: true, rarity: 'epic', shape: 'scroll', c1: '#e8d3a0', c2: '#b5523b', gi: 'map', desc: '标记着附近海域的宝藏，需要船。' },
  { id: 'mapPiece', name: '海盗地图碎片', treasure: true, rarity: 'epic', shape: 'scroll', c1: '#c9b48a', c2: '#2b2b3a', gi: 'mapPiece', desc: '集齐 3 片，也许能拼出什么……' },
];
// 宝藏能被「钓起来」，但不进图鉴，所以只放进 FISH_BY_ID（不进 FISH 列表）
TREASURES.forEach(t => { FISH_BY_ID[t.id] = t; });
const TREASURE_BY_ID = Object.fromEntries(TREASURES.map(t => [t.id, t]));
// 每个钓点钓到的宝箱（新钓点可以在自己的数据里写 chest: 'chest_silver'）
const SCENE_CHEST = { lake: 'chest_wood', river: 'chest_wood', bamboo: 'chest_wood', sea: 'chest_silver', coral: 'chest_silver', ice: 'chest_gold', abyss: 'chest_gold' };
const TREASURE_RATE = { key: 0.01, chest: 0.006, map: 0.002 };

const Treasure = {
  get S() { return Game.S; },
  sceneChest(scene) { const sc = Game.sceneDef(scene || this.S.scene); return (sc && sc.chest) || SCENE_CHEST[sc.id] || 'chest_wood'; },
  roll(luck, scene) {
    const k = (1 + (luck || 0)) * (1 + CF.sum('treasure.rate'));
    const r = Math.random();
    if (r < TREASURE_RATE.map * k) return FISH_BY_ID.map;
    if (r < (TREASURE_RATE.map + TREASURE_RATE.chest) * k) return FISH_BY_ID[this.sceneChest(scene)];
    if (r < (TREASURE_RATE.map + TREASURE_RATE.chest + TREASURE_RATE.key) * k) return FISH_BY_ID.key;
    return null;
  },
  gain(id, quiet, n) {
    this.S.treasure[id] = (this.S.treasure[id] || 0) + (n || 1);
    CF.emit('treasure:gain', { id, n: n || 1, quiet: !!quiet });
  },
  rollLoot(tier, gearTier) {
    const cap = gearTier || Game.progressTier(), out = [];
    const coin = [0, rand(200, 600), rand(1000, 3000), rand(4000, 12000), rand(6000, 15000)][tier] * (0.6 + cap * 0.25);
    out.push({ type: 'coins', n: Math.round(coin / 10) * 10 });
    const gearChance = [0, 0.45, 0.65, 0.85, 1][tier];
    for (let i = 0; i < (tier === 4 ? 2 : 1); i++) if (Math.random() < gearChance) {
      const t = tier === 1 ? cap - (Math.random() < 0.5 ? 1 : 0) : tier === 4 ? cap : cap + (tier === 3 && Math.random() < 0.25 ? 1 : 0);
      out.push({ type: 'gear', g: Hero.newGear(Math.max(1, t), [0, 1, 2, 2, 3][tier]) });
    }
    const pool = [['bait:lure:10', 3], ['bait:shrimp:20', 3], ['bait:catnip:5', tier], ['item:luckbell:1', 2], ['item:raincharm:1', 1], ['item:fogbottle:1', 1],
      ['treasure:key:1', 2], ['treasure:map:1', tier >= 2 ? 1.2 : 0.4]];
    for (let i = 0; i < (tier === 1 ? 1 : 2); i++) { const [type, id, c] = weightedPick(pool).split(':'); out.push({ type, id, n: +c }); }
    return out;
  },
  // 发放奖励：coins / gear / 以及任何 Inv.kind 注册过的种类（bait、item、treasure、mat、dish……）
  applyLoot(list) {
    for (const l of list) {
      if (l.type === 'coins') Game.addCoins(l.n);
      else if (l.type === 'gear') l.kept = l.g.u ? true : Hero.addGear(l.g, true);
      else Inv.give(l.type, l.id, l.n);
    }
    CF.emit('treasure:gain', { loot: true });
  },
  // 合并同类奖励，方便批量开箱时展示
  mergeLoot(list) {
    const out = [], idx = {};
    for (const l of list) {
      if (l.type === 'gear') { out.push(l); continue; }
      const k = l.type + ':' + (l.id || '');
      if (idx[k] !== undefined) out[idx[k]].n += l.n; else { idx[k] = out.length; out.push(Object.assign({}, l)); }
    }
    return out;
  },
  openChest(id, count) {
    const S = this.S;
    const n = Math.min(count || 1, S.treasure[id] || 0, S.treasure.key || 0);
    if (n <= 0) { Game.toast(S.treasure.key ? '没有这种宝箱' : '需要钥匙才能打开喵', 'warn'); return; }
    let all = [];
    for (let i = 0; i < n; i++) {
      S.treasure[id]--; S.treasure.key--;
      const list = this.rollLoot(FISH_BY_ID[id].tier);
      this.applyLoot(list); all = all.concat(list);
    }
    Game.emit('loot', { title: n > 1 ? `一口气打开了 ${n} 个${FISH_BY_ID[id].name}！` : `打开了${FISH_BY_ID[id].name}！`, list: this.mergeLoot(all) });
    Game.changed(); Game.save();
  },
  chestReady() { const T = this.S.treasure; return T.key > 0 && (T.chest_wood + T.chest_silver + T.chest_gold) > 0; },
};

Inv.kind('treasure', {
  have: id => Game.S.treasure[id] || 0,
  take: (id, n) => { Game.S.treasure[id] = (Game.S.treasure[id] || 0) - n; },
  give: (id, n) => { Game.S.treasure[id] = (Game.S.treasure[id] || 0) + n; },
  name: id => TREASURE_BY_ID[id].name,
});

UI.tab('adv', {
  id: 'treasure', label: '💰 宝藏',
  render() {
    const S = Game.S, T = S.treasure;
    const chests = ['chest_wood', 'chest_silver', 'chest_gold'].map(id => {
      const t = FISH_BY_ID[id], n = Math.min(T[id] || 0, T.key || 0);
      return `<div class="scard"><span class="gframe">${gi('chest', t.color, '34px')}</span><div class="bd"><div class="nm">${t.name} ×${T[id] || 0}</div><div class="ds">${t.desc}</div></div>
        <div class="act qty"><button class="btn sm primary" data-act="openchest" data-id="${id}" data-n="1" ${n ? '' : 'disabled'}>打开</button><button class="btn sm" data-act="openchest" data-id="${id}" data-n="10" ${n >= 2 ? '' : 'disabled'}>×10</button><button class="btn sm" data-act="openchest" data-id="${id}" data-n="9999" ${n >= 2 ? '' : 'disabled'}>全部</button></div></div>`;
    }).join('');
    const hasBoat = CF.has('voyage') && S.boat > 0;
    const h = `<div class="hint">钓鱼时偶尔会钓到钥匙、宝箱和藏宝图（幸运越高越容易）。越远的钓点，宝箱越好。可以一次批量打开。</div><div class="shop-list">
      <div class="scard"><span class="gframe">${gi('key', '#d9a441', '34px')}</span><div class="bd"><div class="nm">生锈的钥匙 ×${T.key || 0}</div><div class="ds">每把钥匙能打开一个宝箱。</div></div></div>
      ${chests}
      <div class="scard"><span class="gframe">${gi('map', '#e8d3a0', '34px')}</span><div class="bd"><div class="nm">藏宝图 ×${T.map || 0}</div><div class="ds">驾船去${Game.scene().name}附近寻宝（约 1.5 分钟，会遇到怪物），终点有宝藏。</div></div>
        <div class="act">${CF.has('voyage') ? `<button class="btn sm green" data-act="hunt" ${T.map > 0 && hasBoat && !CF.modes.busy() ? '' : 'disabled'}>${hasBoat ? '出发寻宝' : '需要船'}</button>` : ''}</div></div>
      <div class="scard"><span class="gframe">${gi('mapPiece', '#c9b48a', '34px')}</span><div class="bd"><div class="nm">海盗地图碎片 ${S.hiddenOpen && S.hiddenOpen.pirate ? '（已拼好）' : `${T.mapPiece || 0}/3`}</div><div class="ds">${S.hiddenOpen && S.hiddenOpen.pirate ? '地图指向了海盗湾。' : '海盗猫、骷髅水手和漂流瓶里偶尔能找到。'}</div></div></div>
    </div>`;
    return [h, ''];
  },
});
UI.loot('treasure', l => { const t = FISH_BY_ID[l.id]; return `<div class="loot"><span class="li">${gi(t.gi, t.color || '#d9a441', '28px')}</span><b>${t.name} ×${l.n}</b></div>`; });
UI.offline(30, r => r.treasures && r.treasures.length ? `<div style="margin-top:8px">钓到宝藏：${r.treasures.map(([k, n]) => `${FISH_BY_ID[k].name}×${n}`).join('、')}</div>` : '');
UI.actions({ openchest(ds) { Treasure.openChest(ds.id, +ds.n || 1); } });

CF.module({
  id: 'treasure',
  state: () => ({ treasure: { key: 0, chest_wood: 0, chest_silver: 0, chest_gold: 0, map: 0, mapPiece: 0 } }),
  offlinePriority: 1,
  init() {
    CF.hook('fish.treasure', (luck, scene) => Treasure.roll(luck, scene));
    CF.hook('fish.treasureCaught', (item, quiet) => Treasure.gain(item.id, quiet));
    CF.hook('nav.dot.adv', () => Treasure.chestReady());
  },
  // 离线前记下宝藏数量，结束后算出钓到了什么
  offline(ctx) {
    const t0 = Object.assign({}, Game.S.treasure);
    ctx.after.push(c => { const T = Game.S.treasure; c.report.treasures = Object.keys(T).filter(k => T[k] > (t0[k] || 0)).map(k => [k, T[k] - (t0[k] || 0)]); });
  },
});
