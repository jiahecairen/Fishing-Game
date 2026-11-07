// 厨房：挂机烹饪（离线也会做），料理可以吃（回血 + buff），也可以卖掉（售卖模块）或挂到寄卖行（寄卖行模块）。
CF.manifest({ id: 'kitchen', name: '厨房', requires: ['fishing', 'inventory', 'hero'], optional: ['market', 'battle', 'forge'], files: ['logic.js', 'ui.js'] });
