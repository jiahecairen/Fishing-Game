// ===== 航海 · 数据：船、船只改造、航线、地点 =====
'use strict';

// ---------- 船 ----------
const BOATS = [
  { tier: 0, name: '没有船', gi: 'lock', price: 0 },
  { tier: 1, name: '小木船', gi: 'boat1', price: 2000, desc: '能在湖和河里航行。', speed: 1, hp: 100, holdBase: 10 },
  { tier: 2, name: '帆船', gi: 'boat2', price: 12000, desc: '能出海，挡得住海浪。', speed: 1.15, hp: 160, holdBase: 20 },
  { tier: 3, name: '破冰船', gi: 'boat3', price: 50000, desc: '能撞开冰层，驶向世界尽头。', speed: 1.3, hp: 240, holdBase: 35 },
];
const BOAT_UPS = {
  sail: { name: '风帆改良', gi: 'sail', max: 5, desc: lv => `航速 +${lv * 12}%`, cost: lv => Math.round(1500 * Math.pow(lv + 1, 1.9) / 10) * 10 },
  hold: { name: '扩建船舱', gi: 'crate', max: 5, desc: lv => `船舱 +${lv * 10} 格`, cost: lv => Math.round(2500 * Math.pow(lv + 1, 1.9) / 10) * 10 },
  hull: { name: '加固船体', gi: 'anchor', max: 4, desc: lv => `耐久上限 +${lv * 40}，事件伤害 -${lv * 15}%`, cost: lv => Math.round(3000 * Math.pow(lv + 1, 1.9) / 10) * 10 },
};

// ---------- 航线：去新地方（要先用图鉴换地址）----------
// 新钓点想接进航海图：CF.content.define('route', 'diving_spot', { from, to, boat, fish, dur, lv, mons }) 并在 PLACES 里加名字
const ROUTES = [];
CF.content.type('route', { list: ROUTES });
[
  { from: 'lake', to: 'river', boat: 1, fish: 30, dur: 240, lv: [4, 7], mons: ['gull', 'frog', 'snake'] },
  { from: 'river', to: 'bamboo', boat: 1, fish: 40, dur: 300, lv: [8, 12], mons: ['frog', 'snake', 'gull'] },
  { from: 'river', to: 'sea', boat: 2, fish: 50, dur: 360, lv: [10, 14], mons: ['gull', 'snake', 'shark', 'pirate'] },
  { from: 'sea', to: 'coral', boat: 2, fish: 60, dur: 420, lv: [16, 21], mons: ['shark', 'pirate', 'squidm'] },
  { from: 'sea', to: 'ice', boat: 3, fish: 80, dur: 480, lv: [18, 24], mons: ['pirate', 'shark', 'squidm', 'seal'] },
  { from: 'ice', to: 'abyss', boat: 3, fish: 120, dur: 600, lv: [28, 34], mons: ['seal', 'squidm', 'serpent'] },
].forEach(r => CF.content.define('route', r.to, r));
const PLACES = {
  lake: { name: '宁静湖畔', icon: '🌲' }, river: { name: '溪谷急流', icon: '⛰️' }, bamboo: { name: '竹林幽潭', icon: '🎋' }, sea: { name: '落日海湾', icon: '🌅' },
  coral: { name: '珊瑚礁', icon: '🐠' }, ice: { name: '冰封雪湖', icon: '🏔️' }, abyss: { name: '深渊之岛', icon: '🌀' },
};
const PLACE_ORDER = ['lake', 'river', 'bamboo', 'sea', 'coral', 'ice', 'abyss'];
// 寻宝 / 摆渡时会遇到的怪物
const HUNT_MONS = { lake: ['frog', 'gull'], river: ['snake', 'gull'], bamboo: ['snake', 'frog'], sea: ['shark', 'pirate'], coral: ['shark', 'pirate'], ice: ['seal', 'squidm'], abyss: ['serpent', 'squidm'] };
const REPAIR_PER_HP = 6;     // 每点耐久的修理费 × 船的等级
const FERRY_TIME = 60;       // 去已经到过的地方：短途航行
