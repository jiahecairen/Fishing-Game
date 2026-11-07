// 副本系统：通用流程（logic.js）、副本里的事件、地下通道画面、副本列表。
// 每个副本是 dungeons/ 下的一个文件——新副本复制一个改一改，再把文件名加到下面。
CF.manifest({
  id: 'dungeon', name: '副本',
  requires: ['battle', 'monsters', 'hero', 'treasure', 'events', 'voyage'],
  files: ['logic.js', 'events.js', 'render.js', 'ui.js',
    'dungeons/rat.js', 'dungeons/falls.js', 'dungeons/tide.js', 'dungeons/crystal.js', 'dungeons/abyss.js',
    'dungeons/pirate.js', 'dungeons/dream.js'],
});
