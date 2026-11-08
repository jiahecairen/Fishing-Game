// 桌面宠物：把游戏变成一只在桌面上的小猫（坐在小船上钓鱼），背景透明、可以拖动、右键「还原窗口」。
// 画面直接读游戏的实时状态（抛竿、等鱼、咬钩、收线、钓到 / 跑掉、背包满、航海、副本、战斗、天气、昼夜），
// 所以和游戏的进度完全同步。窗口的变化（透明、置顶、拖动、右键菜单）由 Mac App 外壳完成，见 macos/main.swift。
CF.manifest({ id: 'pet', name: '桌面宠物', requires: ['fishing', 'art'], optional: ['battle', 'events', 'voyage', 'dungeon', 'account'], files: ['pet.js'], css: ['pet.css'] });
