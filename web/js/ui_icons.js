// ===== 把鱼具、鱼饵、道具的图标换成 game-icons.net 的图标 =====
'use strict';
(function () {
  const rodColor = { bamboo: '#8bc34a', carbon: '#78909c', alloy: '#b0bec5', gold: '#ffc107', star: '#b388ff' };
  RODS.forEach(r => { r.icon = gi('rod', rodColor[r.id], '1.15em'); });
  const lineColor = { basic: '#cfd8dc', nylon: '#81d4fa', titanium: '#b0bec5', silk: '#f8bbd0' };
  LINES.forEach(l => { l.icon = gi('line', lineColor[l.id], '1.15em'); });
  const bait = { dough: ['sushi', '#ffe0b2'], worm: ['worm', '#e57373'], shrimp: ['shrimp', '#ff8a65'], lure: ['lure', '#4fc3f7'], catnip: ['sprout', '#81c784'] };
  BAITS.forEach(b => { b.icon = gi(bait[b.id][0], bait[b.id][1], '1.15em'); });
  const item = { luckbell: ['bell', '#ffd54f'], raincharm: ['umbrella', '#64b5f6'], sundoll: ['sun', '#ffb74d'], fogbottle: ['fog', '#b0bec5'],
    glowfloat: ['lantern', '#ff8a65'], autostore: ['box', '#c8a165'], luckycat: ['luckycat', '#ffca28'] };
  ITEMS.forEach(i => { i.icon = gi(item[i.id][0], item[i.id][1], '1.15em'); });
  UPGRADES.bag.icon = gi('bag', '#c8a165', '1.15em');
  UPGRADES.wh.icon = gi('warehouse', '#a1887f', '1.15em');
})();
