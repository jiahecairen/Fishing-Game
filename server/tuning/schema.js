// ===== 可调参数清单 =====
// 后台「数值调整」页面就是按这张表生成的。
// 每一项的 def（默认值）必须和游戏代码里 CF.tune('键', 默认值) 的默认值一样。
// 加一个新参数：① 游戏代码里用 CF.tune('新键', 默认值) 读它；② 在下面对应的分组里加一行。
//   type: 'num' 数字 | 'pct' 概率（存 0~1，页面上显示成百分比）| 'mul' 倍率（1 = 原样）
'use strict';

module.exports = [
  {
    id: 'fish', name: '🎣 钓鱼',
    items: [
      { key: 'fish.biteBase', label: '鱼上钩的基准时间', type: 'num', def: 7, min: 0.5, max: 60, step: 0.5, unit: '秒', help: '实际等待时间 = 基准 × 鱼竿速度 × 鱼饵 × 天气 × 昼夜 × 随机(0.55~1.45)。调小鱼来得更快' },
      { key: 'fish.castTime', label: '抛竿动作时长', type: 'num', def: 1.1, min: 0.3, max: 5, step: 0.1, unit: '秒' },
      { key: 'fish.biteWindow', label: '咬钩后可以收竿的时间', type: 'num', def: 1.6, min: 0.5, max: 5, step: 0.1, unit: '秒', help: '手动钓鱼时，超过这个时间没收竿鱼就跑了' },
      { key: 'fish.reelTime', label: '收线时长', type: 'num', def: 1.3, min: 0.3, max: 5, step: 0.1, unit: '秒' },
      { key: 'fish.escapeMul', label: '跑鱼概率倍率', type: 'mul', def: 1, min: 0, max: 5, step: 0.05, help: '0 = 永远不跑鱼' },
      { key: 'fish.priceMul', label: '鱼的价值倍率', type: 'mul', def: 1, min: 0, max: 20, step: 0.1, help: '只影响之后钓到的鱼' },
      { key: 'fish.expMul', label: '钓鱼经验倍率', type: 'mul', def: 1, min: 0, max: 20, step: 0.1 },
    ],
  },
  {
    id: 'rarity', name: '🐟 鱼的稀有度权重',
    note: '每条鱼出现的权重 = 它的稀有度权重 × 鱼饵加成。看的是相对大小：把「稀有」从 16 调到 32，稀有鱼大约多一倍',
    items: [
      { key: 'rarity.junk', label: '杂物', type: 'num', def: 5, min: 0, max: 1000, step: 0.5 },
      { key: 'rarity.common', label: '普通', type: 'num', def: 100, min: 0, max: 1000, step: 1 },
      { key: 'rarity.rare', label: '稀有', type: 'num', def: 16, min: 0, max: 1000, step: 0.5 },
      { key: 'rarity.epic', label: '史诗', type: 'num', def: 3.5, min: 0, max: 1000, step: 0.1 },
      { key: 'rarity.legendary', label: '传说', type: 'num', def: 0.5, min: 0, max: 1000, step: 0.1 },
    ],
  },
  {
    id: 'treasure', name: '🗝️ 宝藏爆率',
    items: [
      { key: 'treasure.key', label: '每一竿钓到钥匙', type: 'pct', def: 0.01, min: 0, max: 1, step: 0.001 },
      { key: 'treasure.chest', label: '每一竿钓到宝箱', type: 'pct', def: 0.006, min: 0, max: 1, step: 0.001 },
      { key: 'treasure.map', label: '每一竿钓到藏宝图', type: 'pct', def: 0.002, min: 0, max: 1, step: 0.001 },
      { key: 'treasure.gear1', label: '木宝箱开出装备', type: 'pct', def: 0.45, min: 0, max: 1, step: 0.01 },
      { key: 'treasure.gear2', label: '银宝箱开出装备', type: 'pct', def: 0.65, min: 0, max: 1, step: 0.01 },
      { key: 'treasure.gear3', label: '金宝箱开出装备', type: 'pct', def: 0.85, min: 0, max: 1, step: 0.01 },
      { key: 'treasure.gear4', label: '通关宝箱开出装备', type: 'pct', def: 1, min: 0, max: 1, step: 0.01 },
      { key: 'treasure.coinMul', label: '宝箱金币倍率', type: 'mul', def: 1, min: 0, max: 50, step: 0.1 },
    ],
  },
  {
    id: 'battle', name: '⚔️ 战斗掉落',
    items: [
      { key: 'battle.gearDrop', label: '小怪掉装备', type: 'pct', def: 0.22, min: 0, max: 1, step: 0.01 },
      { key: 'battle.keyDrop', label: '小怪掉钥匙', type: 'pct', def: 0.04, min: 0, max: 1, step: 0.01 },
      { key: 'battle.uniqueMul', label: '隐藏装备掉率倍率', type: 'mul', def: 1, min: 0, max: 100, step: 0.5, help: '鼠王的奶酪王冠、将军的贝壳等怪物掉落的隐藏装备' },
      { key: 'battle.matMul', label: '素材掉率倍率', type: 'mul', def: 1, min: 0, max: 20, step: 0.1 },
      { key: 'battle.expMul', label: '战斗经验倍率', type: 'mul', def: 1, min: 0, max: 20, step: 0.1 },
      { key: 'battle.coinMul', label: '战斗金币倍率', type: 'mul', def: 1, min: 0, max: 20, step: 0.1 },
    ],
  },
  {
    id: 'gear', name: '🛡️ 装备品质',
    note: '随机装备的品质按权重抽（看相对大小）',
    items: [
      { key: 'quality.q1', label: '普通', type: 'num', def: 50, min: 0, max: 1000, step: 1 },
      { key: 'quality.q2', label: '精良', type: 'num', def: 30, min: 0, max: 1000, step: 1 },
      { key: 'quality.q3', label: '稀有', type: 'num', def: 14, min: 0, max: 1000, step: 1 },
      { key: 'quality.q4', label: '史诗', type: 'num', def: 5, min: 0, max: 1000, step: 0.5 },
      { key: 'quality.q5', label: '传说', type: 'num', def: 1, min: 0, max: 1000, step: 0.1 },
      { key: 'gear.statMul', label: '普通装备属性倍率', type: 'mul', def: 1, min: 0.1, max: 10, step: 0.05, help: '立刻影响所有玩家手里的普通装备（隐藏装备在「装备」页单独改）' },
    ],
  },
  {
    id: 'econ', name: '🪙 经济与其他',
    items: [
      { key: 'econ.startCoins', label: '新玩家初始金币', type: 'num', def: 300, min: 0, max: 100000000, step: 100 },
      { key: 'econ.sellMul', label: '卖鱼价格倍率', type: 'mul', def: 1, min: 0, max: 20, step: 0.1 },
      { key: 'econ.offlineHours', label: '离线收益上限', type: 'num', def: 8, min: 0, max: 72, step: 1, unit: '小时' },
      { key: 'events.min', label: '突发事件最短间隔', type: 'num', def: 150, min: 10, max: 3600, step: 10, unit: '秒' },
      { key: 'events.max', label: '突发事件最长间隔', type: 'num', def: 300, min: 10, max: 3600, step: 10, unit: '秒' },
    ],
  },
];

// 隐藏装备可以有的特殊效果（游戏里已经实现的）
module.exports.EFFECTS = {
  '': { name: '无' },
  double: { name: '追加攻击', unit: '%', hint: '几率' },
  apStart: { name: '开场行动点', unit: '点' },
  regen: { name: '每回合回血', unit: '%' },
  gold: { name: '战斗金币加成', unit: '%' },
  thorns: { name: '反弹伤害', unit: '%' },
  freeze: { name: '冻结敌人', unit: '%', hint: '几率' },
  rage: { name: '残血增伤', unit: '%' },
  lifesteal: { name: '吸血', unit: '%' },
  treasure: { name: '宝藏概率', unit: '%' },
  dodge: { name: '闪避', unit: '%', hint: '几率' },
  critDmg: { name: '暴击伤害', unit: '%' },
};
