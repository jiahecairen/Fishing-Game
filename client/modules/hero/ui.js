// ===== 角色 · 界面：冒险面板（角色 / 天赋 / 装备）、HP 条、装备提示 =====
// 往「角色」页底部加内容：CF.hook('hero.sections', () => html)（战斗模块用它显示技能表）
'use strict';

const gearCardHTML = (g, extra, cls) => `<div class="gcard ${cls || ''}" data-tip="${g.uid}">${gearIconHTML(g, '34px')}<div class="bd"><div class="nm" style="color:${gearColor(g)}">${gearName(g)}</div>
  <div class="ds">${GEAR_SLOTS[g.slot]} · T${g.tier}${g.u ? ' · 隐藏' : ''}</div><div class="st">${statText(gearStats(g))}</div></div><div class="act">${extra || ''}</div></div>`;

const HeroUI = {
  gearFilter: 'all',
  tipGear: {},
  gearTipHTML(g) {
    const s = gearStats(g), slotEq = Game.S.gear.find(x => x.uid === Game.S.hero.equip[g.slot]);
    let cmp = '';
    if (slotEq && slotEq.uid !== g.uid) {
      const o = gearStats(slotEq), keys = new Set([...Object.keys(s), ...Object.keys(o)]);
      cmp = '<div class="tip-cmp">与身上的对比：' + [...keys].map(k => {
        const d = (s[k] || 0) - (o[k] || 0); if (!d) return '';
        const v = (k === 'crit' || k === 'luck') ? Math.round(d * 100) + '%' : Math.round(d);
        return `<span class="${d > 0 ? 'up' : 'down'}">${STAT_NAMES[k]}${d > 0 ? '+' : ''}${v}</span>`;
      }).join(' ') + '</div>';
    }
    const U = g.u && UNIQUES[g.u];
    const setTxt = U && U.set ? `<div class="tip-fx" style="color:${SET_COLOR}">✦ 套装「${SETS[U.set].name}」2 件：${SETS[U.set].b2}；3 件：${SETS[U.set].b3}</div>` : '';
    return `<div class="tip-nm" style="color:${gearColor(g)}">${gearName(g)}</div>
      <div class="tip-sub">${GEAR_SLOTS[g.slot]} · T${g.tier} · ${g.u ? (U.set ? '套装' : '隐藏装备') : QUALITY[g.q].name}${g.e ? ` · 强化 +${g.e}` : ''}</div>
      <div class="tip-st">${statText(s)}</div>${U && U.edesc ? `<div class="tip-fx">✦ ${U.edesc}</div>` : ''}${setTxt}${cmp}
      <div class="tip-v">价值 🪙${fmtFull(gearValue(g))}</div>`;
  },
  init() {
    const hp = document.createElement('div');
    hp.className = 'pill hero-pill';
    hp.innerHTML = `${gi('heart', '#ff6b81', '16px')}<div class="bar hp"><div id="hud-hp"></div></div><span id="hud-hpt" class="num"></span>`;
    document.querySelector('.hud-left').appendChild(hp);
    UI.tip(el => { const uid = +el.dataset.tip; const g = Game.S.gear.find(x => x.uid === uid) || this.tipGear[uid]; return g ? this.gearTipHTML(g) : null; });
    UI.loot('gear', l => { this.tipGear[l.g.uid] = l.g; return `<div class="loot" data-tip="${l.g.uid}"><span class="li">${gearIconHTML(l.g, '30px')}</span><b style="color:${gearColor(l.g)}">${gearName(l.g)}</b><small>${GEAR_SLOTS[l.g.slot]} · ${statText(gearStats(l.g))}${l.kept === false ? ' · 装备栏满，已卖出' : ''}</small></div>`; });
    UI.goalExtra(S => {
      const ap = Hero.attrPoints(), tp = Hero.talentPoints();
      return ap + tp > 0 ? `<span class="g-pts" data-open="adv" data-tab="${ap ? 'hero' : 'talent'}">✨ ${ap ? `${ap} 属性点` : ''}${ap && tp ? ' · ' : ''}${tp ? `${tp} 天赋点` : ''} 待分配</span>` : '';
    });
  },
  frame() {
    const st = Hero.stats(), H = Game.S.hero;
    UI.set('hud-hp', (H.hp / st.maxHp * 100).toFixed(1) + '%', 'width');
    UI.set('hud-hpt', `${Math.ceil(H.hp)}/${st.maxHp}`);
  },
};

CF.panel('adv', {
  title: '⚔️ 冒险',
  tabs: [['hero', '🐱 角色'], ['talent', '🌟 天赋'], ['gear', '⚔️ 装备']],
  render(p) {
    const S = Game.S, st = Hero.stats(), H = S.hero;
    if (p.tab === 'hero') {
      const ap = Hero.attrPoints();
      const slots = SLOT_ORDER.map(slot => {
        const g = S.gear.find(x => x.uid === S.hero.equip[slot]);
        return g ? `<div class="eslot" data-tip="${g.uid}">${gearIconHTML(g, '38px')}<div class="es-nm" style="color:${gearColor(g)}">${gearName(g)}</div><button class="btn sm" data-act="unequip" data-slot="${slot}">卸下</button></div>`
          : `<div class="eslot empty"><span class="gframe">${gi(SLOT_GI[slot] + '1', '#c9bda4', '38px')}</span><div class="es-nm">${GEAR_SLOTS[slot]}（空）</div><button class="btn sm" data-act="gotogear" data-v="${slot}">去装备</button></div>`;
      }).join('');
      const attrs = Object.entries(ATTRS).map(([k, A]) => `<div class="attr"><span class="an">${gi(A.gi, '#8a6d3b', '18px')} ${A.name} <b>${S.attrs[k]}</b></span><small>${A.desc}</small>
        <span class="ab"><button class="btn sm" data-act="attr" data-k="${k}" data-n="1" ${ap ? '' : 'disabled'}>+1</button><button class="btn sm" data-act="attr" data-k="${k}" data-n="5" ${ap >= 5 ? '' : 'disabled'}>+5</button></span></div>`).join('');
      const sc = Hero.setCounts(), sets = Object.entries(sc).map(([k, n]) => `<span style="color:${SET_COLOR}">✦ ${SETS[k].name} ${n}/3</span>`).join(' ');
      const h = `<div class="hero-top">${sprImg('hero', 6, 'hero-spr')}<div class="hero-info"><div class="nm">小橘 <span class="lv">Lv.${S.level}</span> <span class="pw">战力 ${Hero.power()}</span></div>
        <div class="hbar"><span>HP</span><div class="bar hp"><div style="width:${H.hp / st.maxHp * 100}%"></div></div><b>${Math.ceil(H.hp)}/${st.maxHp}</b></div>
        <div class="kv5"><span>${gi('atk', '#e0503a')} 攻击 <b>${st.atk}</b></span><span>${gi('def', '#3f7fbf')} 防御 <b>${st.def}</b></span><span>${gi('spd', '#3fae6a')} 速度 <b>${st.spd}</b></span><span>${gi('crit', '#ff8f00')} 暴击 <b>${Math.round(st.crit * 100)}%</b>（×${st.critDmg.toFixed(1)}）</span><span>${gi('ap', '#f2b33d')} 开场行动点 <b>${st.apStart}</b>/10</span><span>${gi('luck', '#4caf50')} 钓鱼幸运 <b>+${Math.round(Hero.gearLuck() * 100)}%</b></span></div>${sets ? `<div class="kv5">${sets}</div>` : ''}</div></div>
        <div class="hint">小橘本身很弱：等级不加属性，只给<b>属性点</b>（每级 1 点）和<b>天赋点</b>（每 2 级 1 点）。真正变强靠装备、强化和合成。</div>
        <div class="section-title">装备栏</div><div class="eslots">${slots}</div>
        <div class="section-title" style="margin-top:14px">属性加点 <span class="pts">可用 ${ap} 点</span></div><div class="attrs">${attrs}</div>
        ${CF.call('hero.sections').join('')}`;
      return [h, `<span class="info">重置属性点需要 🪙${fmtFull(Hero.resetCost())}</span><button class="btn sm red" data-act="resetattr">重置属性点</button>`];
    }
    if (p.tab === 'talent') {
      const tp = Hero.talentPoints();
      const cols = TALENT_BRANCHES.map(b => {
        const nodes = TALENTS.filter(t => t.br === b.id).map(t => {
          const r = Hero.talentRank(t.id), can = Hero.canLearn(t), lockedReq = Hero.branchSpent(t.br) < t.req;
          return `<div class="tnode ${r ? 'got' : ''} ${lockedReq ? 'lock' : ''}" style="--bc:${b.color}"><div class="tn-h"><b>${t.name}</b><span>${r}/${t.max}</span></div>
            <div class="tn-d">${t.desc(Math.max(1, r) * t.per)}</div>${lockedReq ? `<div class="tn-r">需在${b.name}系投入 ${t.req} 点</div>` : ''}
            <button class="btn sm ${can ? 'primary' : ''}" data-act="learn" data-id="${t.id}" ${can ? '' : 'disabled'}>${r >= t.max ? '已满' : '学习'}</button></div>`;
        }).join('<div class="tlink"></div>');
        return `<div class="tcol"><div class="tc-h" style="color:${b.color}">${gi(b.gi, b.color, '22px')} ${b.name}系 <small>已投入 ${Hero.branchSpent(b.id)}</small></div>${nodes}</div>`;
      }).join('');
      return [`<div class="tree">${cols}</div>`, `<span class="info">可用天赋点 <b>${tp}</b> · 重置需要 🪙${fmtFull(Hero.resetCost())}</span><button class="btn sm red" data-act="resettal">重置天赋</button>`];
    }
    // 装备
    const f = HeroUI.gearFilter;
    const chips = [['all', '全部'], ...SLOT_ORDER.map(s => [s, GEAR_SLOTS[s]])].map(([v, n]) => `<button class="chip ${f === v ? 'on' : ''}" data-act="gfilter" data-v="${v}">${n}</button>`).join('');
    const list = S.gear.filter(g => f === 'all' || g.slot === f).sort((a, b) => (b.u ? 1 : 0) - (a.u ? 1 : 0) || b.tier - a.tier || b.q - a.q || b.e - a.e);
    const h = `<div class="chips">${chips}</div>` + (list.length ? '<div class="glist">' + list.map(g => {
      const on = Hero.isEquipped(g.uid);
      return gearCardHTML(g, on ? '<span class="owned">装备中</span>' : `<button class="btn sm primary" data-act="equipg" data-uid="${g.uid}">装备</button>${g.u ? '' : `<button class="btn sm" data-act="sellg" data-uid="${g.uid}" title="分解回收 40% 价值">分解 🪙${fmtFull(Math.round(gearValue(g) * 0.4))}</button>`}`, on ? 'on' : '');
    }).join('') + '</div>' : '<div class="empty">这里还没有装备。</div>');
    return [h, `<span class="info">装备栏 ${S.gear.length}/${S.gearCap} · 鼠标悬停可对比属性</span><button class="btn sm" data-act="sellcheapg">分解未强化的普通/精良</button><button class="btn sm green" data-act="autoequip">一键换上最强</button>`];
  },
});
UI.nav({ id: 'adv', label: '冒险', icon: 'adv', order: 70, key: 'a', dot: S => Hero.attrPoints() + Hero.talentPoints() > 0 || !!CF.first('nav.dot.adv') });

UI.actions({
  equipg(ds) { Hero.equip(+ds.uid); },
  unequip(ds) { Hero.unequip(ds.slot); },
  sellg(ds) { Hero.sellGear([+ds.uid]); },
  autoequip() { Hero.autoEquip(); Game.toast('已换上最强装备', 'good'); },
  sellcheapg() { const S = Game.S; Hero.sellGear(S.gear.filter(g => !g.u && g.q <= 1 && !g.e && !Hero.isEquipped(g.uid)).map(g => g.uid)); },
  gfilter(ds) { HeroUI.gearFilter = ds.v; this.render(true); },
  gotogear(ds) { HeroUI.gearFilter = ds.v; this.panel.tab = 'gear'; this.render(); },
  attr(ds) { Hero.addAttr(ds.k, +ds.n); },
  resetattr() { Hero.resetAttrs(); },
  learn(ds) { Hero.learn(ds.id); },
  resettal() { Hero.resetTalents(); },
  eat() { Hero.eat([...this.sel]); this.sel.clear(); },
});

CF.module({ id: 'hero', init: () => HeroUI.init(), frame: () => HeroUI.frame() });
