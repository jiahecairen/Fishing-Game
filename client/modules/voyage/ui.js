// ===== 航海 · 界面：航海图、船坞、航行状态条 =====
'use strict';

const VoyageUI = {
  bar() {
    const S = Game.S, v = S.voyage; if (!v) return '';
    const p = clamp(v.t / v.dur, 0, 1), left = Math.max(0, (v.dur - v.t) / Voyage.speed());
    const title = v.kind === 'hunt' ? '🗺️ 按藏宝图寻宝中' : `${BOATS[S.boat].name} · 航行前往 ${Voyage.place(v.to).name}`;
    return `<div class="ab-title">${gi(BOATS[S.boat].gi, '#8fd3ff', '20px')} ${title} <span class="path">🔧 ${Math.round(S.boatHp)}/${Voyage.maxHp()}</span></div>
      <div class="ab-prog"><div style="width:${(p * 100).toFixed(1)}%"></div><span class="ship" style="left:${(p * 100).toFixed(1)}%">${gi(BOATS[S.boat].gi, '#fff', '22px')}</span></div>
      <div class="ab-sub">${Battle.battle ? '⚔️ 遭遇战斗！' : Events.blocking() ? '❗ 海上发生了什么……' : `剩余 ${dur(left * 1000)} · 海上会遇到怪物和突发事件（Lv.${v.lv[0]}–${v.lv[1]}）`}</div>`
      + Adventure.barRow(v.kind === 'hunt' ? '放弃寻宝' : '返航');
  },
  sailTab() {
    const S = Game.S;
    let h = '<div class="hint">🦦 獭爷爷：把一个钓点的图鉴集齐（传说鱼和季节鱼除外），就能换到下一个地方的地址。还需要合适的船，以及足够的鱼当补给。</div><div class="route">';
    PLACE_ORDER.forEach((pl, i) => {
      const P = Voyage.place(pl), r = Voyage.routeTo(pl), reached = Game.reached(pl);
      let body = '', act = '';
      if (reached) {
        body = '<span class="owned">✓ 已到达</span>';
        act = S.scene === pl ? '<span class="owned">📍 当前所在</span>' : `<button class="btn sm green" data-act="goto" data-id="${pl}" ${!CF.modes.busy() && S.boat ? '' : 'disabled'}>⛵ 前往</button>`;
      } else if (!r) {
        body = '？？？';
      } else if (!S.addr.includes(pl)) {
        const need = Dex.need(r.from).length, got = Dex.done(r.from);
        body = `需要集齐「${Voyage.place(r.from).name}」图鉴：<b>${got}/${need}</b>`;
        act = `<button class="btn sm primary" data-act="addr" data-id="${pl}" ${got >= need && Game.reached(r.from) ? '' : 'disabled'}>兑换地址</button>`;
      } else {
        const prov = Voyage.provisions(r), okBoat = S.boat >= r.boat, okFish = Voyage.fishTotal() >= prov;
        body = `<span class="${okBoat ? 'ok' : 'bad'}">${okBoat ? '✓' : '✗'} ${BOATS[r.boat].name}</span><span class="${okFish ? 'ok' : 'bad'}">${okFish ? '✓' : '✗'} 补给 ${Voyage.fishTotal()}/${prov} 条鱼</span>
          <span class="${S.scene === r.from ? 'ok' : 'bad'}">${S.scene === r.from ? '✓' : '✗'} 从${Voyage.place(r.from).name}出发</span><span class="${S.boatHp >= Voyage.wearCost(r) ? 'ok' : 'bad'}">🔧 耐久 -${Voyage.wearCost(r)}</span>
          <span>⏱️ 约 ${Math.round(r.dur / 60 / (S.boat ? Voyage.speed() : 1))} 分钟</span><span>👾 Lv.${r.lv[0]}–${r.lv[1]}</span>`;
        act = `<button class="btn sm primary" data-act="sail" data-id="${pl}" ${Voyage.canSail(r) ? 'disabled' : ''}>⛵ 起航</button>`;
      }
      const known = reached || S.addr.includes(pl);
      h += `<div class="place ${reached ? 'reached' : ''}"><div class="pi">${known ? P.icon : '❔'}</div><div class="bd"><div class="nm">${known ? P.name : '？？？'}</div><div class="req">${body}</div></div><div class="act">${act}</div></div>`;
      if (i < PLACE_ORDER.length - 1) h += '<div class="link">┊</div>';
    });
    return [h + '</div>', '<span class="info">补给从本地仓库、船舱、背包里挑最便宜的鱼。去过的地方可以短途航行往返。每个地点的仓库是分开的——要运东西就装上船舱。</span>'];
  },
  dockTab() {
    const S = Game.S, mhp = Voyage.maxHp(), rc = Voyage.repairCost();
    let h = S.boat ? `<div class="dock-hp"><b>${BOATS[S.boat].name}</b> 耐久 ${Math.round(S.boatHp)}/${mhp}<div class="pbar"><div style="width:${mhp ? S.boatHp / mhp * 100 : 0}%"></div></div><span>船舱 ${S.hold.length}/${Voyage.holdCap()}</span><button class="btn sm primary" data-act="repair" ${rc && S.coins >= rc && !CF.modes.busy() ? '' : 'disabled'}>🔧 修理（🪙${fmtFull(rc)}）</button></div>` : '';
    h += '<div class="section-title">船</div><div class="shop-list">';
    for (const b of BOATS.slice(1)) {
      const own = S.boat >= b.tier, canBuy = S.boat === b.tier - 1;
      h += `<div class="scard"><span class="gframe">${gi(b.gi, '#5d8fb8', '34px')}</span><div class="bd"><div class="nm">${b.name}</div><div class="ds">${b.desc}</div><div class="st">基础航速 ×${b.speed} · 耐久 ${b.hp} · 船舱 ${b.holdBase} 格</div></div>
        <div class="act">${own ? '<span class="owned">已拥有</span>' : `<span class="price">🪙 ${fmtFull(b.price)}</span><button class="btn sm primary" data-act="boat" data-tier="${b.tier}" ${canBuy && S.coins >= b.price ? '' : 'disabled'}>${canBuy ? '购买' : '需先有上一级船'}</button>`}</div></div>`;
    }
    h += '</div><div class="section-title" style="margin-top:14px">船只改造</div><div class="shop-list">';
    for (const [k, u] of Object.entries(BOAT_UPS)) {
      const lv = S.boatUps[k], max = lv >= u.max;
      h += `<div class="scard"><span class="gframe">${gi(u.gi, '#8a6d3b', '34px')}</span><div class="bd"><div class="nm">${u.name} Lv.${lv}/${u.max}</div><div class="ds">${lv ? '当前：' + u.desc(lv) : '尚未改造'}${max ? '' : ` → ${u.desc(lv + 1)}`}</div></div>
        <div class="act">${max ? '<span class="owned">已满级</span>' : `<span class="price">🪙 ${fmtFull(u.cost(lv))}</span><button class="btn sm primary" data-act="boatup" data-id="${k}" ${S.boat && S.coins >= u.cost(lv) ? '' : 'disabled'}>改造</button>`}</div></div>`;
    }
    return [h + '</div>', `<span class="info">💰 持有 ${fmtFull(S.coins)} 金币</span>`];
  },
};

CF.panel('map', {
  title: '🧭 航海图',
  tabs: [['sail', '🧭 航海'], ['dock', '⚓ 船坞']],
  render(p) {
    if (!Story.seen('captain')) setTimeout(() => Story.run('captain'), 50);
    return p.tab === 'dock' ? VoyageUI.dockTab() : VoyageUI.sailTab();
  },
});
UI.nav({ id: 'map', label: '航海', icon: 'compass', order: 100, key: 'm',
  dot: S => ROUTES.some(r => !S.addr.includes(r.to) && Game.reached(r.from) && Dex.complete(r.from)) });

// 目标提示：一步步引导玩家去下一个地方
UI.goal(10, S => {
  for (const r of ROUTES) {
    if (Game.reached(r.to) || !Game.reached(r.from)) continue;
    const P = Voyage.place(r.to).name;
    if (!S.addr.includes(r.to)) {
      if (!Dex.complete(r.from)) return [`📖 集齐「${Voyage.place(r.from).name}」图鉴（传说/季节鱼除外）${Dex.done(r.from)}/${Dex.need(r.from).length}`, 'dex', r.from];
      return [`🦦 打开航海图，兑换「${P}」的地址`, 'map'];
    }
    if (S.boat < r.boat) return [`⚓ 在船坞买一艘${BOATS[r.boat].name}（🪙${fmtFull(BOATS[r.boat].price)}）`, 'map', 'dock'];
    if (S.scene !== r.from) return [`⛵ 回到「${Voyage.place(r.from).name}」才能出发去「${P}」`, 'map'];
    if (S.boatHp < Voyage.wearCost(r)) return ['🔧 船的耐久不够了，去船坞修理', 'map', 'dock'];
    if (Voyage.fishTotal() < Voyage.provisions(r)) return [`🐟 攒够 ${Voyage.provisions(r)} 条鱼作为补给 ${Voyage.fishTotal()}/${Voyage.provisions(r)}`, 'wh'];
    return [`⛵ 一切就绪！起航前往「${P}」`, 'map'];
  }
  return null;
});

UI.actions({
  addr(ds) { Voyage.claimAddress(ds.id); },
  sail(ds) {
    const r = Voyage.routeTo(ds.id), why = Voyage.canSail(r);
    if (why) { Game.toast(why, 'warn'); return; }
    BattleUI.choose(`起航前往「${Voyage.place(ds.id).name}」`, m => Voyage.startVoyage(ds.id, m));
  },
  goto(ds) {
    const why = Voyage.canFerry(ds.id); if (why) { Game.toast(why, 'warn'); return; }
    BattleUI.choose(`短途航行前往「${Voyage.place(ds.id).name}」（约 1 分钟，可能遇到怪物，消耗 4 点船只耐久）`, m => Voyage.startFerry(ds.id, m));
  },
  hunt() { BattleUI.choose('按照藏宝图出发寻宝', m => Voyage.startHunt(m)); },
  boat(ds) { Voyage.buyBoat(+ds.tier); },
  boatup(ds) { Voyage.upgrade(ds.id); },
  repair() { Voyage.repair(); },
});
