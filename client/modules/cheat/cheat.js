// ===== 测试用作弊面板（右上角 🧪 按钮） =====
// 只是测试工具：服务器的 config.json 里把 devCheats 设为 false，玩家就看不到这个按钮。
'use strict';

const Cheat = {
  tier: 5,
  visible() { const S = Game.S; return S.settings.cheatBtn && (!CF.serverInfo || CF.serverInfo.devCheats !== false); },
  act(a, ds) {
    const S = Game.S, n = +ds.n || 0;
    const done = msg => { Game.toast('🧪 ' + msg, 'good'); Hero.clampHero(); Game.changed(); Game.save(); };
    switch (a) {
      case 'c_coins': Game.addCoins(n); return done(`金币 +${fmtFull(n)}`);
      case 'c_level': for (let i = 0; i < n; i++) Game.gainExp(Game.expNeed(S.level) - S.exp); return done(`升到 Lv.${S.level}`);
      case 'c_pts': S.bonusAttr += n; S.bonusTal += n; return done(`属性点和天赋点各 +${n}`);
      case 'c_heal': S.hero.hp = Hero.stats().maxHp; return done('HP 回满');
      case 'c_treasure': S.treasure.key += 10; S.treasure.chest_wood += 5; S.treasure.chest_silver += 5; S.treasure.chest_gold += 5; S.treasure.map += 3; return done('钥匙 ×10、各种宝箱 ×5、藏宝图 ×3');
      case 'c_piece': Treasure.gain('mapPiece', true, 3); return done('海盗地图碎片 +3');
      case 'c_tier': this.tier = n; UI.render(true); return;
      case 'c_gear': for (let i = 0; i < 10; i++) Hero.addGear(Hero.newGear(this.tier, 3), true); return done(`获得 10 件 T${this.tier} 装备`);
      case 'c_gearset': for (const slot of SLOT_ORDER) Hero.addGear({ uid: S.uid++, slot, tier: this.tier, q: 4, e: 0 }, true); return done(`获得一整套 T${this.tier} 传说装备`);
      case 'c_uniques': Object.keys(UNIQUES).forEach(u => Hero.giveUnique(u, true)); return done('获得全部隐藏装备');
      case 'c_items': BAITS.forEach(b => { if (!b.infinite) S.baits[b.id] = (S.baits[b.id] || 0) + 100; }); ITEMS.forEach(it => { if (it.type === 'consumable') S.items[it.id] = (S.items[it.id] || 0) + 10; else S.perms[it.id] = true; }); return done('鱼饵各 +100，道具各 +10，永久道具全部获得');
      case 'c_rod': S.rods = RODS.map(r => r.id); S.rod = 'star'; S.lines = LINES.map(l => l.id); S.line = 'silk'; return done('获得全部鱼竿和鱼线');
      case 'c_unlock':
        S.unlockedScenes = SCENES.map(s => s.id); S.addr = ROUTES.map(r => r.to); S.boat = 3; S.boatHp = Voyage.maxHp(); S.hiddenOpen.pirate = true; S.hiddenOpen.dream = true;
        return done('解锁全部地点、地址、船和隐藏副本');
      case 'c_dex': FISH.forEach(f => { if (!S.dex[f.id]) S.dex[f.id] = { count: 1, max: f.max, first: Date.now() }; }); Lore.checkHidden(); return done('图鉴全部点亮');
      case 'c_fish': for (let i = 0; i < n; i++) { const pool = FISH.filter(f => f.scenes.includes(S.scene) && f.rarity !== 'junk'); const f = pool[Math.floor(Math.random() * pool.length)]; S.warehouse.push(Fishing.makeCatch(f)); } S.whCap = Math.max(S.whCap, S.warehouse.length); return done(`仓库 +${n} 条鱼`);
      case 'c_time': S.gameMinutes = Math.floor(S.gameMinutes / 1440) * 1440 + n * 60 + (S.gameMinutes % 1440 > n * 60 ? 1440 : 0); return done(`时间调到 ${String(n).padStart(2, '0')}:00`);
      case 'c_weather': Game.setWeather(ds.w); return done('天气：' + WEATHERS[ds.w].name);
      case 'c_event': if (Events.cur) Events.clear(); if (!Events.trigger(ds.w, false, ds.id)) Game.toast('现在无法触发这个事件', 'warn'); UI.close(); return;
      case 'c_voyageEnd': if (S.voyage) { S.voyage.t = S.voyage.dur - 0.5; Battle.cancel(); S.voyage.inBattle = false; Events.clear(); } UI.close(); return;
      case 'c_boss': if (S.dungeon) { const d = Dungeon.def(); S.dungeon.floor = d.floors; S.dungeon.room = ROOMS_PER_FLOOR; S.dungeon.phase = 'walk'; S.dungeon.t = DUNGEON_WALK - 0.2; Battle.cancel(); Events.clear(); } UI.close(); return;
      case 'c_god': S.cheat.god = !S.cheat.god; return done('无敌模式：' + (S.cheat.god ? '开' : '关'));
      case 'c_onehit': S.cheat.oneHit = !S.cheat.oneHit; return done('秒杀模式：' + (S.cheat.oneHit ? '开' : '关'));
      case 'c_spare': S.story.ending = 'spare'; Lore.checkHidden(); return done('结局设为「饶恕」');
      case 'c_story': S.story.seen = { _starter: true }; return done('剧情记录已清空（会重新播放）');
      case 'c_pao': S.flags.paoFed = 6; return done('泡泡已经被喂了 6 次，再喂一次试试');
      case 'c_mats': Object.keys(MATERIALS).forEach(m => { S.mats[m] = (S.mats[m] || 0) + 30; }); return done('所有素材 +30');
      case 'c_dishes': Object.keys(DISHES).forEach(d => { S.dishes[d] = (S.dishes[d] || 0) + 5; Cook.learn(d); }); return done('学会全部料理，每种 +5 份');
      case 'c_cooknow': Cook.K.queue.forEach(q => { q.end = Date.now(); }); Cook.tick(); return done('灶台上的料理全部完成');
      case 'c_clues': QUESTS.forEach(q => Quests.giveClue(q.id)); return done('获得全部任务线索');
      case 'c_recipes': Object.keys(SET_RECIPES).forEach(k => { S.setRecipes[k] = true; }); return done('获得全部套装图纸');
      case 'c_qnext': for (const qid of Object.keys(S.quests.active)) Quests.advance(qid); return done('每条进行中的任务线前进一步');
      case 'c_market': S.market.open = true; S.market.tier = 4; S.market.monthSales = 600000; return done('寄卖行开通，并升到钻石会员');
      case 'c_day': S.gameMinutes += 1440 * n; if (typeof Market !== 'undefined') Market.monthCheck(); return done(`时间前进 ${n} 天 → ${Game.dateStr()}`);
      case 'c_season': { const t = Game.date(); const target = +ds.n; const mi = Math.floor(t.d / MONTH_DAYS); const yearStart = mi - (mi % 12); S.gameMinutes = (yearStart + target * 3) * MONTH_DAYS * 1440 + 8 * 60; if (S.gameMinutes < t.d * 1440) S.gameMinutes += 12 * MONTH_DAYS * 1440; S.weatherUntil = 0; if (typeof Market !== 'undefined') Market.monthCheck(true); return done('季节切换为 ' + SEASONS[target].name); }
      case 'c_sellall': Market.process(999); return done('所有挂单立刻成交');
      case 'c_repair': S.boatHp = Voyage.maxHp(); return done('船修好了');
      case 'c_reqs': REQUESTS.forEach(r => { if (!S.reqDone[r.id]) for (const [k, id, nn] of r.need) { if (k === 'fish') for (let i = 0; i < nn; i++) S.warehouse.push(Fishing.makeCatch(FISH_BY_ID[id])); else if (k === 'coins') S.coins += nn; else ({ item: S.items, bait: S.baits, mat: S.mats, treasure: S.treasure, dish: S.dishes })[k][id] = (({ item: S.items, bait: S.baits, mat: S.mats, treasure: S.treasure, dish: S.dishes })[k][id] || 0) + nn; } }); S.whCap = Math.max(S.whCap, S.warehouse.length + 20); return done('补齐所有委托需要的东西');
    }
  },
};

CF.panel('cheat', {
  title: '🧪 作弊面板',
  render() {
  const S = Game.S;
  const btn = (act, label, extra) => `<button class="btn sm" data-act="${act}" ${extra || ''}>${label}</button>`;
  const fishEvents = EVENT_DEFS.filter(e => e.where === 'fish').map(e => btn('c_event', e.title, `data-w="fish" data-id="${e.id}"`)).join('');
  const voyEvents = EVENT_DEFS.filter(e => e.where === 'voyage').map(e => btn('c_event', e.title, `data-w="voyage" data-id="${e.id}" ${CF.modes.is('voyage') ? '' : 'disabled'}`)).join('');
  const dunEvents = EVENT_DEFS.filter(e => e.where === 'dungeon').map(e => btn('c_event', e.title, `data-w="dungeon" data-id="${e.id}" ${CF.modes.is('dungeon') ? '' : 'disabled'}`)).join('');
  const h = `<div class="hint">🧪 测试用作弊面板。可以在「设置」里关掉右上角的按钮。</div>
    <div class="cheat">
      <div class="cg"><b>资源</b>${btn('c_coins', '+10 万金币', 'data-n="100000"')}${btn('c_coins', '+100 万金币', 'data-n="1000000"')}${btn('c_items', '鱼饵/道具全满')}${btn('c_rod', '全部鱼竿鱼线')}${btn('c_fish', '仓库 +50 条鱼', 'data-n="50"')}</div>
      <div class="cg"><b>成长</b>${btn('c_level', '升 1 级', 'data-n="1"')}${btn('c_level', '升 10 级', 'data-n="10"')}${btn('c_pts', '属性点/天赋点 +10', 'data-n="10"')}${btn('c_heal', 'HP 回满')}</div>
      <div class="cg"><b>装备</b>${[1, 2, 3, 4, 5].map(t => `<button class="chip ${Cheat.tier === t ? 'on' : ''}" data-act="c_tier" data-n="${t}">T${t}</button>`).join('')}${btn('c_gear', '随机装备 ×10')}${btn('c_gearset', '传说套装')}${btn('c_uniques', '全部隐藏装备')}</div>
      <div class="cg"><b>宝藏</b>${btn('c_treasure', '钥匙/宝箱/藏宝图')}${btn('c_piece', '海盗地图碎片 ×3')}</div>
      <div class="cg"><b>进度</b>${btn('c_unlock', '解锁全部地点/船/隐藏副本')}${btn('c_dex', '点亮全部图鉴')}${btn('c_spare', '设为饶恕结局')}${btn('c_pao', '泡泡差一次喂食')}${btn('c_story', '清空剧情记录')}</div>
      <div class="cg"><b>时间</b>${[[6, '清晨'], [12, '中午'], [18, '黄昏'], [23, '深夜']].map(([h2, n]) => btn('c_time', n, `data-n="${h2}"`)).join('')}</div>
      <div class="cg"><b>天气</b>${Object.entries(WEATHERS).map(([k, w]) => btn('c_weather', w.icon + w.name, `data-w="${k}"`)).join('')}</div>
      <div class="cg"><b>战斗</b>${btn('c_god', (S.cheat.god ? '✅ ' : '') + '无敌')}${btn('c_onehit', (S.cheat.oneHit ? '✅ ' : '') + '秒杀')}${btn('c_voyageEnd', '航行立刻到达', CF.modes.is('voyage') ? '' : 'disabled')}${btn('c_boss', '副本直达 Boss', CF.modes.is('dungeon') ? '' : 'disabled')}</div>
      <div class="cg"><b>v0.4</b>${btn('c_mats', '素材 +30')}${btn('c_dishes', '全部料理 ×5')}${btn('c_cooknow', '烹饪立刻完成')}${btn('c_clues', '全部任务线索')}${btn('c_qnext', '任务推进一步')}${btn('c_recipes', '全部套装图纸')}${btn('c_reqs', '补齐委托材料')}</div>
      <div class="cg"><b>经济</b>${typeof Market !== 'undefined' ? btn('c_market', '寄卖行钻石会员') + btn('c_sellall', '挂单立刻成交') : ''}${btn('c_day', '+1 天', 'data-n="1"')}${btn('c_day', '+10 天（1 个月）', 'data-n="10"')}${btn('c_repair', '修好船')}</div>
      <div class="cg"><b>季节</b>${SEASONS.map((x, i) => btn('c_season', x.icon + x.name, `data-n="${i}"`)).join('')}</div>
      <div class="cg"><b>钓鱼事件</b>${fishEvents}</div>
      <div class="cg"><b>航行事件</b>${voyEvents}</div>
      <div class="cg"><b>副本事件</b>${dunEvents}</div>
    </div>`;
  return [h, ''];
  },
});

CF.module({
  id: 'cheat',
  state: () => ({ cheat: { god: false, oneHit: false } }),
  shared: { settings: { cheatBtn: true } },
  init() {
    const b = document.createElement('button');
    b.id = 'cheat-btn'; b.title = '测试作弊面板'; b.innerHTML = gi('flask', '#b2ff59', '22px');
    b.addEventListener('click', () => UI.open('cheat'));
    document.body.appendChild(b);
    // 无敌 / 秒杀
    CF.hook('battle.heroDamage', d => Game.S.cheat.god ? 0 : d);
    CF.hook('battle.foeDamage', (d, B) => Game.S.cheat.oneHit ? B.foe.hp : d);
    // 所有 c_ 开头的按钮都交给 Cheat.act
    const names = (Cheat.act.toString().match(/case '(c_\w+)'/g) || []).map(x => x.slice(6, -1));
    for (const n of names) UI.action(n, ds => Cheat.act(n, ds));
    UI.setting(90, S => (!CF.serverInfo || CF.serverInfo.devCheats !== false) ? `<div class="set-row"><div>测试作弊面板<small>在右上角显示 🧪 按钮，用来测试各种内容</small></div><label class="switch"><input type="checkbox" data-act="setting" data-key="cheatBtn" ${S.settings.cheatBtn ? 'checked' : ''}><span class="slider"></span></label></div>` : '');
  },
  frame() { UI.set('cheat-btn', !Cheat.visible(), 'hide'); },
});
