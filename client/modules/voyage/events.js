// ===== 航海 · 海上事件 =====
'use strict';

[
  { id: 'storm', where: 'voyage', w: 10, icon: 'storm', color: '#90a4ae', title: '暴风雨！', text: '乌云压了过来，前方的海面卷起了巨浪。',
    choices: [
      { t: '硬闯过去', fn: () => { Voyage.damageBoat(10); return `船剧烈摇晃（耐久 -10），小橘受了 ${hurt(0.18)} 点伤，但没有耽误航程。`; } },
      { t: '绕路', def: true, fn: () => { const v = Game.S.voyage; v.t = Math.max(0, v.t - 25); return '绕了一大圈，多花了一些时间。'; } },
    ] },
  { id: 'driftchest', where: 'voyage', w: 9, icon: 'chest', color: '#c08a4a', title: '漂流宝箱', text: '海面上漂着一个宝箱。看起来……有点可疑？',
    choices: [
      { t: '捞上来', def: true, fn: () => {
        if (Math.random() < 0.7) { const id = ['chest_wood', 'chest_silver', 'chest_gold'][Math.min(2, Math.floor(Game.progressTier() / 2))]; Game.S.treasure[id]++; return `捞到了一个${FISH_BY_ID[id].name}！`; }
        Events.fight('mimic', 2); return '宝箱张开了满是牙齿的大嘴！';
      } },
      { t: '不管它', fn: () => '宝箱慢慢漂远了。' },
    ] },
  { id: 'siren', where: 'voyage', w: 6, icon: 'siren', color: '#ce93d8', title: '海妖的歌声', text: '远处的礁石上传来了美妙的歌声……',
    choices: [
      { t: '侧耳倾听', fn: () => { const lv = Game.S.voyage.lv[1]; const e = lv * 25; Game.gainExp(e); return `你听得入了迷。经验 +${e}，但头好晕（HP -${hurt(0.25)}）`; } },
      { t: '捂住耳朵', def: true, fn: () => '泡泡在水桶里大声唱歌，盖过了海妖的声音。' },
    ] },
  { id: 'trade', where: 'voyage', w: 7, icon: 'ship', color: '#a1887f', title: '商船', text: '一艘商船和你并排航行。“要不要做笔交易？”',
    choices: [
      { t: '用 8 条鱼换 2 把钥匙', fn: () => { const S = Game.S; const fish = S.bag.filter(x => !FISH_BY_ID[x.id].treasure).sort((a, b) => a.value - b.value); if (fish.length < 8) return '背包里的鱼不够 8 条。'; const set = new Set(fish.slice(0, 8).map(x => x.uid)); S.bag = S.bag.filter(x => !set.has(x.uid)); S.treasure.key += 2; return '成交！获得钥匙 ×2。'; } },
      { t: ctx => `花 🪙${fmtFull(ctx.price)} 买宝箱`, fn: ctx => { if (!Game.pay(ctx.price)) return '金币不够。'; Game.S.treasure.chest_silver++; return '买到了一个白银宝箱！'; } },
      { t: '离开', def: true, fn: () => '商船挥挥手，驶远了。' },
    ], setup: ctx => { ctx.price = 1200 * Game.progressTier(); } },
  { id: 'whale', where: 'voyage', w: 6, icon: 'whale', color: '#7986cb', title: '鲸鱼同行', text: '一头鲸鱼游到了船边，好像想带你一程。',
    choices: [{ t: '跟着它！', def: true, fn: () => { const v = Game.S.voyage; v.boost = v.t + 60; return '接下来一段时间航速 +30%！'; } }] },
  { id: 'ghostship', where: 'voyage', w: 3, icon: 'ghost', spr: 'skelcat', color: '#80cbc4', title: '幽灵船', cond: S => S.voyage && S.voyage.lv[0] >= 10, text: '浓雾中出现了一艘破破烂烂的船，甲板上有骷髅在走动……',
    choices: [
      { t: '登船！', fn: () => { Events.fight('skelcat', 3, () => { Game.toast('在船长室里找到了一片【海盗地图碎片】！', 'good'); Treasure.gain('mapPiece', true); }); return '骷髅水手拔出了骨头刀！'; } },
      { t: '远离它', def: true, fn: () => '幽灵船消失在了雾里。' },
    ] },
  { id: 'island', where: 'voyage', w: 6, icon: 'island', color: '#aed581', title: '无名小岛', text: '航线旁边有一座地图上没有的小岛。',
    choices: [
      { t: '上岸看看', fn: () => {
        const r = Math.random(), t = Game.progressTier();
        if (r < 0.45) { const c = Math.round(rand(300, 900) * t); Game.addCoins(c); return `在椰子树下挖到了 🪙${c}！`; }
        if (r < 0.6) { Game.S.treasure.key++; return '在岩缝里找到了一把钥匙！'; }
        if (r < 0.7) { Game.S.mats.oldwood = (Game.S.mats.oldwood || 0) + 3; return '海滩上有一堆漂来的老船木（×3）！'; }
        if (r < 0.85) { const g = Hero.newGear(t, 1); Hero.addGear(g); return `捡到了【${gearName(g)}】！`; }
        return `踩到了一只螃蟹……HP -${hurt(0.1)}`;
      } },
      { t: '继续航行', def: true, fn: () => '小岛渐渐消失在身后。' },
    ] },

].forEach(e => CF.content.define('event', e.id, e));
