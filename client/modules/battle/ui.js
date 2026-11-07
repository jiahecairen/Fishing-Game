// ===== 战斗 · 界面：战斗窗口、手动菜单、出发前选择战斗方式 =====
// 其他模块出发前想问「自动还是手动」：BattleUI.choose('进入 xx 副本', mode => { ... })
'use strict';

const BattleUI = {
  init() {
    document.body.insertAdjacentHTML('beforeend', `
<div id="battle" class="hidden">
  <div class="b-screen">
    <canvas id="b-canvas"></canvas>
    <div class="b-box foe"><div class="bb-name"><span id="b-name"></span><span id="b-lv"></span></div><div class="bb-hp"><i>HP</i><div class="hpbar"><div id="b-fhp"></div></div></div><div class="bb-num" id="b-fhpt"></div><div class="b-status" id="b-status"></div></div>
    <div class="b-box hero"><div class="bb-name"><span>小橘</span><span id="b-hlv"></span></div><div class="bb-hp"><i>HP</i><div class="hpbar"><div id="b-hhp"></div></div></div><div class="bb-num" id="b-hpt"></div><div class="ap" id="b-ap"></div></div>
  </div>
  <div class="b-bottom"><div id="b-log"></div><div id="b-menu" class="hidden"></div></div>
  <div class="b-btns"><span id="b-speed"></span><span id="b-mode"></span><button data-flee>撤退</button></div>
</div>`);
    // 战斗进行时隐藏突发事件卡片（它会挡住菜单）
    BattleFX.init();
    $('#battle').addEventListener('click', e => {
      const b = e.target.closest('button'); if (!b) return;
      if (b.dataset.bs) { Game.S.settings.battleSpeed = +b.dataset.bs; this.render(); }
      if (b.dataset.flee !== undefined) this.flee(b);
    });
    $('#b-menu').addEventListener('click', e => {
      const b = e.target.closest('button'); if (!b || b.disabled) return;
      const B = Battle.battle; if (!B || !B.await) return;
      Sound.click();
      if (b.dataset.sk) Battle.heroAct({ type: 'skill', id: b.dataset.sk });
      else if (b.dataset.eat !== undefined) this.showMenu(B, 'food');
      else if (b.dataset.back !== undefined) this.showMenu(B);
      else if (b.dataset.food !== undefined) Battle.heroAct({ type: 'eat', food: $('#b-menu')._foods[+b.dataset.food] });
      else if (b.dataset.auto !== undefined) { Battle.heroAct({ type: 'auto' }); this.render(); }
      if (!Battle.battle || !Battle.battle.await) $('#b-menu').classList.add('hidden');
    });
    document.addEventListener('keydown', e => {
      const B = Battle.battle; if (!B || !B.await || Story.active) return;
      const n = +e.key; if (!n) return;
      const btn = $('#b-menu').querySelectorAll('button')[n - 1]; if (btn) btn.click();
    });

    Game.on('battleStart', () => { this.render(); Sound.tone(220, 0.15, 'square', 0.08); Sound.tone(330, 0.2, 'square', 0.08, null, 0.12); });
    Game.on('battleLog', B => this.onLog(B));
    Game.on('battleAwait', B => { this.updateBars(B); this.log(B); this.showMenu(B); Sound.tone(880, 0.06, 'square', 0.05); });
    Game.on('battleEnd', B => { setTimeout(() => { if (!Battle.battle) $('#battle').classList.add('hidden'); }, 50); if (B && B.result === 'win') Sound.levelup(); });

    CF.hook('hero.sections', () => {
      const known = Hero.skills();
      const skl = Object.entries(SKILLS).map(([k, K]) => `<div class="skill ${known.includes(k) ? '' : 'locked'}"><b>${K.name}</b> <span>${K.ap ? `⚡${K.ap}` : '免费'}</span><small>${skillDesc(K)}${known.includes(k) ? '' : ' · 天赋解锁'}</small></div>`).join('');
      return `<div class="section-title" style="margin-top:14px">技能（行动点每回合 +1，上限 10）</div><div class="skills">${skl}</div>`;
    });
    const sw = (key, on) => `<label class="switch"><input type="checkbox" data-act="setting" data-key="${key}" ${on ? 'checked' : ''}><span class="slider"></span></label>`;
    UI.setting(20, S => `<div class="set-row"><div>战斗中自动吃东西<small>HP 低于 35% 时，自动吃料理或背包里的鱼回血（鳗鱼、鱿鱼、小龙虾等还会额外 +2 行动点）</small></div>${sw('autoEat', S.settings.autoEat)}</div>
      <div class="set-row"><div>默认战斗方式<small>进入副本、出航前会让你选择；这里是默认值（码头上的突发战斗也用它）</small></div><div class="qty">${[['auto', '自动'], ['boss', 'Boss 手动'], ['manual', '纯手动']].map(([v, n]) => `<button class="btn sm ${S.settings.battleMode === v ? 'primary' : ''}" data-act="bmodeset" data-v="${v}">${n}</button>`).join('')}</div></div>
      <div class="set-row"><div>战斗速度</div><div class="qty">${[1, 2, 4].map(v => `<button class="btn sm ${S.settings.battleSpeed === v ? 'primary' : ''}" data-act="bspeed" data-v="${v}">×${v}</button>`).join('')}</div></div>`);
    UI.actions({
      bmodeset(ds) { Game.S.settings.battleMode = ds.v; Game.changed(); },
      bspeed(ds) { Game.S.settings.battleSpeed = +ds.v; Game.changed(); },
      bmgo(ds) { const d = this.panel.data; Game.S.settings.battleMode = ds.v; this.close(); d.go(ds.v); },
    });
    CF.panel('bmode', {
      title: '⚔️ 选择战斗方式', compact: false,
      render(p) {
        const d = p.data, S = Game.S;
        const opt = (m, t, ds) => `<button class="bmode ${S.settings.battleMode === m ? 'on' : ''}" data-act="bmgo" data-v="${m}"><b>${t}</b><small>${ds}</small></button>`;
        return [`<div class="bm-wrap"><div class="ds">${d.title}</div>
          ${opt('auto', '🤖 全自动', '小橘自己决定用什么技能、什么时候吃东西（默认）')}
          ${opt('boss', '👑 Boss 战手动', '普通战斗自动，遇到 Boss 时由你来选技能')}
          ${opt('manual', '🎮 纯手动', '每一回合都由你来选择技能和道具')}
          <div class="fnote">离线时一律自动战斗。战斗中也可以随时点「自动」接管这一场。</div></div>`, ''];
      },
    });
  },
  choose(title, go) { UI.open('bmode', null, { title, go }); },
  flee(b) {
    const B = Battle.battle;
    if (B && B.ctx.where === 'event') { Battle.cancel(); Game.toast('溜走了……', 'warn'); return; }
    UI.confirm(b, () => { const m = CF.modes.cur(); if (m.retreat) m.retreat(); else Battle.cancel(); });
  },
  log(B) { $('#b-log').innerHTML = B.log.slice(-3).map(l => `<div>${l}</div>`).join(''); },
  render() {
    const B = Battle.battle; if (!B) return;
    $('#battle').classList.remove('hidden');
    $('#b-name').textContent = B.foe.name;
    $('#b-lv').textContent = `Lv${B.foe.lv}${B.foe.boss ? ' 👑' : ''}`;
    this.updateBars(B);
    const sp = Game.S.settings.battleSpeed;
    $('#b-speed').innerHTML = [1, 2, 4, 8].map(v => `<button data-bs="${v}" class="${sp === v ? 'on' : ''}">×${v}</button>`).join('');
    $('#b-mode').textContent = { auto: '🤖 自动', boss: '👑 Boss 手动', manual: '🎮 手动' }[Battle.mode(B)] + (B.forceAuto ? '（已接管）' : '');
    this.log(B);
    $('#battle [data-flee]').textContent = B.ctx.where === 'event' ? '逃跑' : '撤退';
    $('#b-menu').classList.add('hidden');
  },
  updateBars(B) {
    const st = Hero.stats(), H = Game.S.hero;
    const bar = (el, k) => { el.style.width = (k * 100) + '%'; el.style.background = k > 0.5 ? '#3fd47a' : k > 0.2 ? '#f3c63a' : '#ff5050'; };
    bar($('#b-fhp'), B.foe.hp / B.foe.maxHp);
    $('#b-fhpt').textContent = `${Math.ceil(B.foe.hp)}/${B.foe.maxHp}`;
    bar($('#b-hhp'), H.hp / st.maxHp);
    $('#b-hlv').textContent = `Lv${Game.S.level}`;
    $('#b-hpt').textContent = `${Math.ceil(H.hp)}/${st.maxHp}`;
    $('#b-ap').innerHTML = '<span>AP</span>' + Array.from({ length: st.apMax }, (_, i) => `<i class="${i < B.ap ? 'on' : ''}"></i>`).join('');
    const tags = [];
    if (B.guard) tags.push('🛡炸毛×' + B.guard);
    if (B.freeze) tags.push('❄冻结');
    tags.push(...CF.call('battle.tags', B).filter(Boolean));
    $('#b-status').textContent = tags.join(' ');
  },
  onLog(B) {
    if (!B) return;
    this.log(B);
    $('#b-menu').classList.add('hidden');
    this.updateBars(B);
    const fx = B.fx;
    if (fx && fx.kind === 'hit') {
      if (fx.who === 'foe') Sound.tone(fx.crit ? 180 : 260, 0.08, 'square', 0.07, 90);
      else { Sound.noise(0.12, 0.12, 600); if (typeof Renderer !== 'undefined') Renderer.flash = fx.big ? 0.2 : 0.06; }
    } else if (fx && fx.kind === 'heal') Sound.tone(660, 0.15, 'triangle', 0.08, 990);
    const M = MONSTERS[B.foe.id];
    if (B.pause === 'mercy' && !B.mercyShown) { B.mercyShown = true; Story.play(M.mercy.story, c => Battle.mercyChoice(c || 'fight')); }
  },
  showMenu(B, sub) {
    const st = Hero.stats(), m = $('#b-menu'), known = Hero.skills();
    if (sub === 'food') {
      const foods = Battle.foods();
      m.innerHTML = `<div class="bm-title">吃什么？</div><div class="bm-grid">${foods.slice(0, 8).map((f, i) => `<button data-food="${i}">${f.kind === 'dish' ? '🍱' : '🐟'} ${f.name} ×${f.n}<small>HP+${Math.round(f.heal * 100)}%${f.ap ? ` AP+${f.ap}` : ''}</small></button>`).join('') || '<div class="muted">什么吃的都没有……</div>'}<button data-back>↩ 返回</button></div>`;
      m._foods = foods;
    } else {
      m.innerHTML = `<div class="bm-title">小橘要做什么？ <small>行动点 ${B.ap}/${st.apMax}</small></div><div class="bm-grid">${Object.entries(SKILLS).filter(([k]) => known.includes(k)).map(([k, K], i) => `<button data-sk="${k}" ${B.ap >= K.ap ? '' : 'disabled'}><b>${i + 1}. ${K.name}</b><small>${K.ap ? `⚡${K.ap}` : '免费'} · ${skillDesc(K)}</small></button>`).join('')}
        <button data-eat><b>🍙 吃东西</b><small>回血，不消耗行动点</small></button><button data-auto><b>🤖 自动</b><small>这场交给小橘</small></button></div>`;
    }
    m.classList.remove('hidden');
  },
};

CF.module({ id: 'battle', init: () => BattleUI.init(), frame: dt => BattleFX.frame(dt) });
