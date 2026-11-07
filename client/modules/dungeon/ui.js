// ===== 副本 · 界面：副本列表（在航海图里）、探索状态条 =====
'use strict';

const DungeonUI = {
  bar() {
    const D = Game.S.dungeon; if (!D) return '';
    const def = Dungeon.def();
    const where = ['boss', 'bossTalk', 'bossWait'].includes(D.phase) ? '👑 最深处' : `第 ${D.floor}/${def.floors} 层 · 房间 ${Math.min(D.room + 1, ROOMS_PER_FLOOR)}/${ROOMS_PER_FLOOR}`;
    const path = { safe: '🛡️ 平稳', danger: '💀 危险', mystery: '❓ 神秘' }[D.path];
    return `<div class="ab-title">${gi(def.gi, '#ffe082', '20px')} ${def.name} · ${where} <span class="path">${path}</span></div>
      <div class="ab-sub">${D.phase === 'bossWait' ? '小橘站在 Boss 的门前……' : Battle.battle ? '⚔️ 战斗中' : Events.blocking() ? '❗ 发生了什么……' : (Dungeon.lastLog || '* 小橘小心翼翼地向前走。')}</div>
      <div class="ab-sub muted">本次收获：🪙${fmtFull(D.loot.coins)} · 经验 ${D.loot.exp} · 装备 ${D.loot.gear} 件${D.buff ? ' · 祭坛之力 攻击+25%' : ''}</div>`
      + Adventure.barRow('撤退');
  },
};

UI.tab('map', {
  id: 'dungeon', label: '🏰 副本', after: 'sail',
  render() {
    const S = Game.S;
    let h = '<div class="dlist">';
    for (const d of DUNGEONS) {
      const open = Dungeon.open(d), reachedR = Game.reached(d.region), hiddenLocked = d.hidden && !(d.unlock && d.unlock(S));
      const why = hiddenLocked ? d.hint : !reachedR ? `需要先到达${Voyage.place(d.region).name}` : S.boat < 1 ? '需要一条船才能上岛' : '';
      const show = !hiddenLocked && reachedR;
      const boss = MONSTERS[d.boss];
      h += `<div class="dcard ${d.hidden ? 'hid' : ''} ${show ? '' : 'locked'}"><div class="dimg">${show ? sprImg(d.boss, 3) : '<span>？</span>'}</div><div class="bd">
        <div class="nm">${show ? d.name : (d.hidden ? '？？？（隐藏副本）' : '？？？')}${d.hidden && show ? ' <span class="rbadge r-legendary">隐藏</span>' : ''}</div>
        <div class="ds">${show ? d.desc : why}</div>
        ${show ? `<div class="st">📍${Voyage.place(d.region).name} · ${d.floors} 层 · 推荐 Lv.${d.bossLv} · Boss：${boss.name}${S.cleared[d.id] ? ` · 🏆 ×${S.cleared[d.id]}` : ''}</div>` : ''}</div>
        <div class="act">${open ? `<button class="btn sm primary" data-act="enter" data-id="${d.id}" ${CF.modes.busy() ? 'disabled' : ''}>进入</button>` : (show ? `<span class="muted2">${why}</span>` : '')}</div></div>`;
    }
    return [h + '</div>', '<span class="info">每层开头会遇到岔路：危险的路怪物更强，但宝箱更多、经验更高。</span>'];
  },
});
UI.actions({ enter(ds) { BattleUI.choose(`进入「${Dungeon.def(ds.id).name}」`, m => Dungeon.enter(ds.id, m)); } });
