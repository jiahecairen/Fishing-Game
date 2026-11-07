// 普通售卖：在背包 / 仓库 / 船舱里直接把鱼卖给码头收购站，按鱼的价值立刻到手；料理也能卖。
// 招财猫：背包和仓库都满时，自动卖掉普通鱼和杂物。
// 和「寄卖行」(market) 是两种卖东西的方式，一般只开其中一个（在 client/modules.js 里切换）。
CF.manifest({ id: 'sell', name: '售卖', requires: ['fishing', 'inventory'], optional: ['kitchen'], files: ['sell.js'] });
