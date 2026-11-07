// ===== 冒险界面 v0.3：剧情、战斗窗口、突发事件卡、目标提示、冒险/锻造/航海面板 =====
'use strict';

// ---------- 剧情对话 ----------
const Story = {
  q: [], active: null,
  play(id, cb, extra) {
    const lines = extra || STORY[id]; if (!lines) { if (cb) cb(); return; }
    this.q.push({ lines: lines.slice(), cb });
    if (!this.active) this.nextScript();
  },
  nextScript() {
    const s = this.q.shift();
    if (!s) { this.active = null; this.hide(); return; }
    this.active = s; this.i = -1; this.choosing = false;
    $('#story').classList.remove('hidden'); this.next();
  },
  hide() { $('#story').classList.add('hidden'); },
  next() {
    const s = this.active; if (!s) return;
    if (this.typing) { this.finishType(); return; }
    if (this.choosing) return;
    this.i++;
    if (this.i >= s.lines.length) return this.end();
    const ln = s.lines[this.i];
    if (ln.choice) return this.showChoice(ln.choice);
    const [who, text] = ln, ch = CHARS[who] || CHARS.narr;
    const face = $('#story-face');
    face.innerHTML = ch.spr ? `<img src="${spriteURL(ch.spr, ch.spr === 'hero' ? 5 : 3)}">` : ch.face;
    face.classList.toggle('hidden', !ch.face && !ch.spr);
    $('#story-name').textContent = ch.name;
    $('#story-choices').innerHTML = '';
    $('#story-more').classList.add('hidden');
    this.type(text, who);
  },
  type(text, who) {
    const el = $('#story-text'); el.textContent = '';
    this.full = text; this.pos = 0; this.typing = true;
    const pitch = { mo: 140, turtle: 180, ratking: 900, pao: 760, otter: 300, queen: 620, crabgen: 420, nana: 520, me: 500, onecap: 260, younghua: 680, oldcat: 220, koi: 990 }[who] || 440;
    clearInterval(this.timer);
    this.timer = setInterval(() => {
      this.pos++;
      el.textContent = this.full.slice(0, this.pos);
      const c = this.full[this.pos - 1];
      if (this.pos % 2 === 0 && c && !/[\s，。！？、…*（）]/.test(c)) Sound.tone(pitch * (0.95 + Math.random() * 0.1), 0.035, 'square', 0.025);
      if (this.pos >= this.full.length) this.finishType();
    }, who === 'turtle' ? 75 : 32);
  },
  finishType() { clearInterval(this.timer); this.typing = false; $('#story-text').textContent = this.full; $('#story-more').classList.remove('hidden'); },
  showChoice(choices) {
    this.choosing = true; $('#story-more').classList.add('hidden');
    $('#story-choices').innerHTML = choices.map(([id, label]) => `<button data-c="${id}">${label}</button>`).join('');
  },
  choose(id) { this.choosing = false; this.choice = id; this.end(); },
  end() {
    const s = this.active, c = this.choice;
    this.choice = null; this.choosing = false; this.typing = false;
    $('#story-choices').innerHTML = '';
    this.active = null;
    if (s && s.cb) s.cb(c);
    if (!this.active) { if (this.q.length) this.nextScript(); else { this.hide(); AdvUI.popModal(); } }
  },
};

// ---------- 冒险 UI ----------
const AdvUI = {
  queue: [], gearFilter: 'all', forgeMode: 'enh', forgeSel: null, synthSel: [], synthSlot: null,
  init() {
    const hp = document.createElement('div');
    hp.className = 'pill hero-pill';
    hp.innerHTML = `${gi('heart', '#ff6b81', '16px')}<div class="bar hp"><div id="hud-hp"></div></div><span id="hud-hpt" class="num"></span>`;
    document.querySelector('.hud-left').appendChild(hp);

    $('#story').addEventListener('click', e => { const b = e.target.closest('button[data-c]'); if (b) { Sound.click(); Story.choose(b.dataset.c); } else Story.next(); });
    $('#battle').addEventListener('click', e => {
      const b = e.target.closest('button'); if (!b) return;
      if (b.dataset.bs) { Game.S.settings.battleSpeed = +b.dataset.bs; this.renderBattle(); }
      if (b.dataset.flee !== undefined) this.confirmRetreat(b);
    });
    $('#adv-bar').addEventListener('click', e => {
      const b = e.target.closest('button'); if (!b) return;
      if (b.dataset.flee !== undefined) this.confirmRetreat(b);
      if (b.dataset.open) UI.open(b.dataset.open, b.dataset.tab);
    });
    $('#event-card').addEventListener('click', e => { const b = e.target.closest('button[data-ev]'); if (b) { Sound.click(); Events.choose(+b.dataset.ev); } });
    $('#goal').addEventListener('click', e => { const b = e.target.closest('[data-open]'); if (b) UI.open(b.dataset.open, b.dataset.tab); });
    // 装备悬停提示
    document.addEventListener('mouseover', e => { const el = e.target.closest('[data-tip]'); if (el) this.showTip(el); else this.hideTip(); });
    document.addEventListener('mousemove', e => { const t = $('#tip'); if (!t.classList.contains('hidden')) { t.style.left = Math.min(innerWidth - t.offsetWidth - 10, e.clientX + 16) + 'px'; t.style.top = Math.min(innerHeight - t.offsetHeight - 10, e.clientY + 12) + 'px'; } });

    Game.on('story', d => Story.play(d.id, d.cb, d.lines));
    Game.on('loot', d => this.showModal('loot', d));
    Game.on('battleStart', () => { this.renderBattle(); Sound.tone(220, 0.15, 'square', 0.08); Sound.tone(330, 0.2, 'square', 0.08, null, 0.12); });
    Game.on('battleLog', B => this.onBattleLog(B));
    Game.on('battleEnd', B => { setTimeout(() => { if (!Adv.battle) $('#battle').classList.add('hidden'); }, 50); if (B && B.result === 'win') Sound.levelup(); });
    Game.on('advlog', msg => { this.lastLog = msg; });
    Game.on('mode', () => { this.lastLog = ''; });
    Game.on('event', c => this.renderEvent(c));
  },

  confirmRetreat(b) {
    const B = Adv.battle;
    if (B && B.ctx.where === 'event') { Adv.battle = null; Game.emit('battleEnd', {}); Game.toast('溜走了……', 'warn'); return; }
    if (b.dataset.armed) { Adv.retreat(); return; }
    b.dataset.armed = '1'; const t = b.textContent; b.textContent = '再点一次确认';
    setTimeout(() => { b.textContent = t; delete b.dataset.armed; }, 2500);
  },
  showModal(name, data) {
    if (Story.active || (UI.panel && ['loot', 'offline'].includes(UI.panel.name))) { this.queue.push([name, data]); return; }
    UI.panel = { name, data }; UI.sel.clear();
    $('#modal-bg').classList.remove('hidden'); UI.render();
  },
  popModal() { if (Story.active || UI.panel) return; const n = this.queue.shift(); if (n) this.showModal(n[0], n[1]); },

  // ---------- 悬停提示 ----------
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
    return `<div class="tip-nm" style="color:${gearColor(g)}">${gearName(g)}</div>
      <div class="tip-sub">${GEAR_SLOTS[g.slot]} · T${g.tier} · ${g.u ? '隐藏装备' : QUALITY[g.q].name}${g.e ? ` · 强化 +${g.e}` : ''}</div>
      <div class="tip-st">${statText(s)}</div>${U ? `<div class="tip-fx">✦ ${U.edesc}</div>` : ''}${cmp}
      <div class="tip-v">出售 🪙${fmtFull(gearValue(g))}</div>`;
  },
  showTip(el) {
    const t = $('#tip');
    const uid = +el.dataset.tip, g = Game.S.gear.find(x => x.uid === uid) || (this._tipGear && this._tipGear[uid]);
    if (!g) { this.hideTip(); return; }
    t.innerHTML = this.gearTipHTML(g); t.classList.remove('hidden');
  },
  hideTip() { $('#tip').classList.add('hidden'); },

  // ---------- 突发事件卡片 ----------
  renderEvent(c) {
    const el = $('#event-card');
    if (!c) { el.classList.add('hidden'); return; }
    const d = c.def;
    const icon = d.spr ? `<img class="ev-spr" src="${spriteURL(d.spr, 4)}">` : gi(d.icon, d.color || '#fff', '44px');
    const text = typeof d.text === 'function' ? d.text(c.ctx) : (c.ctx.text || d.text);
    let body;
    if (c.done) body = `<div class="ev-res">${c.result}</div>`;
    else body = `<div class="ev-text">${(text || '').replace(/\n/g, '<br>')}</div><div class="ev-ch">${d.choices.map((ch, i) => `<button data-ev="${i}">${typeof ch.t === 'function' ? ch.t(c.ctx) : ch.t}</button>`).join('')}</div>
      <div class="ev-timer"><div style="animation-duration:${c.max}s"></div></div>`;
    el.innerHTML = `<div class="ev-head">${icon}<div><div class="ev-kind">${{ fish: '突发事件', voyage: '海上事件', dungeon: '副本事件' }[c.where]}</div><div class="ev-title">${d.title}</div></div></div>${body}`;
    el.classList.remove('hidden');
  },

  // ---------- 战斗窗口 ----------
  renderBattle() {
    const B = Adv.battle; if (!B) return;
    $('#battle').classList.remove('hidden');
    const big = B.foe.boss;
    $('#b-icon').src = spriteURL(B.foe.id, big ? 6 : 7);
    $('#b-icon').className = big ? 'boss' : '';
    $('#b-hero-img').src = spriteURL('hero', 6);
    $('#b-name').textContent = `${B.foe.name}  Lv.${B.foe.lv}`;
    this.updateBars(B);
    const sp = Game.S.settings.battleSpeed;
    $('#b-speed').innerHTML = [1, 2, 4, 8].map(v => `<button data-bs="${v}" class="${sp === v ? 'on' : ''}">×${v}</button>`).join('');
    $('#b-log').innerHTML = B.log.slice(-4).map(l => `<div>${l}</div>`).join('');
    $('#battle [data-flee]').textContent = B.ctx.where === 'event' ? '逃跑' : '撤退';
  },
  updateBars(B) {
    const st = Adv.stats(), H = Game.S.hero;
    $('#b-fhp').style.width = (B.foe.hp / B.foe.maxHp * 100) + '%';
    $('#b-fhpt').textContent = `HP ${Math.ceil(B.foe.hp)}/${B.foe.maxHp}`;
    $('#b-hhp').style.width = (H.hp / st.maxHp * 100) + '%';
    $('#b-hero').textContent = `小橘  LV ${Game.S.level}`;
    $('#b-hpt').textContent = `HP ${Math.ceil(H.hp)}/${st.maxHp}`;
    $('#b-ap').innerHTML = Array.from({ length: st.apMax }, (_, i) => `<i class="${i < B.ap ? 'on' : ''}"></i>`).join('') + `<span>${B.ap}/${st.apMax}</span>`;
    const tags = [];
    if (B.guard) tags.push('炸毛×' + B.guard);
    if (B.freeze) tags.push('❄ 冻结');
    if (Game.S.dungeon && Game.S.dungeon.buff) tags.push('祭坛之力');
    $('#b-status').textContent = tags.join(' · ');
  },
  onBattleLog(B) {
    if (!B) return;
    $('#b-log').innerHTML = B.log.slice(-4).map(l => `<div>${l}</div>`).join('');
    this.updateBars(B);
    const fx = B.fx;
    if (fx && fx.kind === 'hit') {
      if (fx.who === 'foe') {
        const ic = $('#b-icon'); ic.classList.remove('shake'); void ic.offsetWidth; ic.classList.add('shake');
        this.floatNum(fx.n, fx.crit ? '#ffd54a' : '#ff6b6b', fx.crit);
        Sound.tone(fx.crit ? 180 : 260, 0.08, 'square', 0.07, 90);
      } else {
        const bx = $('#battle'); bx.classList.remove('hurt'); void bx.offsetWidth; bx.classList.add('hurt');
        const hi = $('#b-hero-img'); hi.classList.remove('shake'); void hi.offsetWidth; hi.classList.add('shake');
        Renderer.flash = fx.big ? 0.25 : 0.1;
        Sound.noise(0.12, 0.12, 600);
      }
    } else if (fx && fx.kind === 'heal') Sound.tone(660, 0.15, 'triangle', 0.08, 990);
    if (B.over && (B.result === 'win' || B.result === 'spare')) $('#b-icon').classList.add('dead');
    if (B.pause === 'mercy' && !B.mercyShown) { B.mercyShown = true; Story.play('mercy_abyss', c => Adv.mercyChoice(c || 'fight')); }
  },
  floatNum(n, color, big) {
    const d = document.createElement('div');
    d.className = 'dmg'; d.textContent = n; d.style.color = color; if (big) d.style.fontSize = '34px';
    d.style.left = (40 + Math.random() * 20) + '%';
    $('#b-dmg').appendChild(d); setTimeout(() => d.remove(), 900);
  },

  // ---------- 目标提示 ----------
  goal() {
    const S = Game.S;
    for (const r of ROUTES) {
      if (Adv.reached(r.to) || !Adv.reached(r.from)) continue;
      const P = PLACES[r.to].name;
      if (!S.addr.includes(r.to)) {
        if (!Adv.dexComplete(r.from)) return [`📖 集齐「${PLACES[r.from].name}」图鉴（传说除外）${Adv.dexDone(r.from)}/${Adv.dexNeed(r.from).length}`, 'dex'];
        return [`🦦 打开航海图，向獭爷爷兑换「${P}」的地址`, 'map'];
      }
      if (S.boat < r.boat) return [`⚓ 在航海图·船坞买一艘${BOATS[r.boat].name}（🪙${fmtFull(BOATS[r.boat].price)}）`, 'map', 'dock'];
      const need = Adv.provisions(r);
      if (Adv.fishTotal() < need) return [`🐟 攒够 ${need} 条鱼作为出航补给 ${Adv.fishTotal()}/${need}`, 'wh'];
      return [`⛵ 一切就绪！起航前往「${P}」`, 'map'];
    }
    if (!S.cleared.abyss) return ['🌀 深渊之岛的「沉没王座」在等你', 'map', 'dungeon'];
    if (S.story.ending !== 'spare') return ['💭 再去一次沉没王座……也许可以做出不同的选择', 'map', 'dungeon'];
    if (!S.hiddenOpen.dream) return ['✨ 雾夜里，去湖畔钓一条湖神金鲤', 'dex'];
    if (!S.cleared.dream) return ['🌙 梦之湖已经出现在副本列表里', 'map', 'dungeon'];
    if (!S.hiddenOpen.pirate) return [`🏴‍☠️ 收集海盗地图碎片 ${S.treasure.mapPiece}/3`, 'adv', 'treasure'];
    return [`🏆 收集全部图鉴（${Object.keys(S.dex).length}/${FISH.length}）与隐藏装备（${Object.keys(UNIQUES).filter(u => Adv.ownsUnique(u)).length}/${Object.keys(UNIQUES).length}）`, 'dex'];
  },

  // ---------- 每帧 ----------
  tick() {
    const S = Game.S, st = Adv.stats(), H = S.hero;
    UI.set('hud-hp', (H.hp / st.maxHp * 100).toFixed(1) + '%', 'width');
    UI.set('hud-hpt', `${Math.ceil(H.hp)}/${st.maxHp}`);
    const adv = S.mode !== 'fish';
    UI.set('center-ctl', adv ? 'hidden' : '', 'class');
    UI.set('adv-bar', adv ? 'panel-glass' : 'panel-glass hidden', 'class');
    UI.set('log', adv ? 'panel-glass hidden' : 'panel-glass', 'class');
    UI.set('cheat-btn', S.settings.cheatBtn ? '' : 'hidden', 'class');
    this._t = (this._t || 0) + 1;
    if (this._t % 20 === 0) {
      const ap = Adv.attrPoints(), tp = Adv.talentPoints();
      const chestOk = S.treasure.key > 0 && (S.treasure.chest_wood + S.treasure.chest_silver + S.treasure.chest_gold) > 0;
      const addrOk = ROUTES.some(r => !S.addr.includes(r.to) && Adv.reached(r.from) && Adv.dexComplete(r.from));
      document.querySelector('#nav [data-open="adv"]').classList.toggle('dot', ap + tp > 0 || chestOk);
      document.querySelector('#nav [data-open="map"]').classList.toggle('dot', addrOk);
      const [g, open, tab] = this.goal();
      let html = `<span class="g-main" data-open="${open}" ${tab ? `data-tab="${tab}"` : ''}>${g}</span>`;
      if (ap + tp > 0) html += `<span class="g-pts" data-open="adv" data-tab="${ap ? 'hero' : 'talent'}">✨ ${ap ? `${ap} 属性点` : ''}${ap && tp ? ' · ' : ''}${tp ? `${tp} 天赋点` : ''} 待分配</span>`;
      UI.set('goal', html, 'html');
    }
    if (!adv) return;
    let html = '';
    if (S.mode === 'voyage') {
      const v = S.voyage, p = clamp(v.t / v.dur, 0, 1);
      const left = Math.max(0, (v.dur - v.t) / Adv.boatSpeed());
      const title = v.kind === 'hunt' ? '🗺️ 按藏宝图寻宝中' : `${BOATS[S.boat].name} · 航行前往 ${PLACES[v.to].name}`;
      html = `<div class="ab-title">${gi(BOATS[S.boat].gi, '#8fd3ff', '20px')} ${title}</div>
        <div class="ab-prog"><div style="width:${(p * 100).toFixed(1)}%"></div><span class="ship" style="left:${(p * 100).toFixed(1)}%">${gi(BOATS[S.boat].gi, '#fff', '22px')}</span></div>
        <div class="ab-sub">${Adv.battle ? '⚔️ 遭遇战斗！' : Events.blocking() ? '❗ 海上发生了什么……' : `剩余 ${dur(left * 1000)} · 海上会遇到怪物和突发事件（Lv.${v.lv[0]}–${v.lv[1]}）`}</div>`;
    } else {
      const D = S.dungeon, def = DUNGEONS.find(x => x.id === D.id);
      const where = ['boss', 'bossTalk', 'bossWait'].includes(D.phase) ? '👑 最深处' : `第 ${D.floor}/${def.floors} 层 · 房间 ${Math.min(D.room + 1, ROOMS_PER_FLOOR)}/${ROOMS_PER_FLOOR}`;
      const path = { safe: '🛡️ 平稳', danger: '💀 危险', mystery: '❓ 神秘' }[D.path];
      html = `<div class="ab-title">${gi(def.gi, '#ffe082', '20px')} ${def.name} · ${where} <span class="path">${path}</span></div>
        <div class="ab-sub">${D.phase === 'bossWait' ? '小橘站在 Boss 的门前……' : Adv.battle ? '⚔️ 战斗中' : Events.blocking() ? '❗ 发生了什么……' : (this.lastLog || '* 小橘小心翼翼地向前走。')}</div>
        <div class="ab-sub muted">本次收获：🪙${fmtFull(D.loot.coins)} · 经验 ${D.loot.exp} · 装备 ${D.loot.gear} 件${D.buff ? ' · 祭坛之力 攻击+25%' : ''}</div>`;
    }
    const foodN = S.bag.filter(x => foodValue(x)).length;
    html += `<div class="ab-row"><span>🍱 口粮 ${foodN} 条 · ❤️ ${Math.ceil(H.hp)}/${st.maxHp}</span><button data-open="bag">🎒 背包</button><button data-open="adv" data-tab="gear">⚔️ 装备</button><button data-flee class="flee">${S.mode === 'voyage' ? (S.voyage.kind === 'hunt' ? '放弃寻宝' : '返航') : '撤退'}</button></div>`;
    UI.set('adv-bar', html, 'html');
  },

  offlineHtml(r) {
    let h = `<div class="stats"><div><b>${r.battles}</b>场战斗</div><div><b>${r.wins}</b>胜利</div><div><b>🪙${fmtFull(r.coins)}</b>金币</div><div><b>${r.gear}</b>件装备</div></div>`;
    if (r.bossWait) h += '<div class="hint">小橘停在了 Boss 的门前，等你回来一起面对。</div>';
    else if (r.endMode !== 'fish') h += `<div class="hint">${r.kind === 'voyage' ? '船还在海上航行……' : '小橘还在副本里探索……'}</div>`;
    return h;
  },

  // ---------- 操作 ----------
  act(a, ds, el) {
    const id = ds.id, uid = +ds.uid, S = Game.S;
    switch (a) {
      case 'equipg': Adv.equip(uid); break;
      case 'unequip': Adv.unequip(ds.slot); break;
      case 'sellg': Adv.sellGear([uid]); break;
      case 'autoequip': Adv.autoEquip(); Game.toast('已换上最强装备', 'good'); break;
      case 'sellcheapg': Adv.sellGear(S.gear.filter(g => !g.u && g.q <= 1 && !g.e && !Adv.isEquipped(g.uid)).map(g => g.uid)); break;
      case 'gfilter': this.gearFilter = ds.v; UI.render(true); break;
      case 'attr': Adv.addAttr(ds.k, +ds.n); break;
      case 'resetattr': Adv.resetAttrs(); break;
      case 'learn': Adv.learn(id); break;
      case 'resettal': Adv.resetTalents(); break;
      case 'forge': this.forgeMode = ds.v; UI.render(true); break;
      case 'fsel':
        if (this.forgeMode === 'enh') this.forgeSel = uid;
        else { const i = this.synthSel.indexOf(uid); if (i >= 0) this.synthSel.splice(i, 1); else if (this.synthSel.length < 3) this.synthSel.push(uid); this.synthSlot = null; }
        UI.render(true); break;
      case 'enhance': { const r = Adv.enhance(this.forgeSel); if (r) { Sound.tone(r.ok ? 990 : 200, 0.25, 'triangle', 0.1, r.ok ? 1480 : 120); } break; }
      case 'sslot': this.synthSlot = ds.v; UI.render(true); break;
      case 'synth': { const g = Adv.synth(this.synthSel, this.synthSlot); if (g) { this.synthSel = []; this.forgeMode = 'enh'; this.forgeSel = g.uid; Sound.levelup(); } break; }
      case 'craft': Adv.craft(id); break;
      case 'openchest': Adv.openChest(id, +ds.n || 1); break;
      case 'hunt': Adv.startHunt(); UI.close(); break;
      case 'addr': Adv.claimAddress(id); break;
      case 'sail': Adv.startVoyage(id); UI.close(); break;
      case 'enter': Adv.enterDungeon(id); UI.close(); break;
      case 'boat': Adv.buyBoat(+ds.tier); break;
      case 'boatup': Adv.upgradeBoat(id); break;
      default: if (typeof Cheat !== 'undefined') Cheat.act(a, ds, el);
    }
  },
};

// ---------- 面板 ----------
const gearCardHTML = (g, extra, cls) => `<div class="gcard ${cls || ''}" data-tip="${g.uid}">${gearIconHTML(g, '34px')}<div class="bd"><div class="nm" style="color:${gearColor(g)}">${gearName(g)}</div>
  <div class="ds">${GEAR_SLOTS[g.slot]} · T${g.tier}${g.u ? ' · 隐藏' : ''}</div><div class="st">${statText(gearStats(g))}</div></div><div class="act">${extra || ''}</div></div>`;

Object.assign(UI, {
  p_adv(p) {
    const S = Game.S, st = Adv.stats(), H = S.hero;
    if (p.tab === 'hero') {
      const ap = Adv.attrPoints();
      const slots = SLOT_ORDER.map(slot => {
        const g = S.gear.find(x => x.uid === S.hero.equip[slot]);
        return g ? `<div class="eslot" data-tip="${g.uid}">${gearIconHTML(g, '38px')}<div class="es-nm" style="color:${gearColor(g)}">${gearName(g)}</div><button class="btn sm" data-act="unequip" data-slot="${slot}">卸下</button></div>`
          : `<div class="eslot empty"><span class="gframe">${gi(SLOT_GI[slot] + '1', '#c9bda4', '38px')}</span><div class="es-nm">${GEAR_SLOTS[slot]}（空）</div><button class="btn sm" data-act="gfilter" data-v="${slot}" onclick="UI.panel.tab='gear'">去装备</button></div>`;
      }).join('');
      const attrs = Object.entries(ATTRS).map(([k, A]) => `<div class="attr"><span class="an">${gi(A.gi, '#8a6d3b', '18px')} ${A.name} <b>${S.attrs[k]}</b></span><small>${A.desc}</small>
        <span class="ab"><button class="btn sm" data-act="attr" data-k="${k}" data-n="1" ${ap ? '' : 'disabled'}>+1</button><button class="btn sm" data-act="attr" data-k="${k}" data-n="5" ${ap >= 5 ? '' : 'disabled'}>+5</button></span></div>`).join('');
      const skills = Adv.skills();
      const skl = Object.entries(SKILLS).map(([k, K]) => `<div class="skill ${skills.includes(k) ? '' : 'locked'}"><b>${K.name}</b> <span>${K.ap ? `⚡${K.ap}` : '免费'}</span><small>${K.heal ? `回复 ${K.heal * 100}% 生命` : K.guard ? '接下来 2 次受到的伤害减半' : `${K.hits > 1 ? K.hits + ' 连击 × ' : ''}${K.mult} 倍伤害`}${skills.includes(k) ? '' : ' · 天赋解锁'}</small></div>`).join('');
      const h = `<div class="hero-top"><img class="hero-spr" src="${spriteURL('hero', 6)}"><div class="hero-info"><div class="nm">小橘 <span class="lv">Lv.${S.level}</span> <span class="pw">战力 ${Adv.power()}</span></div>
        <div class="hbar"><span>HP</span><div class="bar hp"><div style="width:${H.hp / st.maxHp * 100}%"></div></div><b>${Math.ceil(H.hp)}/${st.maxHp}</b></div>
        <div class="kv5"><span>${gi('atk', '#e0503a')} 攻击 <b>${st.atk}</b></span><span>${gi('def', '#3f7fbf')} 防御 <b>${st.def}</b></span><span>${gi('spd', '#3fae6a')} 速度 <b>${st.spd}</b></span><span>${gi('crit', '#ff8f00')} 暴击 <b>${Math.round(st.crit * 100)}%</b>（×${st.critDmg.toFixed(1)}）</span><span>${gi('ap', '#f2b33d')} 开场行动点 <b>${st.apStart}</b>/10</span><span>${gi('luck', '#4caf50')} 钓鱼幸运 <b>+${Math.round(Adv.gearLuck() * 100)}%</b></span></div></div></div>
        <div class="hint">小橘本身很弱：等级不加属性，只给<b>属性点</b>（每级 1 点）和<b>天赋点</b>（每 2 级 1 点）。真正变强靠装备、强化和合成。</div>
        <div class="section-title">装备栏</div><div class="eslots">${slots}</div>
        <div class="section-title" style="margin-top:14px">属性加点 <span class="pts">可用 ${ap} 点</span></div><div class="attrs">${attrs}</div>
        <div class="section-title" style="margin-top:14px">技能（战斗中自动释放，行动点每回合 +1，上限 10）</div><div class="skills">${skl}</div>`;
      return [h, `<span class="info">重置属性点需要 🪙${fmtFull(Adv.resetCost())}</span><button class="btn sm red" data-act="resetattr">重置属性点</button>`];
    }
    if (p.tab === 'talent') {
      const tp = Adv.talentPoints();
      const cols = TALENT_BRANCHES.map(b => {
        const nodes = TALENTS.filter(t => t.br === b.id).map(t => {
          const r = Adv.talentRank(t.id), can = Adv.canLearn(t), lockedReq = Adv.branchSpent(t.br) < t.req;
          return `<div class="tnode ${r ? 'got' : ''} ${lockedReq ? 'lock' : ''}" style="--bc:${b.color}"><div class="tn-h"><b>${t.name}</b><span>${r}/${t.max}</span></div>
            <div class="tn-d">${t.desc(Math.max(1, r) * t.per)}</div>${lockedReq ? `<div class="tn-r">需在${b.name}系投入 ${t.req} 点</div>` : ''}
            <button class="btn sm ${can ? 'primary' : ''}" data-act="learn" data-id="${t.id}" ${can ? '' : 'disabled'}>${r >= t.max ? '已满' : '学习'}</button></div>`;
        }).join('<div class="tlink"></div>');
        return `<div class="tcol"><div class="tc-h" style="color:${b.color}">${gi(b.gi, b.color, '22px')} ${b.name}系 <small>已投入 ${Adv.branchSpent(b.id)}</small></div>${nodes}</div>`;
      }).join('');
      return [`<div class="tree">${cols}</div>`, `<span class="info">可用天赋点 <b>${tp}</b> · 重置需要 🪙${fmtFull(Adv.resetCost())}</span><button class="btn sm red" data-act="resettal">重置天赋</button>`];
    }
    if (p.tab === 'gear') {
      const f = AdvUI.gearFilter;
      const chips = [['all', '全部'], ...SLOT_ORDER.map(s => [s, GEAR_SLOTS[s]])].map(([v, n]) => `<button class="chip ${f === v ? 'on' : ''}" data-act="gfilter" data-v="${v}">${n}</button>`).join('');
      const list = S.gear.filter(g => f === 'all' || g.slot === f).sort((a, b) => (b.u ? 1 : 0) - (a.u ? 1 : 0) || b.tier - a.tier || b.q - a.q || b.e - a.e);
      const h = `<div class="chips">${chips}</div>` + (list.length ? '<div class="glist">' + list.map(g => {
        const on = Adv.isEquipped(g.uid);
        return gearCardHTML(g, on ? '<span class="owned">装备中</span>' : `<button class="btn sm primary" data-act="equipg" data-uid="${g.uid}">装备</button>${g.u ? '' : `<button class="btn sm" data-act="sellg" data-uid="${g.uid}">🪙${fmtFull(gearValue(g))}</button>`}`, on ? 'on' : '');
      }).join('') + '</div>' : '<div class="empty">这里还没有装备。</div>');
      return [h, `<span class="info">装备栏 ${S.gear.length}/${S.gearCap} · 鼠标悬停可对比属性</span><button class="btn sm" data-act="sellcheapg">卖掉未强化的普通/精良</button><button class="btn sm green" data-act="autoequip">一键换上最强</button>`];
    }
    if (p.tab === 'forge') return this.p_forge();
    // treasure
    const T = S.treasure;
    const chests = ['chest_wood', 'chest_silver', 'chest_gold'].map(id => {
      const t = FISH_BY_ID[id], n = Math.min(T[id] || 0, T.key || 0);
      return `<div class="scard"><span class="gframe">${gi('chest', t.color, '34px')}</span><div class="bd"><div class="nm">${t.name} ×${T[id] || 0}</div><div class="ds">${t.desc}</div></div>
        <div class="act qty"><button class="btn sm primary" data-act="openchest" data-id="${id}" data-n="1" ${n ? '' : 'disabled'}>打开</button><button class="btn sm" data-act="openchest" data-id="${id}" data-n="10" ${n >= 2 ? '' : 'disabled'}>×10</button><button class="btn sm" data-act="openchest" data-id="${id}" data-n="9999" ${n >= 2 ? '' : 'disabled'}>全部</button></div></div>`;
    }).join('');
    const h = `<div class="hint">钓鱼时偶尔会钓到钥匙、宝箱和藏宝图（幸运越高越容易）。越远的钓点，宝箱越好。可以一次批量打开。</div><div class="shop-list">
      <div class="scard"><span class="gframe">${gi('key', '#d9a441', '34px')}</span><div class="bd"><div class="nm">生锈的钥匙 ×${T.key || 0}</div><div class="ds">每把钥匙能打开一个宝箱。</div></div></div>
      ${chests}
      <div class="scard"><span class="gframe">${gi('map', '#e8d3a0', '34px')}</span><div class="bd"><div class="nm">藏宝图 ×${T.map || 0}</div><div class="ds">驾船去${Game.scene().name}附近寻宝（约 1.5 分钟，会遇到怪物），终点有黄金宝箱。</div></div>
        <div class="act"><button class="btn sm green" data-act="hunt" ${T.map > 0 && S.boat > 0 && S.mode === 'fish' ? '' : 'disabled'}>${S.boat > 0 ? '出发寻宝' : '需要船'}</button></div></div>
      <div class="scard"><span class="gframe">${gi('mapPiece', '#c9b48a', '34px')}</span><div class="bd"><div class="nm">海盗地图碎片 ${S.hiddenOpen.pirate ? '（已拼好）' : `${T.mapPiece || 0}/3`}</div><div class="ds">${S.hiddenOpen.pirate ? '地图指向了海盗湾。' : '海盗猫、骷髅水手和漂流瓶里偶尔能找到。'}</div></div></div>
    </div>`;
    return [h, ''];
  },

  p_forge() {
    const S = Game.S, A = AdvUI, mode = A.forgeMode;
    const tabs = [['enh', '🔨 强化'], ['syn', '⚗️ 合成'], ['rec', '📜 配方']].map(([v, n]) => `<button class="chip ${mode === v ? 'on' : ''}" data-act="forge" data-v="${v}">${n}</button>`).join('');
    let h = `<div class="chips">${tabs}</div>`;
    if (mode === 'rec') {
      h += '<div class="shop-list">' + RECIPES.map(r => {
        const U = UNIQUES[r.out], known = r.need.some(([id]) => S.dex[id]), have = Adv.recipeHave(r), owned = Adv.ownsUnique(r.out);
        const ok = have.every(([, n, h2]) => h2 >= n);
        return `<div class="scard"><span class="gframe" style="--qc:${UNIQUE_COLOR}">${gi(r.out, known ? UNIQUE_COLOR : '#bbb', '34px')}</span><div class="bd"><div class="nm" style="color:${UNIQUE_COLOR}">${known ? U.name : '？？？'}</div>
          <div class="ds">${known ? `${statText(U.stats)} · ✦ ${U.edesc}` : r.hint}</div>
          ${known ? `<div class="st">${have.map(([id, n, h2]) => `<span class="${h2 >= n ? 'ok' : 'bad'}">${FISH_BY_ID[id].name} ${h2}/${n}</span>`).join(' · ')} · 🪙${fmtFull(r.coins)}</div>` : ''}</div>
          <div class="act">${owned ? '<span class="owned">已拥有</span>' : `<button class="btn sm primary" data-act="craft" data-id="${r.id}" ${known && ok && S.coins >= r.coins ? '' : 'disabled'}>锻造</button>`}</div></div>`;
      }).join('') + '</div><div class="hint" style="margin-top:12px">配方的材料是鱼（会从仓库和背包里扣除）。还有更多隐藏装备藏在副本、事件和剧情里……</div>';
      return [h, ''];
    }
    const list = S.gear.slice().sort((a, b) => (Adv.isEquipped(b.uid) ? 1 : 0) - (Adv.isEquipped(a.uid) ? 1 : 0) || b.tier - a.tier || b.q - a.q);
    const pick = mode === 'enh' ? [A.forgeSel] : A.synthSel;
    const left = '<div class="flist">' + list.map(g => `<div class="frow ${pick.includes(g.uid) ? 'sel' : ''} ${mode === 'syn' && (g.u || Adv.isEquipped(g.uid)) ? 'dis' : ''}" data-act="fsel" data-uid="${g.uid}" data-tip="${g.uid}">${gearIconHTML(g, '24px')}<span style="color:${gearColor(g)}">${gearName(g)}</span>${Adv.isEquipped(g.uid) ? '<i>装备中</i>' : ''}</div>`).join('') + '</div>';
    let right = '';
    if (mode === 'enh') {
      const g = S.gear.find(x => x.uid === A.forgeSel);
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
      const c = Adv.synthCheck(A.synthSel);
      const slot = A.synthSlot || (c.items ? c.items[0].slot : null);
      right = `<div class="fdetail"><div class="syn-slots">${[0, 1, 2].map(i => { const g = S.gear.find(x => x.uid === A.synthSel[i]); return g ? gearIconHTML(g, '44px') : '<span class="gframe empty">＋</span>'; }).join('<b>+</b>')}</div>`;
      if (c.why) right += `<div class="fnote">${A.synthSel.length ? c.why : '选择 3 件「等级和品质都相同」的装备，合成 1 件更高品质的装备。传说品质再合成会升到下一个等级。'}</div>`;
      else {
        right += `<div class="syn-out">→ T${c.out.tier} · <b style="color:${QUALITY[c.out.q].color}">${QUALITY[c.out.q].name}</b></div>
          <div class="chips">${SLOT_ORDER.map(s => `<button class="chip ${slot === s ? 'on' : ''}" data-act="sslot" data-v="${s}">${GEAR_SLOTS[s]}</button>`).join('')}</div>
          <button class="btn primary big" data-act="synth" ${S.coins >= c.cost ? '' : 'disabled'}>合成（🪙${fmtFull(c.cost)}）</button>
          <div class="fnote">材料上的强化等级不会保留。</div>`;
      }
      right += `<div class="auto-syn"><button class="btn green" data-act="autosynth">⚡ 一键合成全部</button><button class="btn" data-act="autosynth" data-q="2">只合成到「稀有」</button><div class="fnote">自动把所有能凑成 3 件同级同品质的装备合成（不会动穿着的和隐藏装备）。</div></div>`;
      right += '</div>';
    }
    return [h + `<div class="forge">${left}${right}</div>`, `<span class="info">💰 ${fmtFull(S.coins)}</span>`];
  },

  p_map(p) {
    const S = Game.S;
    if (!S.story.seen.captain) setTimeout(() => Adv.story('captain'), 50);
    if (p.tab === 'sail') {
      const order = PLACE_ORDER;
      let h = '<div class="hint">🦦 獭爷爷：把一个钓点的图鉴集齐（传说鱼除外），就能换到下一个地方的地址。还需要合适的船，以及足够的鱼当补给。</div><div class="route">';
      order.forEach((pl, i) => {
        const P = PLACES[pl], r = Adv.routeTo(pl), reached = Adv.reached(pl);
        let body = '', act = '';
        if (reached) {
          body = '<span class="owned">✓ 已到达</span>';
          act = S.scene === pl ? '<span class="owned">📍 当前所在</span>' : `<button class="btn sm green" data-act="goto" data-id="${pl}" ${S.mode === 'fish' && S.boat ? '' : 'disabled'}>⛵ 前往</button>`;
        } else if (!S.addr.includes(pl)) {
          const need = Adv.dexNeed(r.from).length, got = Adv.dexDone(r.from);
          body = `需要集齐「${PLACES[r.from].name}」图鉴：<b>${got}/${need}</b>`;
          act = `<button class="btn sm primary" data-act="addr" data-id="${pl}" ${got >= need && Adv.reached(r.from) ? '' : 'disabled'}>兑换地址</button>`;
        } else {
          const prov = Adv.provisions(r), okBoat = S.boat >= r.boat, okFish = Adv.fishTotal() >= prov;
          body = `<span class="${okBoat ? 'ok' : 'bad'}">${okBoat ? '✓' : '✗'} ${BOATS[r.boat].name}</span><span class="${okFish ? 'ok' : 'bad'}">${okFish ? '✓' : '✗'} 补给 ${Adv.fishTotal()}/${prov} 条鱼</span>
            <span class="${S.scene === r.from ? 'ok' : 'bad'}">${S.scene === r.from ? '✓' : '✗'} 从${PLACES[r.from].name}出发</span><span class="${S.boatHp >= Adv.wearCost(r) ? 'ok' : 'bad'}">🔧 耐久 -${Adv.wearCost(r)}</span>
            <span>⏱️ 约 ${Math.round(r.dur / 60 / (S.boat ? Adv.boatSpeed() : 1))} 分钟</span><span>👾 Lv.${r.lv[0]}–${r.lv[1]}</span>`;
          act = `<button class="btn sm primary" data-act="sail" data-id="${pl}" ${Adv.canSail(r) ? 'disabled' : ''}>⛵ 起航</button>`;
        }
        h += `<div class="place ${reached ? 'reached' : ''}"><div class="pi">${reached || S.addr.includes(pl) ? P.icon : '❔'}</div><div class="bd"><div class="nm">${reached || S.addr.includes(pl) ? P.name : '？？？'}</div><div class="req">${body}</div></div><div class="act">${act}</div></div>`;
        if (i < order.length - 1) h += '<div class="link">┊</div>';
      });
      return [h + '</div>', '<span class="info">补给从本地仓库、船舱、背包里挑最便宜的鱼。去过的地方可以短途航行往返。每个地点的仓库是分开的——要运东西就装上船舱。</span>'];
    }
    if (p.tab === 'dungeon') {
      let h = '<div class="dlist">';
      for (const d of DUNGEONS) {
        const open = Adv.dungeonOpen(d), reachedR = Adv.reached(d.region), hiddenLocked = d.hidden && !d.unlock(S);
        const why = hiddenLocked ? d.hint : !reachedR ? `需要先到达${PLACES[d.region].name}` : S.boat < 1 ? '需要一条船才能上岛' : '';
        const show = !hiddenLocked && reachedR;
        const boss = MONSTERS[d.boss];
        h += `<div class="dcard ${d.hidden ? 'hid' : ''} ${show ? '' : 'locked'}"><div class="dimg">${show ? `<img src="${spriteURL(d.boss, 3)}">` : '<span>？</span>'}</div><div class="bd">
          <div class="nm">${show ? d.name : (d.hidden ? '？？？（隐藏副本）' : '？？？')}${d.hidden && show ? ' <span class="rbadge r-legendary">隐藏</span>' : ''}</div>
          <div class="ds">${show ? d.desc : why}</div>
          ${show ? `<div class="st">📍${PLACES[d.region].name} · ${d.floors} 层 · 推荐 Lv.${d.bossLv} · Boss：${boss.name}${S.cleared[d.id] ? ` · 🏆 ×${S.cleared[d.id]}` : ''}</div>` : ''}</div>
          <div class="act">${open ? `<button class="btn sm primary" data-act="enter" data-id="${d.id}" ${S.mode === 'fish' ? '' : 'disabled'}>进入</button>` : (show ? `<span class="muted2">${why}</span>` : '')}</div></div>`;
      }
      return [h + '</div>', '<span class="info">每层开头会遇到岔路：危险的路怪物更强，但宝箱更多、经验更高。</span>'];
    }
    const mhp = Adv.maxBoatHp(), rc = Adv.repairCost();
    let h = S.boat ? `<div class="dock-hp"><b>${BOATS[S.boat].name}</b> 耐久 ${Math.round(S.boatHp)}/${mhp}<div class="pbar"><div style="width:${S.boatHp / mhp * 100}%"></div></div><span>船舱 ${S.hold.length}/${Adv.holdCap()}</span><button class="btn sm primary" data-act="repair" ${rc && S.coins >= rc && S.mode === 'fish' ? '' : 'disabled'}>🔧 修理（🪙${fmtFull(rc)}）</button></div>` : '';
    h += '<div class="section-title">船</div><div class="shop-list">';
    for (const b of BOATS.slice(1)) {
      const own = S.boat >= b.tier, canBuy = S.boat === b.tier - 1;
      h += `<div class="scard"><span class="gframe">${gi(b.gi, '#5d8fb8', '34px')}</span><div class="bd"><div class="nm">${b.name}</div><div class="ds">${b.desc}</div><div class="st">基础航速 ×${b.speed}</div></div>
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

  p_loot(p) {
    const d = p.data;
    AdvUI._tipGear = {};
    const row = l => {
      if (l.type === 'coins') return `<div class="loot"><span class="li">${gi('coin', '#ffc93c', '28px')}</span><b>${fmtFull(l.n)} 金币</b></div>`;
      if (l.type === 'gear') { AdvUI._tipGear[l.g.uid] = l.g; return `<div class="loot" data-tip="${l.g.uid}"><span class="li">${gearIconHTML(l.g, '30px')}</span><b style="color:${gearColor(l.g)}">${gearName(l.g)}</b><small>${GEAR_SLOTS[l.g.slot]} · ${statText(gearStats(l.g))}${l.kept === false ? ' · 装备栏满，已卖出' : ''}</small></div>`; }
      if (l.type === 'bait') { const b = findById(BAITS, l.id); return `<div class="loot"><span class="li">${b.icon}</span><b>${b.name} ×${l.n}</b></div>`; }
      if (l.type === 'item') { const it = ITEM_BY_ID[l.id]; return `<div class="loot"><span class="li">${it.icon}</span><b>${it.name} ×${l.n}</b></div>`; }
      if (l.type === 'treasure') { const t = FISH_BY_ID[l.id]; return `<div class="loot"><span class="li">${gi(t.gi, t.color || '#d9a441', '28px')}</span><b>${t.name} ×${l.n}</b></div>`; }
      return '';
    };
    const h = `<div class="loot-box"><div class="loot-title">${d.title}</div>${d.list.map(row).join('')}</div>`;
    return [h, '<span class="info"></span><button class="btn primary" data-act="close">收下</button>'];
  },
});
