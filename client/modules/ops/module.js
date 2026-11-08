// 运营：读取后台改的数值（爆率、钓鱼时间……）和自定义装备、领取后台发的邮件、服务器维护时提示。
// 关掉这个模块，游戏就一直用代码里的默认数值。
CF.manifest({ id: 'ops', name: '运营', requires: ['fishing', 'inventory'], optional: ['account', 'hero', 'treasure', 'battle', 'sell', 'events', 'kitchen'], files: ['ops.js'] });
