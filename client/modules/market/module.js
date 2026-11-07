// 寄卖行：鱼不能直接卖，只能挂单。像股票一样每天变动的行情（每月小范围波动），会员等级按月销售额结算。
CF.manifest({ id: 'market', name: '寄卖行', requires: ['fishing', 'inventory'], files: ['logic.js', 'ui.js'] });
