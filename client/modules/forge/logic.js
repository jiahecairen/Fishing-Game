// ===== 工匠 · 逻辑：强化、合成、配方、套装打造 =====
// 新的锻造配方：CF.content.define('recipe', 'r_xxx', { out: 'u_xxx', name, need: [['koi', 8]], coins, hint })
// 新的套装图纸：CF.content.define('setRecipe', 'sa_w', { mats: {...}, fish: [[id, n]], items: {...}, coins })
'use strict';

// 强化：+0 → +10，越往后越贵、越容易失败；+7 以上失败会掉 1 级
const ENH_RATE = [1, 1, 1, 0.9, 0.8, 0.7, 0.6, 0.5, 0.4, 0.3];
function enhCost(g) { return Math.round(gearValue(Object.assign({}, g, { e: 0 })) * 0.6 * Math.pow((g.e || 0) + 1, 1.7) / 10) * 10 + 100; }
function synthCost(g) { return Math.round(200 * g.tier * g.tier * (g.q + 1) / 10) * 10; }

const RECIPES = [];
CF.content.type('recipe', { list: RECIPES });
CF.content.define('recipe', 'r_koi', { out: 'u_koi', name: '七彩锦鲤剑', need: [['koi', 8], ['lakegod', 1]], coins: 50000, hint: '传说用八条锦鲤和湖神的祝福，可以打造出七彩的剑……' });

// 套装图纸 → 材料（图纸要从任务线拿）
const SET_RECIPES = {};
CF.content.type('setRecipe', { map: SET_RECIPES });
Object.entries({
  sa_h: { mats: { oldwood: 6, turtleshell: 4 }, fish: [['carp', 10]], coins: 15000 },
  sa_w: { mats: { oldwood: 10, pearl: 6 }, fish: [['blackcarp', 5]], items: { raincharm: 2 }, coins: 40000 },
  sa_a: { mats: { oldwood: 15, turtleshell: 10, piratecoin: 6 }, fish: [['mandarin', 4]], coins: 90000 },
  st_b: { mats: { pearl: 12, oldwood: 6 }, fish: [['seabream', 6]], coins: 40000 },
  st_h: { mats: { pearl: 15, icecore: 5 }, fish: [['marlin', 2]], coins: 80000 },
  st_a: { mats: { pearl: 20, whalebone: 12, icecore: 8 }, fish: [['acoel', 2]], coins: 200000 },
  ss_c: { mats: { stardust: 15 }, fish: [['charr', 6]], items: { luckbell: 5 }, coins: 60000 },
  ss_b: { mats: { stardust: 20, icecore: 10 }, fish: [['icepike', 4]], coins: 150000 },
  ss_w: { mats: { stardust: 30, whalebone: 15, icecore: 12 }, fish: [['acoel', 1]], coins: 300000 },
}).forEach(([k, v]) => CF.content.define('setRecipe', k, v));

const Forge = {
  get S() { return Game.S; },
  enhance(uid) {
    const g = this.S.gear.find(x => x.uid === uid); if (!g) return null;
    if (g.e >= 10) { Game.toast('已经强化到 +10 了', 'warn'); return null; }
    const cost = enhCost(g);
    if (!Game.pay(cost)) return null;
    const ok = Math.random() < ENH_RATE[g.e];
    let res;
    if (ok) { g.e++; res = { ok: true, msg: `强化成功！${gearName(g)}` }; }
    else if (g.e >= 7) { g.e--; res = { ok: false, msg: `强化失败……掉到了 +${g.e}` }; }
    else res = { ok: false, msg: '强化失败……金币打了水漂' };
    Game.toast(res.msg, res.ok ? 'good' : 'warn');
    Hero.clampHero(); Game.changed(); Game.save();
    return res;
  },
  // 3 件同等级、同品质的普通装备 → 1 件更高品质
  synthCheck(uids) {
    const items = uids.map(u => this.S.gear.find(g => g.uid === u)).filter(Boolean);
    if (items.length !== 3) return { why: '请选择 3 件装备' };
    if (items.some(g => g.u)) return { why: '隐藏装备和套装不能合成' };
    if (items.some(g => Hero.isEquipped(g.uid))) return { why: '不能使用正在穿着的装备' };
    const t = items[0].tier, q = items[0].q;
    if (items.some(g => g.tier !== t || g.q !== q)) return { why: '需要等级和品质都相同' };
    if (t === 5 && q === 4) return { why: '已经是最高等级的传说装备' };
    return { items, cost: synthCost(items[0]), out: q < 4 ? { tier: t, q: q + 1 } : { tier: t + 1, q: 1 } };
  },
  synth(uids, slot) {
    const c = this.synthCheck(uids); if (c.why) { Game.toast(c.why, 'warn'); return null; }
    if (!Game.pay(c.cost)) return null;
    const set = new Set(uids);
    this.S.gear = this.S.gear.filter(g => !set.has(g.uid));
    const g = { uid: Game.nextUid(), slot: slot || c.items[0].slot, tier: c.out.tier, q: c.out.q, e: 0 };
    this.S.gear.push(g);
    Game.toast(`合成成功：${gearName(g)}`, 'good');
    Game.changed(); Game.save();
    return g;
  },
  // 一键合成：把所有能凑成 3 件的同级同品质装备，从低到高依次合成
  autoSynth(maxQ) {
    const S = this.S, made = []; let spent = 0, guard = 0;
    while (guard++ < 200) {
      const groups = {};
      for (const g of S.gear) {
        if (g.u || Hero.isEquipped(g.uid) || g.q >= (maxQ === undefined ? 4 : maxQ)) continue;
        if (g.tier === 5 && g.q === 4) continue;
        (groups[g.tier + ':' + g.q] = groups[g.tier + ':' + g.q] || []).push(g);
      }
      const key = Object.keys(groups).filter(k => groups[k].length >= 3).sort((a, b) => { const [ta, qa] = a.split(':').map(Number), [tb, qb] = b.split(':').map(Number); return qa - qb || ta - tb; })[0];
      if (!key) break;
      const items = groups[key].sort((a, b) => a.e - b.e).slice(0, 3), c = this.synthCheck(items.map(g => g.uid));
      if (c.why || S.coins < c.cost) break;
      S.coins -= c.cost; spent += c.cost;
      const set = new Set(items.map(g => g.uid));
      S.gear = S.gear.filter(g => !set.has(g.uid));
      const ng = { uid: Game.nextUid(), slot: items[0].slot, tier: c.out.tier, q: c.out.q, e: 0 };
      S.gear.push(ng); made.push(ng);
    }
    const final = made.filter(g => S.gear.includes(g)); // 只展示最终还留着的成品
    if (made.length) Game.emit('loot', { title: `一键合成 ${made.length} 次（花费 🪙${fmtFull(spent)}）`, list: final.map(g => ({ type: 'gear', g, kept: true })) });
    else Game.toast('没有可以合成的装备（需要 3 件同等级同品质）', 'warn');
    Game.changed(); Game.save();
  },
  recipeHave(r) { return r.need.map(([id, n]) => [id, n, Inv.have('fish', id)]); },
  craft(rid) {
    const r = RECIPES.find(x => x.id === rid); if (!r) return;
    if (Hero.ownsUnique(r.out)) { Game.toast('已经拥有了', 'warn'); return; }
    if (this.recipeHave(r).some(([, n, h]) => h < n)) { Game.toast('材料不足', 'warn'); return; }
    if (!Game.pay(r.coins)) return;
    Inv.payNeed(r.need.map(([id, n]) => ['fish', id, n]));
    const g = Hero.giveUnique(r.out);
    if (g) Game.emit('loot', { title: '🔨 锻造成功！', list: [{ type: 'gear', g, kept: true }] });
    Game.save();
  },
  setNeed(key) {
    const R = SET_RECIPES[key], need = [];
    for (const [m, n] of Object.entries(R.mats || {})) need.push(['mat', m, n]);
    for (const [f, n] of R.fish || []) need.push(['fish', f, n]);
    for (const [it, n] of Object.entries(R.items || {})) need.push(['item', it, n]);
    need.push(['coins', '', R.coins]);
    return need;
  },
  craftSet(key) {
    const S = this.S;
    if (!S.setRecipes[key]) { Game.toast('还没有这张图纸', 'warn'); return; }
    if (Hero.ownsUnique(key)) { Game.toast('已经打造过了', 'warn'); return; }
    const need = this.setNeed(key);
    if (!Inv.canPay(need)) { Game.toast('材料不足', 'warn'); return; }
    Inv.payNeed(need);
    const g = Hero.giveUnique(key, true);
    Game.emit('loot', { title: '🔨 工匠打造成功！', list: [{ type: 'gear', g, kept: true }] });
    Game.save();
  },
};

CF.module({ id: 'forge', state: () => ({ setRecipes: {} }) });
