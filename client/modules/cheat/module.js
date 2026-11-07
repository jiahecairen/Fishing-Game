// 测试用作弊面板。上线给别人玩时，可以从 modules.js 里去掉，或在服务器配置里关闭（devCheats: false）。
CF.manifest({ id: 'cheat', name: '作弊面板', requires: ['fishing', 'hero', 'treasure', 'battle', 'events', 'voyage', 'dungeon', 'kitchen', 'quests', 'story'], optional: ['market', 'sell'], files: ['cheat.js'] });
