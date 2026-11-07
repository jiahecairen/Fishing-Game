// ===== 战斗 · 技能 =====
// 每个技能一条。字段：
//   ap 行动点消耗；hits 连击次数；mult 每次的伤害倍率；heal 回复最大生命的比例；guard 减伤次数
//   fx 战斗画面的特效：slash 爪痕 / proj 投掷 / arc 横扫 / star 拳（默认）
//   use(B, api) 写了就完全自定义（api.damageFoe / api.healHero / api.log / api.fx ...）
// 小橘能用哪些技能由天赋决定（见 hero/data.js 的 TALENTS.skill），新模块也可以用 CF.hook('hero.skills', () => ['myskill']) 给技能。
'use strict';

CF.content.define('skill', 'punch', { name: '猫猫拳', ap: 0, hits: 1, mult: 1, fx: 'star', text: '* 小橘挥出了猫猫拳！' });
CF.content.define('skill', 'claw', { name: '连环猫爪', ap: 1, hits: 2, mult: 0.65, fx: 'slash', text: '* 小橘使出了连环猫爪！' });
CF.content.define('skill', 'bone', { name: '鱼骨飞镖', ap: 2, hits: 1, mult: 1.8, fx: 'proj', text: '* 小橘扔出了鱼骨飞镖！' });
CF.content.define('skill', 'heal', { name: '喵喵治愈', ap: 2, heal: 0.22, text: '* 小橘舔了舔毛。感觉好多了。' });
CF.content.define('skill', 'guard', { name: '炸毛防御', ap: 1, guard: 2, text: '* 小橘全身的毛都炸了起来！（接下来 2 次受到的伤害减半）' });
CF.content.define('skill', 'sweep', { name: '奶奶的鱼竿·横扫', ap: 5, hits: 1, mult: 3.6, fx: 'arc', text: '* 小橘挥动了奶奶的鱼竿！' });

// 技能说明（技能栏、手动菜单都用这个）
function skillDesc(K) {
  if (K.desc) return K.desc;
  if (K.heal) return `回复 ${Math.round(K.heal * 100)}% 生命`;
  if (K.guard) return `接下来 ${K.guard} 次受到的伤害减半`;
  return `${K.hits > 1 ? K.hits + ' 连击 × ' : ''}${K.mult} 倍伤害`;
}
