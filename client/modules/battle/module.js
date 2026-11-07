// 战斗系统：回合制引擎（engine.js，纯逻辑）、技能表、像素战斗画面（fx.js）、战斗界面（ui.js）。
// 副本、航海、突发事件都只是「调用」战斗：Battle.fight(怪物, 等级, { where: '场合', ... })。
CF.manifest({ id: 'battle', name: '战斗', requires: ['hero', 'inventory', 'fishing'], files: ['engine.js', 'skills.js', 'adventure.js', 'fx.js', 'ui.js'] });
