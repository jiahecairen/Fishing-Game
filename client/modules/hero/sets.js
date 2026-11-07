// ===== 角色 · 套装 =====
// 套装不能合成：只能通过任务线拿到图纸，再找工匠打造（见 quests / forge 模块）。
// 新套装：CF.content.define('set', 'myset', { name, pieces: [...], b2: '说明', b3: '说明', bonus: { 2: {...}, 3: {...} } })
// bonus 里能用的字段：luck bite apRegen atkPct hpPct regen thorns crit critDmg critAp
'use strict';

const SET_COLOR = '#3ee0c0';
const SETS = {};
CF.content.type('set', { map: SETS });

CF.content.define('set', 'angler', { name: '渔夫之魂', pieces: ['sa_w', 'sa_h', 'sa_a'], b2: '钓鱼幸运 +20%，上钩速度 +15%', b3: '每回合额外 +1 行动点，攻击 +10%',
  bonus: { 2: { luck: 0.2, bite: 0.15 }, 3: { apRegen: 1, atkPct: 0.1 } } });
CF.content.define('set', 'tide', { name: '深海潮汐', pieces: ['st_h', 'st_a', 'st_b'], b2: '生命 +15%', b3: '每回合回复 5% 生命，受到攻击时反弹 15% 伤害',
  bonus: { 2: { hpPct: 0.15 }, 3: { regen: 0.05, thorns: 0.15 } } });
CF.content.define('set', 'star', { name: '星落', pieces: ['ss_c', 'ss_b', 'ss_w'], b2: '暴击率 +12%', b3: '暴击伤害 +60%，暴击时 +1 行动点',
  bonus: { 2: { crit: 0.12 }, 3: { critDmg: 0.6, critAp: 1 } } });

const SET_PIECES = {
  sa_w: { name: '渔夫的鱼叉', slot: 'weapon', tier: 4, set: 'angler', stats: { atk: 80, crit: 0.06, luck: 0.1 }, src: '任务「渔夫之魂」', icon: 'w2' },
  sa_h: { name: '渔夫的斗笠', slot: 'hat', tier: 3, set: 'angler', stats: { maxHp: 140, def: 16, luck: 0.1 }, src: '任务「渔夫之魂」', icon: 'h1' },
  sa_a: { name: '渔夫的蓑衣', slot: 'armor', tier: 4, set: 'angler', stats: { maxHp: 320, def: 36 }, src: '任务「渔夫之魂」', icon: 'a2' },
  st_b: { name: '深潮战靴', slot: 'boots', tier: 4, set: 'tide', stats: { spd: 16, def: 18 }, src: '任务「深海潮汐」', icon: 'b5' },
  st_h: { name: '深潮之冠', slot: 'hat', tier: 4, set: 'tide', stats: { maxHp: 200, def: 24 }, src: '任务「深海潮汐」', icon: 'h5' },
  st_a: { name: '深潮铠甲', slot: 'armor', tier: 5, set: 'tide', stats: { maxHp: 460, def: 52 }, src: '任务「深海潮汐」', icon: 'a5' },
  ss_c: { name: '星落吊坠', slot: 'charm', tier: 5, set: 'star', stats: { maxHp: 180, crit: 0.14, luck: 0.15 }, src: '任务「星落」', icon: 'c4' },
  ss_b: { name: '星落之靴', slot: 'boots', tier: 5, set: 'star', stats: { spd: 24, def: 20 }, src: '任务「星落」', icon: 'b5' },
  ss_w: { name: '星落之刃', slot: 'weapon', tier: 5, set: 'star', stats: { atk: 120, crit: 0.12 }, src: '任务「星落」', icon: 'w5' },
};
for (const [k, U] of Object.entries(SET_PIECES)) { GI[k] = GI[U.icon]; CF.content.define('unique', k, U); }
