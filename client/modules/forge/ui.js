// ===== 工匠 · 界面 =====
// 「扩建」页可以被别的模块扩展：CF.hook('artisan.build', () => '<div class="scard">…</div>')
'use strict';

const ForgeUI = { mode: 'enh', sel: null, synthSel: [], synthSlot: null };

function forgeTab() {
  const S = Game.S, A = ForgeUI, mode = A.mode;
  const tabs = [['enh', '🔨 强化'], ['syn', '⚗️ 合成'], ['rec', '📜 配方']].map(([v, n]) => `<button class="chip ${mode === v ? 'on' : ''}" data-act="forge" data-v="${v}">${n}</button>`).join('');
  let h = `<div class="chips">${tabs}</div>`;
  if (mode === 'rec') {
    h += '<div class="shop-list">' + RECIPES.map(r => {
      const U = UNIQUES[r.out], known = r.need.some(([id]) => S.dex[id]), have = Forge.recipeHave(r), owned = Hero.ownsUnique(r.out);
      const ok = have.every(([, n, h2]) => h2 >= n);
      return `<div class="scard"><span class="gframe" style="--qc:${UNIQUE_COLOR}">${gi(r.out, known ? UNIQUE_COLOR : '#bbb', '34px')}</span><div class="bd"><div class="nm" style="color:${UNIQUE_COLOR}">${known ? U.name : '？？？'}</div>
        <div class="ds">${known ? `${statText(U.stats)} · ✦ ${U.edesc}` : r.hint}</div>
        ${known ? `<div class="st">${have.map(([id, n, h2]) => `<span class="${h2 >= n ? 'ok' : 'bad'}">${FISH_BY_ID[id].name} ${h2}/${n}</span>`).join(' · ')} · 🪙${fmtFull(r.coins)}</div>` : ''}</div>
        <div class="act">${owned ? '<span class="owned">已拥有</span>' : `<button class="btn sm primary" data-act="craft" data-id="${r.id}" ${known && ok && S.coins >= r.coins ? '' : 'disabled'}>锻造</button>`}</div></div>`;
    }).join('') + '</div><div class="hint" style="margin-top:12px">配方的材料是鱼（会从仓库和背包里扣除）。还有更多隐藏装备藏在副本、事件和剧情里……</div>';
    return [h, ''];
  }
  const list = S.gear.slice().sort((a, b) => (Hero.isEquipped(b.uid) ? 1 : 0) - (Hero.isEquipped(a.uid) ? 1 : 0) || b.tier - a.tier || b.q - a.q);
  const pick = mode === 'enh' ? [A.sel] : A.synthSel;
  const left = '<div class="flist">' + list.map(g => `<div class="frow ${pick.includes(g.uid) ? 'sel' : ''} ${mode === 'syn' && (g.u || Hero.isEquipped(g.uid)) ? 'dis' : ''}" data-act="fsel" data-uid="${g.uid}" data-tip="${g.uid}">${gearIconHTML(g, '24px')}<span style="color:${gearColor(g)}">${gearName(g)}</span>${Hero.isEquipped(g.uid) ? '<i>装备中</i>' : ''}</div>`).join('') + '</div>';
  let right = '';
  if (mode === 'enh') {
    const g = S.gear.find(x => x.uid === A.sel);
    if (!g) right = '<div class="empty">← 选择一件装备来强化</div>';
    else {
      const next = Object.assign({}, g, { e: Math.min(10, g.e + 1) }), cost = enhCost(g), rate = g.e < 10 ? ENH_RATE[g.e] : 0;
      const cur = gearStats(g), nx = gearStats(next);
      right = `<div class="fdetail">${gearIconHTML(g, '64px')}<div class="nm" style="color:${gearColor(g)}">${gearName(g)}</div>
        <div class="enh-bar">${Array.from({ length: 10 }, (_, i) => `<i class="${i < g.e ? 'on' : ''}"></i>`).join('')}</div>
        ${g.e >= 10 ? '<div class="owned">已强化到满级 +10</div>' : `<table class="cmp">${Object.keys(nx).map(k => `<tr><td>${STAT_NAMES[k]}</td><td>${k === 'crit' || k === 'luck' ? Math.round(cur[k] * 100) + '%' : cur[k]}</td><td>→</td><td class="up">${k === 'crit' || k === 'luck' ? Math.round(nx[k] * 100) + '%' : nx[k]}</td></tr>`).join('')}</table>
        <div class="frate">成功率 <b class="${rate < 0.6 ? 'bad' : 'ok'}">${Math.round(rate * 100)}%</b>${g.e >= 7 ? ' · 失败会掉 1 级' : ''}</div>
        <button class="btn primary big" data-act="enhance" ${S.coins >= cost ? '' : 'disabled'}>强化 +${g.e + 1}（🪙${fmtFull(cost)}）</button>`}
        <div class="fnote">每级强化让装备的数值 +15%（+10 时为 2.5 倍）。</div></div>`;
    }
  } else {
    const c = Forge.synthCheck(A.synthSel);
    const slot = A.synthSlot || (c.items ? c.items[0].slot : null);
    right = `<div class="fdetail"><div class="syn-slots">${[0, 1, 2].map(i => { const g = S.gear.find(x => x.uid === A.synthSel[i]); return g ? gearIconHTML(g, '44px') : '<span class="gframe empty">＋</span>'; }).join('<b>+</b>')}</div>`;
    if (c.why) right += `<div class="fnote">${A.synthSel.length ? c.why : '选择 3 件「等级和品质都相同」的装备，合成 1 件更高品质的装备。传说品质再合成会升到下一个等级。'}</div>`;
    else {
      right += `<div class="syn-out">→ T${c.out.tier} · <b style="color:${QUALITY[c.out.q].color}">${QUALITY[c.out.q].name}</b></div>
        <div class="chips">${SLOT_ORDER.map(s => `<button class="chip ${slot === s ? 'on' : ''}" data-act="sslot" data-v="${s}">${GEAR_SLOTS[s]}</button>`).join('')}</div>
        <button class="btn primary big" data-act="synth" ${S.coins >= c.cost ? '' : 'disabled'}>合成（🪙${fmtFull(c.cost)}）</button>
        <div class="fnote">材料上的强化等级不会保留。</div>`;
    }
    right += `<div class="auto-syn"><button class="btn green" data-act="autosynth">⚡ 一键合成全部</button><button class="btn" data-act="autosynth" data-q="2">只合成到「稀有」</button><div class="fnote">自动把所有能凑成 3 件同级同品质的装备合成（不会动穿着的、隐藏装备和套装）。</div></div>`;
    right += '</div>';
  }
  return [h + `<div class="forge">${left}${right}</div>`, `<span class="info">💰 ${fmtFull(S.coins)}</span>`];
}

function setTab() {
  const S = Game.S;
  let h = '<div class="hint">工匠·铁爪：“有图纸，有材料，我就能打。没有？那就去跑任务。套装可合成不了！”</div>';
  for (const [sk, set] of Object.entries(SETS)) {
    const cnt = Hero.setCounts()[sk] || 0;
    h += `<div class="qcard"><div class="qh"><b style="color:${SET_COLOR}">✦ ${set.name}</b> <small>已穿戴 ${cnt}/${set.pieces.length} · 2 件：${set.b2} · 3 件：${set.b3}</small></div><div class="glist">`;
    for (const key of set.pieces) {
      const U = UNIQUES[key], own = Hero.ownsUnique(key), known = S.setRecipes[key];
      const fake = { uid: -1, u: key, slot: U.slot, tier: U.tier, q: 4, e: 0 };
      const need = SET_RECIPES[key] ? Forge.setNeed(key) : [];
      h += `<div class="gcard ${own ? 'on' : ''}">${gearIconHTML(fake, '34px')}<div class="bd"><div class="nm" style="color:${SET_COLOR}">${known || own ? U.name : '？？？'}</div><div class="ds">${GEAR_SLOTS[U.slot]} · T${U.tier}</div>
        <div class="st">${known || own ? statText(U.stats) : '需要从' + U.src + '拿到图纸'}</div>${known && !own ? `<div class="need">${Inv.needHTML(need)}</div>` : ''}</div>
        <div class="act">${own ? '<span class="owned">已拥有</span>' : known ? `<button class="btn sm primary" data-act="craftset" data-id="${key}" ${Inv.canPay(need) ? '' : 'disabled'}>打造</button>` : ''}</div></div>`;
    }
    h += '</div></div>';
  }
  return [h, ''];
}

function buildTab() {
  const S = Game.S, u = UPGRADES.wh, cost = Inv.upgradeCost('wh');
  const h = `<div class="shop-list">
    <div class="scard"><span class="gframe">${gi('warehouse', '#a1887f', '34px')}</span><div class="bd"><div class="nm">扩建「${Game.scene().name}」仓库</div><div class="ds">每个地点的仓库是分开的，这里只扩建当前地点。容量 +${u.step}（当前 ${S.whCap} / 上限 ${u.max}）</div></div>
      <div class="act">${S.whCap >= u.max ? '<span class="owned">已满级</span>' : `<span class="price">🪙 ${fmtFull(cost)}</span><button class="btn sm primary" data-act="upwh" ${S.coins >= cost ? '' : 'disabled'}>扩建</button>`}</div></div>
    ${CF.call('artisan.build').join('')}
  </div><div class="hint" style="margin-top:12px">船舱扩建、修船，请去航海图里的「船坞」。</div>`;
  return [h, ''];
}

CF.panel('artisan', {
  title: '🔨 工匠铺',
  tabs: [['forge', '🔨 锻造'], ['set', '✨ 套装'], ['build', '🏗️ 扩建']],
  render(p) { return p.tab === 'set' ? setTab() : p.tab === 'build' ? buildTab() : forgeTab(); },
});
UI.nav({ id: 'artisan', label: '工匠', icon: 'smith', order: 80, key: 'j' });
UI.actions({
  forge(ds) { ForgeUI.mode = ds.v; this.render(true); },
  fsel(ds) {
    const uid = +ds.uid, A = ForgeUI;
    if (A.mode === 'enh') A.sel = uid;
    else { const i = A.synthSel.indexOf(uid); if (i >= 0) A.synthSel.splice(i, 1); else if (A.synthSel.length < 3) A.synthSel.push(uid); A.synthSlot = null; }
    this.render(true);
  },
  enhance() { const r = Forge.enhance(ForgeUI.sel); if (r) Sound.tone(r.ok ? 990 : 200, 0.25, 'triangle', 0.1, r.ok ? 1480 : 120); },
  sslot(ds) { ForgeUI.synthSlot = ds.v; this.render(true); },
  synth() { const g = Forge.synth(ForgeUI.synthSel, ForgeUI.synthSlot); if (g) { ForgeUI.synthSel = []; ForgeUI.mode = 'enh'; ForgeUI.sel = g.uid; Sound.levelup(); } },
  autosynth(ds) { Forge.autoSynth(+ds.q || undefined); },
  craft(ds) { Forge.craft(ds.id); },
  craftset(ds) { Forge.craftSet(ds.id); },
  upwh() { Inv.buyUpgrade('wh'); },
});
