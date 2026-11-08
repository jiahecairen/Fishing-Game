// ===== 主线剧情 · 隐藏内容与引导 =====
// 隐藏副本的解锁条件写在这里（监听别的模块的事件）：
//   海盗湾：集齐 3 片海盗地图碎片
//   梦之湖：和墨和解（饶恕结局）+ 钓到过湖神金鲤
'use strict';

const Lore = {
  checkHidden() {
    const S = Game.S;
    if (!S || !S.treasure) return;
    if (!S.hiddenOpen.pirate && S.treasure.mapPiece >= 3) {
      S.treasure.mapPiece -= 3; S.hiddenOpen.pirate = true;
      Story.run('unlock_pirate');
    }
    if (!S.hiddenOpen.dream && S.story.ending === 'spare' && S.dex.lakegod) {
      S.hiddenOpen.dream = true;
      Story.run('unlock_dream');
    }
  },
};

CF.module({
  id: 'story',
  state: () => ({ hiddenOpen: {} }),
  shared: { flags: { paoFed: 0, letters: 0 } },
  migrate(S) {
    if (S.story.ending === undefined) S.story.ending = null;
    if (S.visited && S.visited.includes('abyss') && !S.unlockedScenes.includes('abyss')) S.unlockedScenes.push('abyss');
  },
  init() {
    CF.on('treasure:gain', e => { if (e.id && !e.quiet) Story.run('firstTreasure'); Lore.checkHidden(); });
    CF.on('fish:caught', e => { if (e.isNew && e.item.id === 'lakegod') setTimeout(() => Lore.checkHidden(), 0); });
    CF.on('battle:win', () => Lore.checkHidden());
    CF.on('dungeon:clear', () => Lore.checkHidden());
    CF.on('scene', id => { if (id === 'abyss' && Game.S.story.ending === 'spare') Story.run('abyssFish'); });
    CF.on('ready', d => {
      if (!d.hadSave) setTimeout(() => Game.toast('小猫会自动挂机钓鱼，看到「!」时点击可以完美收竿 🐾', 'good'), 600);
      setTimeout(() => Story.run('intro'), 400);
    });
    // 目标提示（主线后半）
    UI.goal(30, S => {
      if (!S.cleared || !S.unlockedScenes.includes('abyss')) return null;
      if (!S.cleared.abyss) return ['🌀 深渊之岛的「沉没王座」在等你', 'map', 'dungeon'];
      if (S.story.ending !== 'spare') return ['💭 再去一次沉没王座……也许可以做出不同的选择', 'map', 'dungeon'];
      return null;
    });
    UI.goal(50, S => S.story.ending === 'spare' && !S.hiddenOpen.dream ? ['✨ 雾夜里，去湖畔钓一条湖神金鲤', 'dex'] : null);
    UI.goal(99, S => [`🏆 图鉴 ${Object.keys(S.dex).length}/${FISH.length} · 隐藏装备 ${Object.keys(UNIQUES).filter(u => !UNIQUES[u].custom && Hero.ownsUnique(u)).length}/${Object.keys(UNIQUES).filter(u => !UNIQUES[u].custom).length}`, 'dex']);
  },
});
