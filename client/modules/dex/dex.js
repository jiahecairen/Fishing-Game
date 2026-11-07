// ===== 鱼类图鉴 =====
'use strict';

const Dex = {
  // 兑换地址需要的鱼：传说鱼和季节限定鱼不算
  need(scene) { return FISH.filter(f => f.scenes.includes(scene) && f.rarity !== 'legendary' && !f.seasons); },
  done(scene) { return this.need(scene).filter(f => Game.S.dex[f.id]).length; },
  complete(scene) { return this.done(scene) >= this.need(scene).length; },
};

CF.panel('dex', {
  title: '📖 鱼类图鉴',
  tabs: () => SCENES.map(s => [s.id, s.name]),
  render(p) {
    const S = Game.S;
    const list = FISH.filter(f => f.scenes.includes(p.tab));
    const got = list.filter(f => S.dex[f.id]).length;
    const locked = !S.unlockedScenes.includes(p.tab);
    let h = `<div style="display:flex;justify-content:space-between;font-size:14px"><b>${Game.sceneDef(p.tab).name}${locked ? '（未解锁）' : ''}</b><span>收集进度 ${got}/${list.length}</span></div>
      <div class="progress"><div style="width:${list.length ? got / list.length * 100 : 0}%"></div></div><div class="dex-list">`;
    const order = list.slice().sort((a, b) => RARITY_ORDER.indexOf(a.rarity) - RARITY_ORDER.indexOf(b.rarity));
    for (const f of order) {
      const d = S.dex[f.id];
      if (d) {
        h += `<div class="dex-card"><img src="${fishIcon(f.id)}"><div><div class="nm">${f.name} ${rbadge(f.rarity)}</div><div class="ds">${f.desc}</div>
          <div class="cond">🕐 ${condText(f)}</div><div class="rec">已钓 ${d.count} 条 · 最大 ${d.max}cm · 基础价 🪙${f.price}</div></div></div>`;
      } else {
        h += `<div class="dex-card unknown"><img src="${fishIcon(f.id, true)}"><div><div class="nm">??? ${rbadge(f.rarity)}</div><div class="ds">尚未发现</div>
          <div class="cond">🕐 ${condText(f)}</div></div></div>`;
      }
    }
    return [h + '</div>', `<span class="info">全图鉴 ${Object.keys(S.dex).length}/${FISH.length} · 首次钓到新鱼可获得双倍经验</span>`];
  },
});
UI.nav({ id: 'dex', label: '图鉴', icon: 'dex', order: 60, key: 'd', count: S => `${Object.keys(S.dex).length}/${FISH.length}` });
