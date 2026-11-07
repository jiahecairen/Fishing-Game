// ===== 物品栏 · 素材 =====
// 素材用于打造套装和完成委托。新素材：CF.content.define('material', 'id', { name, gi, color, desc, src })
'use strict';

Object.entries({
  oldwood:     { name: '老船木', gi: 'oldwood', color: '#b07a4a', desc: '泡过海水的船木，结实又有韧性。', src: '航行中的怪物、海上事件' },
  turtleshell: { name: '龟甲碎片', gi: 'turtleshell', color: '#7cb342', desc: '千年老龟换下来的甲片。', src: '瀑布后的洞穴' },
  pearl:       { name: '潮汐珍珠', gi: 'pearl', color: '#e1f5fe', desc: '涨潮时才会张开的贝壳里的珍珠。', src: '螃蟹岛·潮汐洞窟' },
  stardust:    { name: '星尘', gi: 'stardust', color: '#fff59d', desc: '落进冰里的流星碎屑。', src: '冰晶迷宫、流星事件' },
  icecore:     { name: '冰晶核', gi: 'icecore', color: '#80deea', desc: '永远不会融化的冰。', src: '冰晶迷宫（女王必掉）' },
  whalebone:   { name: '鲸骨碎片', gi: 'whalebone', color: '#d7ccc8', desc: '深渊里古老生物的遗骨。', src: '沉没王座' },
  piratecoin:  { name: '海盗金币', gi: 'piratecoin', color: '#ffd54f', desc: '上面印着一只独眼猫。', src: '海盗湾·独眼喵的宝窟' },
}).forEach(([k, v]) => CF.content.define('material', k, v));
