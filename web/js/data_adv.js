// ===== 冒险数据：宝藏、装备、属性、天赋、技能、怪物、航线、副本、剧情 =====
'use strict';

// ---------- 能钓到的宝藏（不计入图鉴） ----------
const TREASURES = [
  { id: 'key', name: '生锈的钥匙', treasure: true, rarity: 'rare', shape: 'key', c1: '#d9a441', c2: '#8a5a1a', gi: 'key', desc: '能打开一个宝箱。' },
  { id: 'chest_wood', name: '木制宝箱', treasure: true, rarity: 'rare', shape: 'chest', c1: '#9a6a3a', c2: '#d9b25a', tier: 1, gi: 'chest', color: '#c08a4a', desc: '湿漉漉的木箱，需要钥匙。' },
  { id: 'chest_silver', name: '白银宝箱', treasure: true, rarity: 'epic', shape: 'chest', c1: '#8fa3b5', c2: '#e6eef5', tier: 2, gi: 'chest', color: '#b8cde0', desc: '沉甸甸的银箱，需要钥匙。' },
  { id: 'chest_gold', name: '黄金宝箱', treasure: true, rarity: 'legendary', shape: 'chest', c1: '#d4a017', c2: '#fff1a8', tier: 3, gi: 'chest', color: '#ffc93c', desc: '闪闪发光！需要钥匙。' },
  { id: 'map', name: '藏宝图', treasure: true, rarity: 'epic', shape: 'scroll', c1: '#e8d3a0', c2: '#b5523b', gi: 'map', desc: '标记着附近海域的宝藏，需要船。' },
  { id: 'mapPiece', name: '海盗地图碎片', treasure: true, rarity: 'epic', shape: 'scroll', c1: '#c9b48a', c2: '#2b2b3a', gi: 'mapPiece', desc: '集齐 3 片，也许能拼出什么……' },
];
TREASURES.forEach(t => { FISH_BY_ID[t.id] = t; });
const SCENE_CHEST = { lake: 'chest_wood', river: 'chest_wood', sea: 'chest_silver', ice: 'chest_gold', abyss: 'chest_gold' };
const TREASURE_RATE = { key: 0.01, chest: 0.006, map: 0.002 };

// ---------- 吃鱼回复（部分鱼在战斗中额外回复行动点） ----------
const FOOD_PCT = { junk: 0, common: 0.12, rare: 0.25, epic: 0.45, legendary: 1 };
const AP_FISH = new Set(['eel', 'squid', 'lantern', 'ricefield', 'saury', 'smelt', 'icepike', 'lakegod', 'goldscale', 'aurora', 'crayfish', 'kingcrab', 'aeel', 'aangler', 'aheart']);
function foodValue(item) {
  const f = FISH_BY_ID[item.id];
  if (!f || f.treasure) return null;
  const pctv = FOOD_PCT[f.rarity];
  if (!pctv) return null;
  const k = 0.8 + 0.4 * ((item.size - f.min) / Math.max(1, f.max - f.min));
  const ok = typeof Adv !== 'undefined' && Adv.S && Adv.S.hero;
  const mult = ok ? 1 + Adv.talentVal('s3') : 1, maxHp = ok ? (Adv._maxHp || Adv.stats().maxHp) : 200;
  return { hp: Math.round((20 + maxHp * pctv) * k * mult), ap: AP_FISH.has(f.id) ? 2 : 0 };
}

// ---------- 船 ----------
const BOATS = [
  { tier: 0, name: '没有船', gi: 'lock', price: 0 },
  { tier: 1, name: '小木船', gi: 'boat1', price: 2000, desc: '能在湖和河里航行。', speed: 1 },
  { tier: 2, name: '帆船', gi: 'boat2', price: 12000, desc: '能出海，挡得住海浪。', speed: 1.15 },
  { tier: 3, name: '破冰船', gi: 'boat3', price: 50000, desc: '能撞开冰层，驶向世界尽头。', speed: 1.3 },
];
const BOAT_UPS = {
  sail: { name: '风帆改良', gi: 'sail', max: 5, desc: lv => `航速 +${lv * 12}%`, cost: lv => Math.round(1500 * Math.pow(lv + 1, 1.9) / 10) * 10 },
  hold: { name: '扩建货舱', gi: 'box', max: 3, desc: lv => `出航补给 -${lv * 10}%`, cost: lv => Math.round(3000 * Math.pow(lv + 1, 2) / 10) * 10 },
  hull: { name: '加固船体', gi: 'anchor', max: 3, desc: lv => `航行事件伤害 -${lv * 20}%`, cost: lv => Math.round(2500 * Math.pow(lv + 1, 2) / 10) * 10 },
};

// ---------- 角色基础属性（等级不再加属性，全靠装备、加点、天赋） ----------
const HERO_BASE = { maxHp: 100, atk: 10, def: 4, spd: 10, crit: 0.05, critDmg: 1.6, apStart: 2, apMax: 10 };
const ATTRS = {
  str: { name: '力量', gi: 'muscle', desc: '攻击 +1', apply: (s, n) => { s.atk += n * 1; } },
  vit: { name: '体质', gi: 'heart', desc: '生命 +8', apply: (s, n) => { s.maxHp += n * 8; } },
  tou: { name: '坚韧', gi: 'def', desc: '防御 +0.6', apply: (s, n) => { s.def += n * 0.6; } },
  agi: { name: '敏捷', gi: 'run', desc: '速度 +0.3、暴击 +0.25%', apply: (s, n) => { s.spd += n * 0.3; s.crit += n * 0.0025; } },
};
// 天赋：每 2 级获得 1 点天赋点
const TALENT_BRANCHES = [
  { id: 'f', name: '钓鱼', gi: 'rod', color: '#3aa0d8' },
  { id: 'c', name: '战斗', gi: 'atk', color: '#e0503a' },
  { id: 's', name: '生存', gi: 'def', color: '#3fae6a' },
];
const TALENTS = [
  { id: 'f1', br: 'f', name: '老练钓手', max: 3, req: 0, per: 0.06, desc: v => `上钩速度 +${pct(v)}` },
  { id: 'f2', br: 'f', name: '宝藏嗅觉', max: 3, req: 1, per: 0.2, desc: v => `钓到宝藏的概率 +${pct(v)}` },
  { id: 'f3', br: 'f', name: '鱼市行家', max: 3, req: 3, per: 0.06, desc: v => `卖鱼价格 +${pct(v)}` },
  { id: 'f4', br: 'f', name: '鱼之友', max: 3, req: 5, per: 0.1, desc: v => `稀有及以上鱼的概率 +${pct(v)}` },
  { id: 'c1', br: 'c', name: '锋利猫爪', max: 3, req: 0, per: 0.05, desc: v => `攻击 +${pct(v)}` },
  { id: 'c2', br: 'c', name: '鱼骨飞镖', max: 1, req: 1, per: 1, skill: 'bone', desc: () => '解锁技能「鱼骨飞镖」（2 点）' },
  { id: 'c3', br: 'c', name: '会心一击', max: 3, req: 2, per: 0.04, desc: v => `暴击率 +${pct(v)}，暴击伤害 +${pct(v * 2.5)}` },
  { id: 'c5', br: 'c', name: '战意', max: 2, req: 3, per: 1, desc: v => `战斗开始时行动点 +${v}` },
  { id: 'c4', br: 'c', name: '奶奶的横扫', max: 1, req: 5, per: 1, skill: 'sweep', desc: () => '解锁终极技能「奶奶的鱼竿·横扫」（5 点）' },
  { id: 's1', br: 's', name: '厚毛皮', max: 3, req: 0, per: 0.05, desc: v => `防御 +${pct(v)}，生命 +${pct(v * 0.8)}` },
  { id: 's2', br: 's', name: '喵喵治愈', max: 1, req: 1, per: 1, skill: 'heal', desc: () => '解锁技能「喵喵治愈」（2 点）' },
  { id: 's3', br: 's', name: '美食家', max: 3, req: 2, per: 0.2, desc: v => `吃鱼回复 +${pct(v)}` },
  { id: 's4', br: 's', name: '炸毛防御', max: 1, req: 3, per: 1, skill: 'guard', desc: () => '解锁技能「炸毛防御」（1 点）' },
  { id: 's5', br: 's', name: '九命猫', max: 1, req: 6, per: 1, desc: () => '每场战斗一次：受到致命伤害时保留 1 点生命' },
];
function pct(v) { return Math.round(v * 100) + '%'; }

// ---------- 技能（行动点上限 10，每回合 +1） ----------
const SKILLS = {
  punch: { name: '猫猫拳', ap: 0, hits: 1, mult: 1, text: '* 小橘挥出了猫猫拳！' },
  claw: { name: '连环猫爪', ap: 1, hits: 2, mult: 0.65, text: '* 小橘使出了连环猫爪！' },
  bone: { name: '鱼骨飞镖', ap: 2, hits: 1, mult: 1.8, text: '* 小橘扔出了鱼骨飞镖！' },
  heal: { name: '喵喵治愈', ap: 2, heal: 0.22, text: '* 小橘舔了舔毛。感觉好多了。' },
  guard: { name: '炸毛防御', ap: 1, guard: 2, text: '* 小橘全身的毛都炸了起来！（接下来 2 次受到的伤害减半）' },
  sweep: { name: '奶奶的鱼竿·横扫', ap: 5, hits: 1, mult: 3.6, text: '* 小橘挥动了奶奶的鱼竿！' },
};

// ---------- 装备 ----------
const GEAR_SLOTS = { weapon: '武器', hat: '头饰', armor: '护甲', boots: '靴子', charm: '饰品' };
const SLOT_ORDER = ['weapon', 'hat', 'armor', 'boots', 'charm'];
const GEAR_BASES = {
  weapon: ['小树枝', '铁鱼叉', '珊瑚之刃', '冰霜爪套', '深渊三叉戟'],
  hat: ['草编帽', '渔夫雨帽', '潜水头盔', '雪绒帽', '鲸骨王冠'],
  armor: ['草编背心', '皮革雨衣', '贝壳铠甲', '雪熊斗篷', '鲸骨战甲'],
  boots: ['草鞋', '胶皮雨靴', '珊瑚短靴', '雪地长靴', '深渊行者靴'],
  charm: ['铃铛项圈', '幸运鱼鳞', '珍珠项链', '极光吊坠', '星辰怀表'],
};
const SLOT_GI = { weapon: 'w', hat: 'h', armor: 'a', boots: 'b', charm: 'c' };
const QUALITY = [
  { id: 'q1', name: '普通', mult: 1.0, color: '#a39a86', w: 50 },
  { id: 'q2', name: '精良', mult: 1.2, color: '#4caf50', w: 30 },
  { id: 'q3', name: '稀有', mult: 1.45, color: '#2a9fd8', w: 14 },
  { id: 'q4', name: '史诗', mult: 1.75, color: '#a958c9', w: 5 },
  { id: 'q5', name: '传说', mult: 2.1, color: '#ff8f00', w: 1 },
];
const UNIQUE_COLOR = '#ff4f7b';
// 隐藏装备：数值固定，会随强化提升；效果见 effect
const UNIQUES = {
  u_rod:    { name: '奶奶的鱼竿', slot: 'weapon', tier: 5, stats: { atk: 100, crit: 0.08, luck: 0.1 }, effect: 'double', eff: 0.18, edesc: '18% 几率追加一次攻击', src: '梦之湖·花的回忆' },
  u_hat:    { name: '花的草帽', slot: 'hat', tier: 5, stats: { maxHp: 170, def: 22 }, effect: 'apStart', eff: 2, edesc: '战斗开始时行动点 +2', src: '梦之湖·花的回忆（再次通关）' },
  u_scale:  { name: '泡泡的鳞片', slot: 'charm', tier: 3, stats: { maxHp: 70, crit: 0.05, luck: 0.15 }, effect: 'regen', eff: 0.04, edesc: '每回合回复 4% 生命', src: '……泡泡好像有话想说' },
  u_cheese: { name: '鼠王的奶酪王冠', slot: 'hat', tier: 1, stats: { maxHp: 60, def: 6 }, effect: 'gold', eff: 0.3, edesc: '战斗获得的金币 +30%', src: '鼠王·芝士大人（低概率掉落）' },
  u_shell:  { name: '将军的贝壳', slot: 'armor', tier: 3, stats: { maxHp: 280, def: 30 }, effect: 'thorns', eff: 0.2, edesc: '受到攻击时反弹 20% 伤害', src: '螃蟹将军（低概率掉落）' },
  u_ice:    { name: '女王的冰晶', slot: 'charm', tier: 4, stats: { maxHp: 100, crit: 0.08 }, effect: 'freeze', eff: 0.15, edesc: '攻击有 15% 几率冻结敌人一回合', src: '冰晶女王（低概率掉落）' },
  u_tear:   { name: '墨之泪', slot: 'charm', tier: 5, stats: { maxHp: 160, crit: 0.1, luck: 0.25 }, effect: 'rage', eff: 0.4, edesc: '生命低于 40% 时伤害 +40%', src: '和墨做朋友' },
  u_blade:  { name: '独眼船长的弯刀', slot: 'weapon', tier: 4, stats: { atk: 72, crit: 0.1 }, effect: 'lifesteal', eff: 0.2, edesc: '造成伤害的 20% 转化为生命', src: '海盗湾·独眼喵的宝窟' },
  u_pirhat: { name: '海盗船长帽', slot: 'hat', tier: 4, stats: { maxHp: 130, def: 14, crit: 0.05 }, effect: 'treasure', eff: 0.3, edesc: '钓到宝藏的概率 +30%', src: '独眼船长（概率掉落）' },
  u_moon:   { name: '月光猫靴', slot: 'boots', tier: 4, stats: { spd: 18, def: 10 }, effect: 'dodge', eff: 0.12, edesc: '12% 几率闪避攻击', src: '对着流星许愿' },
  u_koi:    { name: '七彩锦鲤剑', slot: 'weapon', tier: 5, stats: { atk: 84, crit: 0.2 }, effect: 'critDmg', eff: 0.6, edesc: '暴击伤害 +60%', src: '锻造配方' },
};
const RECIPES = [
  { id: 'r_koi', out: 'u_koi', name: '七彩锦鲤剑', need: [['koi', 8], ['lakegod', 1]], coins: 50000, hint: '传说用八条锦鲤和湖神的祝福，可以打造出七彩的剑……' },
];
function enhMult(e) { return 1 + 0.15 * (e || 0); }
function gearStats(g) {
  const E = enhMult(g.e), s = {};
  if (g.u) {
    const U = UNIQUES[g.u];
    for (const [k, v] of Object.entries(U.stats)) s[k] = (k === 'crit' || k === 'luck') ? v : Math.round(v * E);
    return s;
  }
  const t = g.tier, m = QUALITY[g.q].mult;
  if (g.slot === 'weapon') { s.atk = Math.round((6 + 10 * Math.pow(t, 1.3)) * m * E); if (g.q >= 2) s.crit = 0.02 * (g.q - 1); }
  if (g.slot === 'hat') { s.maxHp = Math.round(25 * Math.pow(t, 1.4) * m * E); s.def = Math.round((1.5 + 2 * Math.pow(t, 1.3)) * m * E); }
  if (g.slot === 'armor') { s.maxHp = Math.round(45 * Math.pow(t, 1.4) * m * E); s.def = Math.round((3 + 4 * Math.pow(t, 1.3)) * m * E); }
  if (g.slot === 'boots') { s.spd = Math.round((2 + 1.6 * t) * m * E); s.def = Math.round((1 + 1.4 * Math.pow(t, 1.3)) * m * E); }
  if (g.slot === 'charm') { s.maxHp = Math.round(12 * Math.pow(t, 1.4) * m * E); s.crit = Math.round((0.01 + 0.012 * t) * m * 1000) / 1000; s.luck = Math.round(0.03 * t * m * 100) / 100; }
  return s;
}
function gearName(g) {
  const base = g.u ? UNIQUES[g.u].name : (QUALITY[g.q].name === '普通' ? GEAR_BASES[g.slot][g.tier - 1] : `${QUALITY[g.q].name}·${GEAR_BASES[g.slot][g.tier - 1]}`);
  return base + (g.e ? ` +${g.e}` : '');
}
function gearColor(g) { return g.u ? UNIQUE_COLOR : QUALITY[g.q].color; }
function gearGi(g) { return g.u || (SLOT_GI[g.slot] + g.tier); }
function gearIconHTML(g, size) { return `<span class="gframe" style="--qc:${gearColor(g)}">${gi(gearGi(g), gearColor(g), size || '30px')}</span>`; }
function gearValue(g) {
  const q = g.u ? 4 : g.q, m = QUALITY[q].mult;
  return Math.round(60 * Math.pow(g.tier, 2.2) * m * m * (1 + 0.3 * (g.e || 0)) * (g.u ? 3 : 1));
}
const STAT_NAMES = { atk: '攻击', def: '防御', maxHp: '生命', spd: '速度', crit: '暴击', luck: '钓鱼幸运' };
function statText(s) {
  return Object.entries(s).map(([k, v]) => `${STAT_NAMES[k]}+${k === 'crit' || k === 'luck' ? Math.round(v * 100) + '%' : v}`).join(' ');
}
// 强化：+0 → +10，越往后越贵、越容易失败；+7 以上失败会掉 1 级
const ENH_RATE = [1, 1, 1, 0.9, 0.8, 0.7, 0.6, 0.5, 0.4, 0.3];
function enhCost(g) { return Math.round(gearValue(Object.assign({}, g, { e: 0 })) * 0.6 * Math.pow((g.e || 0) + 1, 1.7) / 10) * 10 + 100; }
function synthCost(g) { return Math.round(200 * g.tier * g.tier * (g.q + 1) / 10) * 10; }

// ---------- 怪物 ----------
const MONSTERS = {
  gull:    { name: '抢鱼海鸥', skill: { name: '俯冲叼鱼', mult: 1.5, every: 3 }, check: '* 它盯着你的水桶，眼神很不善良。' },
  frog:    { name: '泥巴蛙', skill: { name: '舌头鞭', mult: 1.4, every: 3 }, check: '* 呱。它只会说这一个字。' },
  snake:   { name: '水蛇', skill: { name: '缠绕', mult: 1.6, every: 3 }, check: '* 嘶嘶嘶……它在试图说服你。' },
  shark:   { name: '饿肚子鲨鱼', skill: { name: '撕咬', mult: 1.7, every: 3 }, check: '* 它说它只是想尝一口船。' },
  pirate:  { name: '海盗猫', skill: { name: '抢劫', mult: 1.5, every: 2 }, check: '* “把小鱼干交出来！”', drop: ['mapPiece', 0.1] },
  squidm:  { name: '大王乌贼', skill: { name: '喷墨', mult: 1.8, every: 3 }, check: '* 八只手……不，是十只。' },
  seal:    { name: '冰海豹', skill: { name: '肚皮滑铲', mult: 1.6, every: 3 }, check: '* 它看起来软软的，但是很重。' },
  serpent: { name: '深海巨蛇', skill: { name: '漩涡', mult: 1.9, every: 3 }, check: '* 海水开始旋转。' },
  rat:     { name: '偷鱼鼠', skill: { name: '偷袭', mult: 1.5, every: 3 }, check: '* 它的口袋里塞满了别人的鱼。' },
  mosq:    { name: '蚊子团', skill: { name: '嗡嗡嗡', mult: 1.3, every: 2 }, check: '* 嗡嗡嗡嗡嗡嗡嗡。' },
  ratking: { name: '鼠王·芝士大人', boss: true, skill: { name: '奶酪炸弹', mult: 1.8, every: 3 }, check: '* 头上的王冠是一块奶酪。', unique: ['u_cheese', 0.12] },
  bat:     { name: '洞穴蝙蝠', skill: { name: '超声波', mult: 1.5, every: 3 }, check: '* 它倒挂着和你说话。你听不懂。' },
  rock:    { name: '苔藓石头人', skill: { name: '落石', mult: 1.7, every: 4 }, check: '* 它的梦想是成为一块鹅卵石。' },
  turtle:  { name: '老龟·千年', boss: true, skill: { name: '缩……壳……撞……', mult: 2.0, every: 3 }, check: '* 它……非常……慢……' },
  hermit:  { name: '寄居蟹兵', skill: { name: '贝壳盾击', mult: 1.5, every: 3 }, check: '* 它的壳是从别的螃蟹那里借来的。' },
  jelly:   { name: '电电水母', skill: { name: '放电', mult: 1.8, every: 3 }, check: '* 噼里啪啦。' },
  octo:    { name: '章鱼教授', skill: { name: '八爪讲座', mult: 1.6, every: 3 }, check: '* 它在给你上关于墨汁的课。' },
  crabgen: { name: '螃蟹将军', boss: true, skill: { name: '钳之审判', mult: 2.0, every: 3 }, check: '* 将军的钳子闪闪发亮。', unique: ['u_shell', 0.12] },
  sprite:  { name: '雪精灵', skill: { name: '冰锥', mult: 1.6, every: 3 }, check: '* 它在你耳边轻轻地吹冷气。' },
  peng:    { name: '企鹅暴徒', skill: { name: '腹部滑行', mult: 1.7, every: 3 }, check: '* 它戴着领结，但很不礼貌。' },
  bear:    { name: '冰原熊', skill: { name: '熊抱', mult: 1.9, every: 4 }, check: '* 它想抱抱你。用力地。' },
  queen:   { name: '冰晶女王', boss: true, skill: { name: '永冻之息', mult: 2.1, every: 3 }, check: '* 她身边的空气都结成了冰。', unique: ['u_ice', 0.12] },
  ghost:   { name: '溺水的幽灵', skill: { name: '叹息', mult: 1.7, every: 3 }, check: '* 它在找它丢掉的鱼竿。' },
  puffer:  { name: '暴怒刺豚', skill: { name: '膨胀', mult: 1.9, every: 3 }, check: '* 它越来越大了！' },
  bonef:   { name: '骨头鱼', skill: { name: '鱼刺雨', mult: 1.8, every: 3 }, check: '* 它已经没有肉了，但还在游。' },
  mo:      { name: '深渊之主·墨', boss: true, final: true, skill: { name: '深渊潮汐', mult: 1.9, every: 3 }, check: '* 一只非常、非常孤独的大鱼。' },
  // 隐藏 / 事件
  skelcat: { name: '骷髅水手', skill: { name: '骨头回旋镖', mult: 1.6, every: 3 }, check: '* 它的帽子比它的骨头还旧。', drop: ['mapPiece', 0.12] },
  parrot:  { name: '学舌鹦鹉', skill: { name: '“把鱼交出来！”', mult: 1.5, every: 2 }, check: '* “把鱼交出来！把鱼交出来！”' },
  onecap:  { name: '独眼船长·黑胡子喵', boss: true, hidden: true, skill: { name: '七海连斩', mult: 2.0, every: 3 }, check: '* 他的眼罩下面……其实没有受伤。只是觉得帅。', unique: ['u_pirhat', 0.3] },
  memfish: { name: '记忆之鱼', skill: { name: '回忆涌现', mult: 1.7, every: 3 }, check: '* 它的鳞片上映着很久以前的湖。' },
  shadow:  { name: '影子猫', skill: { name: '黑暗之爪', mult: 1.9, every: 3 }, check: '* 它和你长得一模一样，只是没有颜色。' },
  younghua:{ name: '年轻的花', boss: true, hidden: true, skill: { name: '回忆中的一竿', mult: 2.1, every: 3 }, check: '* 她的眼神和奶奶一模一样。' },
  mimic:   { name: '宝箱怪', skill: { name: '大口吞噬', mult: 1.8, every: 3 }, check: '* 宝箱长出了牙齿！' },
  lakemon: { name: '水怪', skill: { name: '巨浪', mult: 1.7, every: 3 }, check: '* 码头下面一直住着这家伙？！' },
};
// 怪物强度按「该等级玩家的预期装备」来计算：装备落后会很吃力，装备领先会很轻松
function heroExpect(L) {
  const t = clamp(1 + (L - 4) / 9, 1, 5.6), m = 1.45;
  return { hp: 100 + 82 * Math.pow(t, 1.4) * m, atk: 10 + (6 + 10 * Math.pow(t, 1.3)) * m + 0.4 * L, def: 9.5 + 7.4 * Math.pow(t, 1.3) * m };
}
function monsterStats(id, lv) {
  const m = MONSTERS[id], X = heroExpect(lv);
  const soft = lv < 10 ? 0.75 + 0.025 * lv : 1;
  const b = m.final ? 5.5 : m.hidden ? 4.2 : m.boss ? 3.4 : 1, a = m.final ? 1.3 : m.hidden ? 1.35 : m.boss ? 1.2 : 1;
  const def = 0.45 * X.def;
  return {
    id, name: m.name, lv, boss: !!m.boss, final: !!m.final, skill: m.skill,
    maxHp: Math.round(7.5 * X.atk * 100 / (100 + def) * b * (1 + Math.max(0, lv - 6) / 22)), atk: Math.round(0.06 * X.hp * (100 + X.def) / 100 * a * soft * (1 + Math.max(0, lv - 6) / 45)), def: Math.round(def), spd: Math.round(8 + 0.5 * lv),
  };
}

// ---------- 航线 ----------
const ROUTES = [
  { from: 'lake', to: 'river', boat: 1, fish: 30, dur: 240, lv: [4, 7], mons: ['gull', 'frog', 'snake'] },
  { from: 'river', to: 'sea', boat: 2, fish: 50, dur: 360, lv: [10, 14], mons: ['gull', 'snake', 'shark', 'pirate'] },
  { from: 'sea', to: 'ice', boat: 3, fish: 80, dur: 480, lv: [18, 24], mons: ['pirate', 'shark', 'squidm', 'seal'] },
  { from: 'ice', to: 'abyss', boat: 3, fish: 120, dur: 600, lv: [28, 34], mons: ['seal', 'squidm', 'serpent'] },
];
const PLACES = {
  lake: { name: '宁静湖畔', icon: '🌲' }, river: { name: '溪谷急流', icon: '⛰️' }, sea: { name: '落日海湾', icon: '🌅' },
  ice: { name: '冰封雪湖', icon: '🏔️' }, abyss: { name: '深渊之岛', icon: '🌀' },
};
const REGION_LV = { lake: [3, 6], river: [9, 13], sea: [16, 21], ice: [24, 29], abyss: [32, 36] };
const HUNT_MONS = { lake: ['frog', 'gull'], river: ['snake', 'gull'], sea: ['shark', 'pirate'], ice: ['seal', 'squidm'], abyss: ['serpent', 'squidm'] };

// ---------- 副本 ----------
const DUNGEONS = [
  { id: 'rat', name: '芦苇岛·鼠鼠地窖', region: 'lake', floors: 3, lv: [2, 5], mons: ['rat', 'mosq', 'frog'], boss: 'ratking', bossLv: 7, tier: 1, gi: 'u_cheese',
    desc: '湖心小岛的地下，传来吱吱的声音。' },
  { id: 'falls', name: '瀑布后的洞穴', region: 'river', floors: 4, lv: [9, 13], mons: ['bat', 'rock', 'snake'], boss: 'turtle', bossLv: 15, tier: 2, gi: 'fountain',
    desc: '瀑布的水帘后面，藏着一条幽深的通道。' },
  { id: 'tide', name: '螃蟹岛·潮汐洞窟', region: 'sea', floors: 4, lv: [16, 21], mons: ['hermit', 'jelly', 'octo'], boss: 'crabgen', bossLv: 23, tier: 3, gi: 'u_shell',
    desc: '退潮时才会露出的洞窟，螃蟹们在里面列队。' },
  { id: 'crystal', name: '冰晶迷宫', region: 'ice', floors: 5, lv: [24, 29], mons: ['sprite', 'peng', 'bear'], boss: 'queen', bossLv: 31, tier: 4, gi: 'u_ice',
    desc: '冰层下的迷宫，墙壁会映出你的倒影。' },
  { id: 'abyss', name: '沉没王座', region: 'abyss', floors: 5, lv: [32, 37], mons: ['ghost', 'puffer', 'bonef'], boss: 'mo', bossLv: 40, tier: 5, gi: 'whale',
    desc: '深渊之岛中央，沉在水下的古老宫殿。最深处有什么在等待。' },
  // —— 隐藏副本 ——
  { id: 'pirate', name: '海盗湾·独眼喵的宝窟', region: 'sea', floors: 4, lv: [25, 30], mons: ['pirate', 'skelcat', 'parrot'], boss: 'onecap', bossLv: 33, tier: 4, gi: 'skull', hidden: true,
    desc: '拼好的地图指向一处被浓雾包围的海湾。', hint: '传说海盗把地图撕成了三片……', unlock: S => S.hiddenOpen && S.hiddenOpen.pirate },
  { id: 'dream', name: '梦之湖·花的回忆', region: 'lake', floors: 5, lv: [38, 44], mons: ['memfish', 'shadow', 'ghost'], boss: 'younghua', bossLv: 48, tier: 5, gi: 'moon', hidden: true,
    desc: '在梦里，湖面倒映着三十年前的夕阳。', hint: '当约定被完成，湖神也许会给你托一个梦……', unlock: S => S.hiddenOpen && S.hiddenOpen.dream },
];

// ---------- 剧情 ----------
// who: 'narr' 旁白；其余为角色 id。choice 用于分支。
const CHARS = {
  narr: { name: '', face: '' },
  me: { name: '小橘', face: '🐱' },
  pao: { name: '泡泡', face: '🐟' },
  nana: { name: '奶奶的信', face: '📜' },
  otter: { name: '獭爷爷', face: '🦦' },
  ratking: { name: '鼠王·芝士大人', face: '🐭' },
  turtle: { name: '老龟·千年', face: '🐢' },
  crabgen: { name: '螃蟹将军', face: '🦀' },
  queen: { name: '冰晶女王', face: '👸' },
  mo: { name: '墨', face: '🐋' },
};
const LETTER = '墨：对不起，我老了，再也划不动船了。但我会让我的孙女替我来。她会带着最好吃的鱼，陪你看一次日落。——花';
const STORY = {
  intro: [
    ['narr', '* 很久很久以前，湖边住着一只很会钓鱼的老猫。'],
    ['narr', '* 大家都叫她——花奶奶。'],
    ['narr', '* 现在，她的鱼竿传到了你的手里。'],
    ['nana', '小橘：等你把这片湖里的鱼全都认识一遍，就去码头找獭爷爷吧。'],
    ['nana', '大海的最深处，有一个我答应过的约定……拜托你，替我去赴约。'],
    ['narr', '* 信纸的背面，画着一条很大很大的鱼。'],
    ['pao', '嗨！别那样看着我，我不是晚饭。'],
    ['pao', '我叫泡泡，住在这个水桶里。是你奶奶的……呃，前·晚饭。后来我们成了朋友。'],
    ['pao', '总之！先把湖里的鱼钓个遍吧。打开「图鉴」看看还差哪些。'],
    ['narr', '* 你握紧了鱼竿。'],
    ['narr', '* 你充满了决心。'],
  ],
  firstTreasure: [
    ['pao', '哇哦，水底下居然有这种东西！'],
    ['pao', '钥匙可以打开宝箱。宝箱……就是装着宝贝的箱子。我是不是很聪明？'],
    ['pao', '在「冒险」面板的宝藏栏里开箱吧！藏宝图要等有了船才能用。'],
  ],
  captain: [
    ['otter', '哟，小家伙。你身上有一股老花的味道。'],
    ['otter', '……是鱼腥味。'],
    ['otter', '想出海？先把这里的鱼认全了再说。大海可不会对不认识鱼的猫客气。'],
    ['otter', '图鉴凑齐了就来找我换地址。顺便……你还得有条船。'],
    ['pao', '（小声）他是这一带最好的船长。也是唯一的船长。'],
  ],
  boat: [
    ['pao', '我们有船了！我宣布它叫「泡泡号」！'],
    ['me', '……'],
    ['pao', '好吧好吧，「小橘号」也行。'],
    ['otter', '有了船，湖心的芦苇岛也能去了。听说岛下面有个老鼠窝……'],
  ],
  addr_river: [
    ['otter', '嗯！湖里的鱼你都认识了。老花当年也是这样，一条一条地记。'],
    ['otter', '给，这是溪谷的地址。沿着河往上游划，水会越来越急。'],
    ['otter', '出航要带够补给——30 条鱼。路上可不太平，记得在背包里多留几条当口粮。'],
    ['pao', '口粮……？那、那我呢？'],
    ['otter', '你是吉祥物。'],
  ],
  addr_sea: [
    ['otter', '溪谷的尽头连着大海。落日海湾……老花最喜欢在那里看日落。'],
    ['otter', '海上有海盗猫，还有会咬船的鲨鱼。得换帆船才扛得住。补给要 50 条鱼。'],
  ],
  addr_ice: [
    ['otter', '往北走就是冰封雪湖。那里冷得连胡子都会结冰。'],
    ['otter', '你需要破冰船。还有 80 条鱼——冷的时候会特别饿。'],
  ],
  addr_abyss: [
    ['otter', '……你真的要去那里？'],
    ['otter', '深渊之岛。三十年前，老花从那里回来以后，就再也没出过海。'],
    ['otter', '她说，她在等一个约定被完成。我想，那个约定……就是你吧。'],
    ['otter', '带上 120 条鱼。别逞强。'],
  ],
  firstBattle: [
    ['narr', '* 一只怪物挡住了去路！'],
    ['pao', '别慌！小橘会自动战斗的。在「冒险」面板里换上好装备会更强！'],
    ['pao', '血少了会自动吃背包里的鱼——所以别把鱼全卖光啦！'],
  ],
  arrive_river: [['narr', '* 水声隆隆。空气里有青苔的味道。'], ['pao', '听说瀑布后面藏着一个洞穴……要不要去看看？']],
  arrive_sea: [['narr', '* 你闻到了海风。咸咸的。'], ['pao', '那边的小岛上全是螃蟹！它们看起来……很有组织。']],
  arrive_ice: [['narr', '* 好冷。你的胡子结了一层霜。'], ['pao', '我的水桶结冰了！！快帮我敲开！']],
  arrive_abyss: [
    ['narr', '* 天空是紫色的。海浪没有声音。'],
    ['narr', '* 岛的中央，有一座沉在水里的宫殿。'],
    ['pao', '小橘……我有点怕。'],
    ['pao', '……但我们一起去吧。'],
  ],
  // 副本
  enter_rat: [['narr', '* 地窖里弥漫着奶酪的味道。'], ['pao', '我闻到了……阴谋的味道。还有切达干酪。']],
  enter_falls: [['narr', '* 水帘在身后合上了。四周一片潮湿的黑暗。']],
  enter_tide: [['narr', '* 洞口挂着一块牌子：「螃蟹专用，猫勿入」。'], ['pao', '我们……假装是螃蟹？']],
  enter_crystal: [['narr', '* 冰墙里映出无数个你。每一个都很冷。']],
  enter_abyss: [['narr', '* 宫殿的大门自己打开了。'], ['narr', '* 好像有谁，一直在等你来。']],
  boss_rat: [
    ['ratking', '吱吱吱！你就是那个把湖里的鱼都钓走的猫？！'],
    ['ratking', '鱼是我们鼠鼠的！奶酪也是我们的！什么都是我们的！'],
  ],
  win_rat: [
    ['ratking', '呜……好吧好吧，奶酪还给你……'],
    ['ratking', '什么？你不要奶酪？……那你真是只奇怪的猫。'],
  ],
  boss_falls: [['turtle', '……'], ['turtle', '…………'], ['narr', '* （它说话非常、非常慢）'], ['turtle', '年轻……的……猫……来……吧……']],
  win_falls: [['turtle', '很……好……你……让……我……想起……一位……故人……'], ['turtle', '她……也是……橘色……的……']],
  boss_tide: [['crabgen', '立正！稍息！本将军镇守此洞已有三年零两个月！'], ['crabgen', '我的钳子可是很硬的！来吧！']],
  win_tide: [['crabgen', '……其实我只是想要一个拥抱。'], ['narr', '* 你抱了抱螃蟹将军。'], ['narr', '* 有点扎。']],
  boss_crystal: [['queen', '又是一个来打扰我沉睡的家伙。'], ['queen', '你可知道，寒冷是唯一不会离开的东西。']],
  win_crystal: [['queen', '……你的爪子，好暖和。'], ['queen', '去吧。深渊里的那位，一直在等一只橘色的猫。']],
  boss_abyss: [
    ['narr', '* 黑暗中，一只巨大的眼睛睁开了。'],
    ['mo', '…………花？'],
    ['mo', '不……你不是她。但你身上有她的味道。'],
    ['mo', '三十年。她说过，她会回来，和我一起看一次日落。'],
    ['mo', '她骗了我。'],
    ['mo', '所以——我不会再相信任何一只猫了！'],
  ],
  mercy_abyss: [
    ['mo', '为……为什么你不逃？'],
    ['narr', '* 墨的身体在发抖。它已经打不动了。'],
    ['narr', '* 你的口袋里，还装着奶奶的信。'],
    { choice: [['spare', '✦ 饶恕，并递出奶奶的信'], ['fight', '✦ 继续战斗']] },
  ],
  end_spare: [
    ['narr', '* 你把信递了过去。'],
    ['nana', LETTER],
    ['mo', '……'],
    ['mo', '…………她没有忘记。'],
    ['narr', '* 深渊的天空，第一次出现了橘色的晚霞。'],
    ['mo', '小橘。谢谢你。这片海底的宝藏……送给你吧。那本来就是她想留给你的。'],
    ['mo', '以后……可以常来钓鱼吗？'],
    ['pao', '（小声）我们……是不是做了一件很了不起的事？'],
    ['narr', '* 你充满了决心。'],
    ['narr', '—— 完 ——　感谢游玩《小猫钓鱼》'],
    ['narr', '（你可以继续钓鱼、刷副本、收集全图鉴。墨会一直在深渊等你。）'],
  ],
  end_fight: [
    ['mo', '……果然……猫……都是一样的……'],
    ['narr', '* 墨沉入了更深的黑暗。'],
    ['narr', '* 宝箱底下，压着一封泡烂了的信。'],
    ['nana', LETTER],
    ['narr', '* ……'],
    ['pao', '小橘……我们是不是……做错了什么？'],
    ['narr', '* 也许，你可以再来一次。'],
    ['narr', '（再次挑战沉没王座，可以做出不同的选择。）'],
  ],
  again_abyss: [['mo', '……你又来了。'], ['mo', '这一次，你想做什么？']],
};

// ---------- v0.3 新增角色与剧情 ----------
Object.assign(CHARS, {
  me: { name: '小橘', face: '🐱', spr: 'hero' },
  ratking: { name: '鼠王·芝士大人', face: '🐭', spr: 'ratking' },
  turtle: { name: '老龟·千年', face: '🐢', spr: 'turtle' },
  crabgen: { name: '螃蟹将军', face: '🦀', spr: 'crabgen' },
  queen: { name: '冰晶女王', face: '👸', spr: 'queen' },
  mo: { name: '墨', face: '🐋', spr: 'mo' },
  onecap: { name: '独眼船长', face: '🏴‍☠️', spr: 'onecap' },
  younghua: { name: '年轻的花', face: '🐱', spr: 'younghua' },
  oldcat: { name: '神秘老猫', face: '🧙' },
  merchant: { name: '流浪商人·喵喵', face: '🧳' },
  koi: { name: '湖神金鲤', face: '✨' },
});
Object.assign(STORY, {
  firstBattle: [
    ['narr', '* 一只怪物挡住了去路！'],
    ['pao', '别慌！小橘会自动回合制战斗。每回合攒 1 点行动点（最多 10 点），技能要消耗点数。'],
    ['pao', '小橘本身很弱——变强全靠装备！去「冒险」面板换装备、强化、加点和点天赋吧。'],
    ['pao', '血少了会自动吃背包里的鱼，所以别把鱼全卖光啦！'],
  ],
  paoScale: [
    ['pao', '小橘……谢谢你一直喂我。'],
    ['pao', '其实，我是花奶奶这辈子钓到的第一条鱼。'],
    ['pao', '那年她才这么小。她把我捞起来，看了好久好久，说：「你陪着我吧。」'],
    ['pao', '后来她每天都跟我说话。说深渊里遇见的大鱼，说那场风暴，说她有多后悔。'],
    ['pao', '……这片鳞片给你。我掉了好多年，才攒下这一片最亮的。'],
    ['narr', '* 你获得了「泡泡的鳞片」。'],
  ],
  letter1: [
    ['narr', '* 漂流瓶里有一封信。字迹很稚嫩。'],
    ['nana', '墨：今天我钓到了一条会说话的金鱼！它说它不想被吃掉。我决定叫它泡泡。——花'],
    ['pao', '……这、这是在说我？！'],
  ],
  letter2: [
    ['narr', '* 又是一封漂流瓶里的信。'],
    ['nana', '墨：船修好了。等夏天结束，我就划船去看你。你说深渊的天空永远是紫色的，那我就带一块橘色的晚霞给你。——花'],
  ],
  letter3: [
    ['narr', '* 信纸被海水泡得发皱。'],
    ['nana', '墨：对不起。那场风暴把船打碎了，我的腿也……医生说我再也不能出海了。'],
    ['nana', '我每天都在湖边钓鱼，把信装进瓶子里扔进河。不知道你能不能收到。——花'],
    ['pao', '……她一直都记得。'],
  ],
  abyssFish: [
    ['mo', '你来了。'],
    ['mo', '这片海里的鱼，都是我的朋友。……钓的时候，轻一点哦。'],
    ['pao', '（小声）它在笑。我第一次看到深渊的鱼笑。'],
  ],
  unlock_pirate: [
    ['narr', '* 三片地图拼在了一起。'],
    ['pao', '上面画着一个骷髅……还有一条鱼？这是海盗的藏宝图！'],
    ['otter', '独眼喵……那只老海盗还活着？他的宝窟就藏在落日海湾的雾里。'],
    ['otter', '小心点。他当年可是七海最难缠的猫。'],
  ],
  enter_pirate: [['narr', '* 浓雾里传来走调的手风琴声。'], ['pao', '这里……有股朗姆酒和咸鱼的味道。']],
  boss_pirate: [
    ['onecap', '哈哈哈！又一只想要我宝藏的小猫！'],
    ['onecap', '你知道我为什么戴眼罩吗？'],
    ['onecap', '……因为帅！来吧！'],
  ],
  win_pirate: [
    ['onecap', '好吧好吧，宝藏归你了。'],
    ['onecap', '替我向花问好——当年她可是唯一一个在钓鱼比赛上赢过我的猫。'],
    ['pao', '奶奶到底赢过多少人啊……'],
  ],
  unlock_dream: [
    ['narr', '* 那天晚上，你做了一个梦。'],
    ['narr', '* 梦里，湖神金鲤在月光下游到你面前。'],
    ['koi', '花在这片湖里留下了一段回忆。你想去看看吗？'],
    ['narr', '* （「梦之湖·花的回忆」出现在了副本列表里。）'],
  ],
  enter_dream: [['narr', '* 你站在三十年前的码头上。'], ['narr', '* 一只年轻的橘猫正在甩竿。']],
  boss_dream: [
    ['younghua', '你是谁？……为什么你的鱼竿和我的一模一样？'],
    ['younghua', '哦——我明白了。这是梦，对吧？'],
    ['younghua', '那就让我看看，未来的我教出了一只什么样的小猫！'],
  ],
  win_dream: [
    ['younghua', '……好厉害。'],
    ['younghua', '我还以为，我会一个人走到最后。'],
    ['younghua', '原来，会有人替我去。'],
    ['younghua', '这根鱼竿……在梦里送给你也没关系吧？反正，它本来就是你的。'],
    ['narr', '* 你获得了「奶奶的鱼竿」。'],
    ['narr', '* 醒来的时候，枕边有一片带着湖水味道的叶子。'],
  ],
  meteorBoots: [['narr', '* 流星落进了水里。'], ['narr', '* 水面上漂来一双闪着月光的靴子。'], ['narr', '* 你获得了「月光猫靴」。']],
  moTear: [['mo', '这个……送给你。'], ['mo', '三十年来，我只哭过一次。就是刚才。'], ['narr', '* 你获得了「墨之泪」。']],
  oldcat1: [['oldcat', '年轻的猫啊。海盗总喜欢把地图撕成三片……船上、海里、骷髅的口袋里。']],
  oldcat2: [['oldcat', '泡泡那家伙，嘴硬心软。多喂它几次，它会告诉你一些事的。']],
  oldcat3: [['oldcat', '漂流瓶不只装着金币……有时候，装着一个人一辈子说不出口的话。']],
  oldcat4: [['oldcat', '湖神只在雾夜里出现。等你和深渊里的那位和解，再去钓它吧。']],
  oldcat5: [['oldcat', '八条锦鲤，一位湖神。拿去铁匠铺试试看。']],
});
