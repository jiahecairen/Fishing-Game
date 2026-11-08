// ===== 角色 · 数据：基础属性、属性点、天赋、装备、隐藏装备、吃鱼 =====
// 小橘本身很弱：等级不加属性，只给属性点（每级 1 点）和天赋点（每 2 级 1 点）。变强靠装备。
// 新的隐藏装备：CF.content.define('unique', 'u_xxx', { name, slot, tier, stats, effect, eff, edesc, src })
'use strict';

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
const UNIQUES = {};
CF.content.type('unique', { map: UNIQUES });
const UNIQUE_LIST = {
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
Object.entries(UNIQUE_LIST).forEach(([k, v]) => CF.content.define('unique', k, v));

function enhMult(e) { return 1 + 0.15 * (e || 0); }
function gearStats(g) {
  const E = enhMult(g.e), s = {};
  if (g.u) {
    const U = UNIQUES[g.u]; if (!U) return s;
    for (const [k, v] of Object.entries(U.stats)) s[k] = (k === 'crit' || k === 'luck') ? v : Math.round(v * E);
    return s;
  }
  const t = g.tier, m = QUALITY[g.q].mult * CF.tune('gear.statMul', 1);
  if (g.slot === 'weapon') { s.atk = Math.round((6 + 10 * Math.pow(t, 1.3)) * m * E); if (g.q >= 2) s.crit = 0.02 * (g.q - 1); }
  if (g.slot === 'hat') { s.maxHp = Math.round(25 * Math.pow(t, 1.4) * m * E); s.def = Math.round((1.5 + 2 * Math.pow(t, 1.3)) * m * E); }
  if (g.slot === 'armor') { s.maxHp = Math.round(45 * Math.pow(t, 1.4) * m * E); s.def = Math.round((3 + 4 * Math.pow(t, 1.3)) * m * E); }
  if (g.slot === 'boots') { s.spd = Math.round((2 + 1.6 * t) * m * E); s.def = Math.round((1 + 1.4 * Math.pow(t, 1.3)) * m * E); }
  if (g.slot === 'charm') { s.maxHp = Math.round(12 * Math.pow(t, 1.4) * m * E); s.crit = Math.round((0.01 + 0.012 * t) * m * 1000) / 1000; s.luck = Math.round(0.03 * t * m * 100) / 100; }
  return s;
}
function gearName(g) {
  const base = g.u ? (UNIQUES[g.u] ? UNIQUES[g.u].name : '已下架的装备') : (QUALITY[g.q].name === '普通' ? GEAR_BASES[g.slot][g.tier - 1] : `${QUALITY[g.q].name}·${GEAR_BASES[g.slot][g.tier - 1]}`);
  return base + (g.e ? ` +${g.e}` : '');
}
function gearColor(g) { return g.u ? UNIQUE_COLOR : QUALITY[g.q].color; }
function gearGi(g) { return g.u ? ((UNIQUES[g.u] && UNIQUES[g.u].icon) || g.u) : (SLOT_GI[g.slot] + g.tier); }
function gearIconHTML(g, size) { return `<span class="gframe" style="--qc:${gearColor(g)}">${gi(gearGi(g), gearColor(g), size || '30px')}</span>`; }
function gearValue(g) {
  const q = g.u ? 4 : g.q, m = QUALITY[q].mult;
  return Math.round(60 * Math.pow(g.tier, 2.2) * m * m * (1 + 0.3 * (g.e || 0)) * (g.u ? 3 : 1));
}
const STAT_NAMES = { atk: '攻击', def: '防御', maxHp: '生命', spd: '速度', crit: '暴击', luck: '钓鱼幸运' };
function statText(s) {
  return Object.entries(s).map(([k, v]) => `${STAT_NAMES[k]}+${k === 'crit' || k === 'luck' ? Math.round(v * 100) + '%' : v}`).join(' ');
}

// ---------- 吃鱼回复（部分鱼在战斗中额外回复行动点） ----------
const FOOD_PCT = { junk: 0, common: 0.12, rare: 0.25, epic: 0.45, legendary: 1 };
const AP_FISH = new Set(['eel', 'squid', 'lantern', 'ricefield', 'saury', 'smelt', 'icepike', 'lakegod', 'goldscale', 'aurora', 'crayfish', 'kingcrab', 'aeel', 'aangler', 'aheart']);
function foodValue(item) {
  const f = FISH_BY_ID[item.id];
  if (!f || f.treasure) return null;
  const pctv = FOOD_PCT[f.rarity];
  if (!pctv) return null;
  const k = 0.8 + 0.4 * ((item.size - f.min) / Math.max(1, f.max - f.min));
  const ok = Game.S && Game.S.hero;
  const mult = ok ? 1 + Hero.talentVal('s3') : 1, maxHp = ok ? (Hero._maxHp || Hero.stats().maxHp) : 200;
  return { hp: Math.round((20 + maxHp * pctv) * k * mult), ap: AP_FISH.has(f.id) ? 2 : 0 };
}

