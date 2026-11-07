// ===== 航海 · 逻辑：船、船坞、航线、摆渡、寻宝 =====
// 航海是一个「模式」（CF.modes.define('voyage', ...)）：出发 = 进入模式，到岸 = 离开模式。
// S.voyage.kind：route 去新地方 / ferry 去过的地方短途往返 / hunt 按藏宝图寻宝
'use strict';

const Voyage = {
  get S() { return Game.S; },
  place(id) { return PLACES[id] || { name: Game.sceneDef(id).name, icon: '📍' }; },
  routeTo(to) { return ROUTES.find(r => r.to === to); },
  claimAddress(to) {
    const r = this.routeTo(to);
    if (!r || this.S.addr.includes(to) || !Dex.complete(r.from)) return;
    this.S.addr.push(to);
    Story.run('addr_' + to);
    Game.toast(`获得了「${this.place(to).name}」的地址！`, 'good');
    Game.changed(); Game.save();
  },
  // ---------- 船与船坞 ----------
  buyBoat(tier) {
    if (this.S.boat >= tier || this.S.boat < tier - 1) return;
    if (!Game.pay(BOATS[tier].price)) return;
    this.S.boat = tier;
    this.S.boatHp = this.maxHp(); // 新船满耐久
    Game.toast(`获得了${BOATS[tier].name}！`, 'good');
    if (tier === 1) Story.run('boat');
    Game.changed(); Game.save();
  },
  upgrade(k) {
    const u = BOAT_UPS[k], lv = this.S.boatUps[k];
    if (this.S.boat < 1) { Game.toast('先买一条船吧', 'warn'); return; }
    if (lv >= u.max) return;
    if (!Game.pay(u.cost(lv))) return;
    this.S.boatUps[k]++;
    if (k === 'hull') this.S.boatHp += 40;
    Game.toast(`${u.name}完成：${u.desc(lv + 1)}`, 'good'); Game.changed(); Game.save();
  },
  speed() { return (BOATS[this.S.boat].speed || 1) * (1 + 0.12 * this.S.boatUps.sail) * (this.S.boatHp <= 0 ? 0.4 : 1); },
  provisions(r) { return r.fish; },
  holdCap() { const S = this.S; return S.boat ? (BOATS[S.boat].holdBase || 10) + 10 * S.boatUps.hold : 0; },
  maxHp() { const S = this.S; return S.boat ? (BOATS[S.boat].hp || 100) + 40 * S.boatUps.hull : 0; },
  wearCost(r) { return Math.ceil(r.dur / 10); },
  repairCost() { return Math.max(0, Math.ceil((this.maxHp() - this.S.boatHp) * REPAIR_PER_HP * this.S.boat)); },
  repair() {
    const c = this.repairCost(); if (!c) return;
    if (!Game.pay(c)) return;
    this.S.boatHp = this.maxHp(); Game.toast('🔧 船坞把船修好了', 'good'); Game.changed(); Game.save();
  },
  damageBoat(n) { const S = this.S; S.boatHp = Math.max(0, S.boatHp - n); if (S.boatHp <= 0 && CF.modes.is('voyage')) Game.toast('船漏水了！航速大幅下降……', 'warn'); },
  fishTotal() { return this.S.bag.length + this.S.warehouse.length + this.S.hold.length; },
  // 补给从本地仓库、船舱、背包里挑最便宜的鱼
  takeProvisions(n) {
    const S = this.S;
    const all = [...S.warehouse, ...S.hold, ...S.bag].filter(x => !FISH_BY_ID[x.id].treasure).sort((a, b) => a.value - b.value);
    const set = new Set(all.slice(0, n).map(x => x.uid));
    S.warehouse = S.warehouse.filter(x => !set.has(x.uid)); S.bag = S.bag.filter(x => !set.has(x.uid)); S.hold = S.hold.filter(x => !set.has(x.uid));
  },
  // ---------- 出发 ----------
  canFerry(to) {
    const S = this.S;
    if (CF.modes.busy()) return '正在冒险中';
    if (!Game.reached(to) || S.scene === to) return '无法前往';
    if (S.boat < 1) return '需要一条船';
    if (S.boatHp < 5) return '船的耐久太低了，先去船坞修理';
    return null;
  },
  startFerry(to, mode) {
    const why = this.canFerry(to); if (why) { Game.toast(why, 'warn'); return; }
    const S = this.S;
    S.voyage = { kind: 'ferry', from: S.scene, to, t: 0, dur: FERRY_TIME, nextEnc: rand(20, 40), encLeft: Math.random() < 0.4 ? 1 : 0, lv: Game.sceneDef(to).monLv, mons: HUNT_MONS[to], region: to, wear: 4, worn: 0, mode };
    CF.modes.enter('voyage', `⛵ 出发前往 ${this.place(to).name}（短途航行）`);
  },
  canSail(r) {
    const S = this.S;
    if (CF.modes.busy()) return '正在冒险中';
    if (!S.addr.includes(r.to)) return '还没有地址';
    if (S.boat < r.boat) return `需要${BOATS[r.boat].name}`;
    if (S.scene !== r.from) return `需要从${this.place(r.from).name}出发`;
    if (S.boatHp < this.wearCost(r)) return `船的耐久不足（需要 ${this.wearCost(r)}），先去船坞修理`;
    if (this.fishTotal() < this.provisions(r)) return `补给不足（需要 ${this.provisions(r)} 条鱼）`;
    return null;
  },
  startVoyage(to, mode) {
    const r = this.routeTo(to), why = this.canSail(r);
    if (why) { Game.toast(why, 'warn'); return; }
    this.takeProvisions(this.provisions(r));
    this.S.voyage = { kind: 'route', from: r.from, to, t: 0, dur: r.dur, nextEnc: rand(25, 45), lv: r.lv, mons: r.mons, region: r.from, wear: this.wearCost(r), worn: 0, mode };
    CF.modes.enter('voyage', `⛵ 起航！目标：${this.place(to).name}`);
  },
  startHunt(mode) {
    const S = this.S;
    if (CF.modes.busy()) return;
    if (S.boat < 1) { Game.toast('需要先有一条船', 'warn'); return; }
    if (!(S.treasure.map > 0)) return;
    S.treasure.map--;
    const region = S.scene;
    S.voyage = { kind: 'hunt', from: region, to: region, t: 0, dur: 90, nextEnc: 30, encLeft: 2, lv: Game.scene().monLv, mons: HUNT_MONS[region] || ['frog', 'gull'], region, wear: 6, worn: 0, mode };
    CF.modes.enter('voyage', '🗺️ 按照藏宝图出发寻宝！');
  },
  arrive(offline) {
    const S = this.S, v = S.voyage;
    CF.modes.leave();
    if (v.worn < v.wear) this.damageBoat(v.wear - v.worn);
    if (v.kind === 'hunt') {
      const list = Treasure.rollLoot(3); list.push({ type: 'treasure', id: 'key', n: 1 });
      Treasure.applyLoot(list);
      Game.emit('loot', { title: '🗺️ 找到了藏宝图上的宝藏！', list, offline });
    } else if (v.kind === 'ferry') {
      Game.switchScene(v.to);
      Game.toast(`⚓ 到达了 ${this.place(v.to).name}`, 'good');
    } else {
      Game.unlockPlace(v.to);
      Game.switchScene(v.to);
      Game.toast(`⚓ 抵达了 ${this.place(v.to).name}！`, 'good');
      Story.run('arrive_' + v.to);
    }
    CF.emit('voyage:arrive', v);
    Game.changed(); Game.save();
  },
  retreat() {
    const v = this.S.voyage;
    Game.toast(v && v.kind === 'hunt' ? '放弃了寻宝' : '返航了……补给已经吃掉了', 'warn');
    CF.modes.leave(); Game.changed(); Game.save();
  },
  // ---------- 每帧（暂停时内核不会调用） ----------
  tick(dt, offline) {
    const S = this.S, v = S.voyage;
    if (!v) { CF.modes.leave(); return; }
    Hero.regen(dt, 0.002);
    if (v.inBattle || v.inEvent) return;
    v.t += dt * this.speed() * (v.boost && v.boost > v.t ? 1.3 : 1);
    const due = Math.floor(v.wear * Math.min(1, v.t / v.dur));
    if (due > v.worn) { this.damageBoat(due - v.worn); v.worn = due; }
    if (v.t >= v.dur) return this.arrive(offline);
    const encOk = v.kind !== 'route' ? v.encLeft > 0 : true;
    if (encOk && v.t >= v.nextEnc) {
      if (v.kind !== 'route') { v.encLeft--; v.nextEnc += 30; } else v.nextEnc = v.t + rand(40, 70);
      if (v.kind === 'route' && Math.random() < 0.4 && Events.trigger('voyage', offline)) { if (S.voyage) S.voyage.inEvent = !offline && !!Events.blocking(); return; }
      v.inBattle = true;
      const lv = Math.round(rand(v.lv[0], v.lv[1]));
      Battle.fight(v.mons[Math.floor(Math.random() * v.mons.length)], lv, { where: 'voyage', tier: Game.progressTier() }, offline);
    }
  },
};

CF.module({
  id: 'voyage',
  state: () => ({ boat: 0, boatUps: { sail: 0, hold: 0, hull: 0 }, addr: [], voyage: null }),
  migrate(S) {
    for (const sc of S.unlockedScenes) if (sc !== 'lake' && !S.addr.includes(sc)) S.addr.push(sc);
    if (S.mode === 'voyage' && !S.voyage) S.mode = 'fish';
    if (S.voyage) { S.voyage.inBattle = false; S.voyage.inEvent = false; }
    if (S.boatHp === undefined) S.boatHp = Voyage.maxHp();
  },
  init() {
    CF.hook('inv.holdCap', () => Voyage.holdCap());
    // 航海中受伤：船体加固减伤
    CF.hook('events.hurtFactor', k => CF.modes.is('voyage') ? k * (1 - 0.15 * Game.S.boatUps.hull) : k);
    CF.on('event:resolved', () => { if (Game.S.voyage) Game.S.voyage.inEvent = false; });
    CF.modes.define('voyage', {
      name: '航海',
      offlineText: '船还在海上航行……',
      enter() { Fishing.resetFsm(); },
      exit() { Game.S.voyage = null; },
      tick: dt => Voyage.tick(dt, false),
      render: dt => Renderer.frameOutdoor(dt, { far: VoyageRender.far, fore: VoyageRender.boat, water: 'sea' }),
      bar: () => VoyageUI.bar(),
      retreat: () => Voyage.retreat(),
      // 海上事件里的战斗
      fight(mon, lvAdd, onWin, offline) {
        const v = Game.S.voyage; if (!v) return;
        v.inBattle = true;
        Battle.fight(mon, v.lv[1] + lvAdd, { where: 'voyage', tier: Game.progressTier(), onWin }, offline);
      },
      offline(ctx) { Adventure.offline(ctx, (dt, off) => Voyage.tick(dt, off)); },
    });
    Battle.context('voyage', {
      mode: () => Game.S.voyage && Game.S.voyage.mode,
      theme: () => ({ kind: 'sea', scene: 'sea' }),
      win(B) { const v = Game.S.voyage; if (!v) return; v.inBattle = false; v.worn += 2; Voyage.damageBoat(2); },
      lose(B) {
        const v = Game.S.voyage;
        Game.toast(v && v.kind === 'hunt' ? '寻宝失败了……' : `航行失败，被冲回了${Voyage.place(v ? v.from : Game.S.scene).name}`, 'warn');
        CF.modes.leave(); Game.save();
      },
    });
  },
});
