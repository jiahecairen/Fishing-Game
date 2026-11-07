// 突发事件：引擎 + 码头上的事件。航海和副本的事件由各自的模块注册（where: 'voyage' / 'dungeon'）。
CF.manifest({ id: 'events', name: '突发事件', requires: ['fishing', 'hero', 'treasure', 'battle'], files: ['engine.js', 'fish_events.js', 'ui.js'] });
