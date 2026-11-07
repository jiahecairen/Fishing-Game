// ===== 钓鱼 · 界面：抛竿按钮、状态、最近渔获、渔获弹窗 =====
'use strict';

const rbadge = r => `<span class="rbadge r-${r}">${RARITY[r].name}</span>`;
function condText(f) {
  const parts = [];
  parts.push(f.times ? f.times.map(t => PHASES[t].name).join('/') : '全天');
  parts.push(f.weathers ? f.weathers.map(w => WEATHERS[w].name).join('/') : '任意天气');
  if (f.seasons) parts.push(f.seasons.map(s => SEASONS.find(x => x.id === s).name).join('/') + '季限定');
  if ((f.tier || 1) > 1) parts.push(`需${RODS[f.tier - 1].name}+`);
  return parts.join(' · ');
}

const FishingUI = {
  logItems: [],
  init() {
    // 把图标换成 game-icons.net 的
    const rodColor = { bamboo: '#8bc34a', carbon: '#78909c', alloy: '#b0bec5', gold: '#ffc107', star: '#b388ff' };
    RODS.forEach(r => { r.icon = gi('rod', rodColor[r.id] || '#ccc', '1.15em'); });
    const lineColor = { basic: '#cfd8dc', nylon: '#81d4fa', titanium: '#b0bec5', silk: '#f8bbd0' };
    LINES.forEach(l => { l.icon = gi('line', lineColor[l.id] || '#ccc', '1.15em'); });
    const bait = { dough: ['sushi', '#ffe0b2'], worm: ['worm', '#e57373'], shrimp: ['shrimp', '#ff8a65'], lure: ['lure', '#4fc3f7'], catnip: ['sprout', '#81c784'] };
    BAITS.forEach(b => { if (bait[b.id]) b.icon = gi(bait[b.id][0], bait[b.id][1], '1.15em'); });
    const item = { luckbell: ['bell', '#ffd54f'], raincharm: ['umbrella', '#64b5f6'], sundoll: ['sun', '#ffb74d'], fogbottle: ['fog', '#b0bec5'],
      glowfloat: ['lantern', '#ff8a65'], autostore: ['box', '#c8a165'], luckycat: ['luckycat', '#ffca28'] };
    ITEMS.forEach(i => { if (item[i.id]) i.icon = gi(item[i.id][0], item[i.id][1], '1.15em'); });

    // 插入自己的 HUD
    const hb = $('#hud-bottom');
    hb.insertAdjacentHTML('afterbegin', `
      <div id="log" class="panel-glass"><div class="log-title">最近渔获</div><ul id="log-list"><li class="muted">还没有钓到鱼～</li></ul></div>
      <div id="center-ctl">
        <div id="status" class="panel-glass">准备抛竿…</div>
        <div class="ctl-row">
          <button id="main-btn" class="big-btn">抛竿</button>
          <label class="switch" title="开启后小猫会自动抛竿和收竿，离线也会继续钓鱼">
            <input type="checkbox" id="auto-toggle" checked><span class="slider"></span><span class="lbl">自动挂机</span>
          </label>
        </div>
        <div id="equip" class="panel-glass"></div>
      </div>`);
    $('#main-btn').addEventListener('click', e => { e.stopPropagation(); Sound.unlock(); Fishing.action(); });
    $('#auto-toggle').addEventListener('change', e => { Game.S.settings.auto = e.target.checked; Game.toast(e.target.checked ? '自动挂机已开启' : '已切换为手动钓鱼'); Game.changed(); });
    $('#equip').addEventListener('click', e => { const b = e.target.closest('button'); if (b) UI.open('bag', b.dataset.tab); });

    Game.on('cast', () => setTimeout(() => Sound.plop(), 800));
    Game.on('bite', () => Sound.bite());
    Game.on('catch', d => { this.showCatch(d); this.addLog(d); });
    Game.on('escape', d => this.showEscape(d));

    UI.buff(S => Fishing.luckBuffLeft() > 0 ? `<div class="pill buff">🔔 幸运+30% · ${dur(Fishing.luckBuffLeft())}</div>` : '');
    UI.buff(S => S.perms.glowfloat && Game.phase() === 'night' ? '<div class="pill buff">🏮 夜光浮漂生效中</div>' : '');
    UI.loot('bait', l => { const b = findById(BAITS, l.id); return `<div class="loot"><span class="li">${b.icon}</span><b>${b.name} ×${l.n}</b></div>`; });
    UI.loot('item', l => { const it = ITEM_BY_ID[l.id]; return `<div class="loot"><span class="li">${it.icon}</span><b>${it.name} ×${l.n}</b></div>`; });
    UI.offline(40, r => this.offlineHtml(r));
    const sw = (key, on, disabled) => `<label class="switch"><input type="checkbox" data-act="setting" data-key="${key}" ${on ? 'checked' : ''} ${disabled ? 'disabled' : ''}><span class="slider"></span></label>`;
    UI.setting(10, S => `<div class="set-row"><div>自动挂机<small>小猫自动抛竿收竿；关闭游戏后也会按离线时间结算（最多 8 小时）</small></div>${sw('auto', S.settings.auto)}</div>
      <div class="set-row"><div>招财猫：满仓自动处理<small>${S.perms.luckycat ? (CF.first('fish.overflowDesc') || '背包和仓库都满时，招财猫把普通鱼和杂物放生') : '需要在商店购买「招财猫」解锁'}</small></div>${sw('autoSell', S.settings.autoSell, !S.perms.luckycat)}</div>`);
  },
  reset() { this.logItems = []; $('#log-list').innerHTML = '<li class="muted">还没有钓到鱼～</li>'; },

  // 每帧：状态文字、主按钮、鱼具栏
  frame() {
    const S = Game.S, f = Fishing.fsm, auto = S.settings.auto;
    let st = '', cls = '', btn = '抛竿', bcls = 'big-btn';
    switch (f.phase) {
      case 'idle':
        if (f.blocked) { st = '背包装满啦！去放生、挂卖或整理一下喵～'; cls = 'bad'; }
        else st = auto ? '准备抛竿…' : '点击「抛竿」或按空格开始钓鱼';
        break;
      case 'casting': st = '嗖——'; btn = '…'; bcls += ' calm'; break;
      case 'waiting': st = `等待鱼儿上钩…（${Fishing.bait().name}）`; btn = auto ? '挂机中' : '收线'; bcls += ' calm'; break;
      case 'bite': st = auto ? '有鱼上钩！点击可「完美收竿」' : '有鱼上钩了！快收竿！'; cls = 'alert'; btn = '收竿！'; bcls += ' bite'; break;
      case 'reeling': st = f.perfect ? '✨ 完美收竿！拉扯中…' : '拉扯中…'; btn = '…'; bcls += ' calm'; break;
      case 'result':
        if (f.escaped) { st = f.missed ? '没来得及收竿，鱼跑了…' : '可恶，鱼挣脱了！'; cls = 'bad'; }
        else st = `钓到了 ${FISH_BY_ID[f.item.id].name}！`;
        btn = auto ? '挂机中' : '抛竿'; bcls += auto ? ' calm' : '';
        break;
    }
    UI.set('status', st);
    UI.set('status', 'panel-glass ' + cls, 'class');
    UI.set('main-btn', btn);
    UI.set('main-btn', bcls, 'class');
    const at = $('#auto-toggle'); if (at.checked !== auto) at.checked = auto;
    const b = Fishing.bait(), cnt = b.infinite ? '∞' : (S.baits[b.id] || 0);
    UI.set('equip', `<button data-tab="gear" title="鱼竿">${Fishing.rod().icon} ${Fishing.rod().name}</button>`
      + `<button data-tab="gear" title="鱼线">${Fishing.line().icon} ${Fishing.line().name}</button>`
      + `<button data-tab="items" title="鱼饵">${b.icon} ${b.name}<span class="cnt">×${cnt}</span></button>`, 'html');
  },

  pop(html, cls) {
    const el = document.createElement('div');
    el.className = 'pop ' + (cls || '');
    el.innerHTML = html;
    const box = $('#catch-pop'); box.innerHTML = ''; box.appendChild(el);
    setTimeout(() => el.remove(), 3200);
  },
  showCatch(d) {
    const { item, fish } = d;
    if (fish.treasure) {
      this.pop(`<img src="${fishIcon(fish.id)}"><div><div class="nm" style="color:${RARITY[fish.rarity].color}">${fish.name}<span class="tag perfect">宝藏</span></div><div class="sub">${fish.desc}</div></div>`, fish.rarity);
      Sound.catch('epic');
      return;
    }
    const where = d.stored === 'wh' ? ' · 已送入仓库' : d.stored === 'sold' ? ` · 招财猫卖掉了` : d.stored === 'listed' ? ' · 招财猫挂到了寄卖行' : d.stored === 'released' ? ' · 满了，已放生' : '';
    this.pop(`<img src="${fishIcon(fish.id)}"><div><div class="nm" style="color:${RARITY[fish.rarity].color}">${item.star ? '★' : ''}${fish.name}${d.isNew ? '<span class="tag new">新发现</span>' : ''}${d.perfect ? '<span class="tag perfect">完美</span>' : ''}</div>`
      + `<div class="sub">${RARITY[fish.rarity].name} · ${item.size} cm · 🪙${fmtFull(item.value)}${where}</div></div>`, fish.rarity);
    Sound.catch(fish.rarity);
  },
  showEscape(d) { this.pop(`<div class="sub" style="color:#ffcabb">💨 ${d.missed ? '没来得及收竿，鱼溜走了' : '鱼挣脱了鱼钩…'}</div>`, 'escape'); },
  addLog(d) {
    if (d.fish.treasure) return;
    this.logItems.unshift(d.item);
    this.logItems.length = Math.min(this.logItems.length, 6);
    $('#log-list').innerHTML = this.logItems.map(it => {
      const f = FISH_BY_ID[it.id];
      return `<li><img src="${fishIcon(f.id)}"><span style="color:${RARITY[f.rarity].color}">${it.star ? '★' : ''}${f.name}</span><span class="muted">${it.size}cm</span><span class="v">🪙${fmt(it.value)}</span></li>`;
    }).join('');
  },
  offlineHtml(r) {
    if (!r.fishing) return '';
    if (r.idleOff) return `<div style="margin-top:14px;color:var(--ink-muted)">自动挂机没有开启，小猫在码头睡了一觉～</div>`;
    let h = `<div class="stats"><div><b>${r.casts}</b>抛竿</div><div><b>${r.caught}</b>钓到</div><div><b>${r.escaped}</b>跑掉</div><div><b>${r.newFish.length}</b>新发现</div></div>`;
    if (r.best) { const f = FISH_BY_ID[r.best.id]; h += `<div>最佳渔获：<img src="${fishIcon(f.id)}" style="width:60px;vertical-align:middle"> <b style="color:${f.rarity === 'common' ? 'inherit' : RARITY[f.rarity].color}">${f.name}</b> ${r.best.size}cm 🪙${fmtFull(r.best.value)}</div>`; }
    if (r.newFish.length) h += `<div style="margin-top:8px">新发现：${r.newFish.map(id => FISH_BY_ID[id].name).join('、')}</div>`;
    if (r.levelTo > r.levelFrom) h += `<div style="margin-top:8px">升级到了 Lv.${r.levelTo}！</div>`;
    if (r.stopped) h += `<div class="hint" style="margin-top:14px">背包满了，小猫中途停了下来。购买「自动收纳盒」、扩容或「招财猫」可以挂机更久！</div>`;
    return h;
  },
};

CF.module({ id: 'fishing', init: () => { Renderer.init(); FishingUI.init(); }, frame: () => FishingUI.frame(), reset: () => FishingUI.reset() });
