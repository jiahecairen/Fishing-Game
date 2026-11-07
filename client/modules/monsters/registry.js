// ===== 怪物 · 注册 =====
// 每只怪物一个文件，互不影响。新怪物：复制一个文件，改名字和数值，再把文件名加到 module.js 里。
//
// CF.monster('id', {
//   name, boss, final, hidden,          // boss / 最终 Boss / 隐藏 Boss（数值倍率不同）
//   skill: { name, mult, every },       // 每 every 回合放一次，伤害 ×mult
//   check: '* 进场时的一句话',
//   drop: ['mapPiece', 0.1],            // 掉落宝藏
//   unique: ['u_shell', 0.12],          // 掉落隐藏装备
//   mats: ['pearl', 0.3, 1],            // 掉落素材
//   mercy: { at: 0.15, story: 'xxx' },  // 血量低于 at 时暂停，播放剧情让玩家选择「饶恕 / 继续」
//   sprite: { mirror, pal, rows },      // 像素立绘
//   // —— 以下是可选的「行为脚本」，用来做有特色的怪物 ——
//   scale(st, lv) { return { spd: st.spd + 4 }; },          // 微调数值
//   onStart(B, api) {},                                      // 战斗开始
//   act(B, api) { ... return true; },                        // 自己的回合，返回 true 表示已经处理（不再普通攻击）
//   onHit(B, damage, api) {},                                // 被打中后
//   onDefeat(B, api) {},                                     // 被打败时（额外掉落等）
// });
//
// 例子：一只每 4 回合回血的怪物
//   act(B, api) {
//     if (B.foeTurns % 4 === 0) { api.healFoe(B.foe.maxHp * 0.1); api.log(`* ${B.foe.name}舔了舔伤口。`); api.fx({ who: 'foe', kind: 'frozen' }); return true; }
//   },
'use strict';

CF.monster = (id, def) => {
  if (def.sprite) CF.sprite(id, def.sprite);
  return CF.content.define('monster', id, def);
};
