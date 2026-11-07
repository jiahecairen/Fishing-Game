// 背包、仓库（每个地点一个）、船舱、素材，以及「需要 xx 物品」的通用检查（任务、锻造、委托都用它）。
CF.manifest({
  id: 'inventory', name: '物品栏',
  requires: [],
  files: ['logic.js', 'materials.js', 'ui.js'],
});
