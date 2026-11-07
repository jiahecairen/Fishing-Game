// ===== 钓鱼 · 数据：稀有度、钓点、鱼、鱼竿、鱼线、鱼饵、道具 =====
// 想加新鱼 / 新钓点：可以直接加在这里；也可以在别的模块里用
//   CF.content.define('fish', 'myfish', {...})  /  CF.content.define('scene', 'myspot', {...})
// tier：钓点等级（决定掉落装备的等级）；monLv：这里出没的怪物等级；noSnow：冬天也不下雪
'use strict';

const RARITY = {
  junk:      { name: '杂物', color: '#a7adb3', weight: 5,   exp: 1,   diff: 0 },
  common:    { name: '普通', color: '#f1f1f1', weight: 100, exp: 5,   diff: 0.2 },
  rare:      { name: '稀有', color: '#4fc3f7', weight: 16,  exp: 20,  diff: 0.5 },
  epic:      { name: '史诗', color: '#d58cf0', weight: 3.5, exp: 80,  diff: 0.75 },
  legendary: { name: '传说', color: '#ffb300', weight: 0.5, exp: 400, diff: 0.95 },
};
const RARITY_ORDER = ['junk', 'common', 'rare', 'epic', 'legendary'];

const SCENE_LIST = [
  { id: 'lake', monLv: [3, 6], tier: 1,  name: '宁静湖畔', price: 0,     desc: '松林环绕的小湖，适合新手小猫。',
    weather: { sunny: 36, cloudy: 28, rain: 18, storm: 5, fog: 13 } },
  { id: 'river', monLv: [9, 13], tier: 2, name: '溪谷急流', price: 3000,  desc: '山谷中奔流的溪水，雨天鱼儿格外活跃。',
    weather: { sunny: 28, cloudy: 30, rain: 24, storm: 10, fog: 8 } },
  { id: 'sea', monLv: [16, 21], tier: 3,   name: '落日海湾', price: 15000, desc: '灯塔守望的海湾，深海大鱼出没。',
    weather: { sunny: 38, cloudy: 24, rain: 14, storm: 14, fog: 10 } },
  { id: 'ice', monLv: [24, 29], tier: 4,   name: '冰封雪湖', price: 60000, desc: '极北的冰湖，夜晚偶见极光。',
    weather: { sunny: 22, cloudy: 26, snow: 40, fog: 12 } },
  { id: 'bamboo', monLv: [8, 12], tier: 2, name: '竹林幽潭', price: 0,     desc: '溪谷深处被竹林包围的深潭，雾气终年不散。',
    weather: { sunny: 24, cloudy: 26, rain: 26, fog: 20, storm: 4 } },
  { id: 'coral', monLv: [16, 21], tier: 3, noSnow: true, name: '珊瑚礁', price: 0,       desc: '海湾外的浅海，阳光下能看到五彩的珊瑚。',
    weather: { sunny: 46, cloudy: 24, rain: 14, storm: 12, fog: 4 } },
  { id: 'abyss', monLv: [32, 36], tier: 5, noSnow: true, name: '深渊之岛', price: 0,     desc: '紫色天空下的寂静海域，深海里的生物会发光。',
    weather: { fog: 34, storm: 20, cloudy: 24, sunny: 22 } },
];


// shape: fish/flat/eel/catfish/shrimp/squid/crab/boot/can/weed/glove
// pattern: none/spots/stripes/glow
// times / weathers: 为空表示不限
const FISH_LIST = [
  // —— 杂物 ——
  { id: 'boot', name: '旧靴子', scenes: ['lake', 'river', 'sea'], rarity: 'junk', min: 24, max: 30, price: 2, shape: 'boot', c1: '#6d4c41', c2: '#3e2723', desc: '不知道是谁丢的，有点臭。' },
  { id: 'can', name: '空易拉罐', scenes: ['lake', 'river', 'sea'], rarity: 'junk', min: 10, max: 12, price: 1, shape: 'can', c1: '#e53935', c2: '#cfd8dc', desc: '请不要乱扔垃圾喵。' },
  { id: 'weed', name: '缠绕的海藻', scenes: ['sea'], rarity: 'junk', min: 20, max: 60, price: 2, shape: 'weed', c1: '#558b2f', c2: '#33691e', desc: '湿漉漉的一大团。' },
  { id: 'glove', name: '冻住的手套', scenes: ['ice'], rarity: 'junk', min: 18, max: 22, price: 3, shape: 'glove', c1: '#5c6bc0', c2: '#e8eaf6', desc: '硬得像一块冰砖。' },

  // —— 宁静湖畔 ——
  { id: 'crucian', name: '鲫鱼', scenes: ['lake'], rarity: 'common', min: 10, max: 28, price: 8, shape: 'fish', c1: '#8d8a5f', c2: '#dcd8a8', desc: '湖里最常见的鱼，小猫的家常菜。' },
  { id: 'carp', name: '鲤鱼', scenes: ['lake'], rarity: 'common', min: 25, max: 70, price: 16, shape: 'fish', c1: '#b8862b', c2: '#f1d48c', desc: '体型饱满，力气不小。' },
  { id: 'grass', name: '草鱼', scenes: ['lake'], rarity: 'common', min: 40, max: 100, price: 22, shape: 'fish', c1: '#6b7d4a', c2: '#cdd8a4', times: ['dawn', 'day'], desc: '白天在水草边觅食。' },
  { id: 'bream', name: '鳊鱼', scenes: ['lake'], rarity: 'common', min: 20, max: 45, price: 14, shape: 'flat', c1: '#9aa3ab', c2: '#e6eaee', times: ['dawn', 'dusk'], desc: '扁扁的身体，晨昏时分最活跃。' },
  { id: 'crayfish', name: '小龙虾', scenes: ['lake'], rarity: 'common', min: 8, max: 15, price: 12, shape: 'shrimp', c1: '#c0392b', c2: '#e57368', weathers: ['rain', 'storm', 'cloudy'], desc: '阴雨天会爬出来晒钳子。' },
  { id: 'yellowcat', name: '黄颡鱼', scenes: ['lake'], rarity: 'rare', min: 15, max: 30, price: 55, shape: 'catfish', c1: '#c9a227', c2: '#4a4026', times: ['night'], desc: '夜行性，被钓起时会“嘎嘎”叫。' },
  { id: 'mandarin', name: '鳜鱼', scenes: ['lake'], rarity: 'rare', min: 25, max: 50, price: 90, shape: 'fish', pattern: 'spots', c1: '#8a7a3a', c2: '#d9c98a', times: ['dawn', 'dusk'], tier: 2, desc: '桃花流水鳜鱼肥。' },
  { id: 'blackcarp', name: '青鱼', scenes: ['lake'], rarity: 'rare', min: 60, max: 130, price: 75, shape: 'fish', c1: '#2f3e46', c2: '#7b8a90', weathers: ['cloudy', 'rain', 'fog'], desc: '湖底的大家伙，喜欢阴天。' },
  { id: 'koi', name: '锦鲤', scenes: ['lake'], rarity: 'epic', min: 30, max: 80, price: 320, shape: 'fish', pattern: 'spots', c1: '#ffffff', c2: '#e53935', times: ['day'], weathers: ['sunny'], tier: 2, desc: '据说钓到它会转运喵！' },
  { id: 'lakegod', name: '湖神金鲤', scenes: ['lake'], rarity: 'legendary', min: 90, max: 160, price: 3500, shape: 'fish', pattern: 'glow', c1: '#ffd54f', c2: '#ff8f00', times: ['night'], weathers: ['fog'], tier: 4, desc: '雾夜中闪着金光的湖之主。' },

  // —— 溪谷急流 ——
  { id: 'zacco', name: '溪哥', scenes: ['river'], rarity: 'common', min: 8, max: 18, price: 12, shape: 'fish', pattern: 'stripes', c1: '#5c8fb0', c2: '#e57373', desc: '溪流里的小精灵，色彩鲜艳。' },
  { id: 'opsariichthys', name: '马口鱼', scenes: ['river'], rarity: 'common', min: 12, max: 25, price: 15, shape: 'fish', c1: '#6f8fa8', c2: '#d7e3ec', times: ['day', 'dawn'], desc: '嘴巴很大，咬钩凶猛。' },
  { id: 'ricefield', name: '黄鳝', scenes: ['river'], rarity: 'common', min: 30, max: 60, price: 20, shape: 'eel', c1: '#8d6e3f', c2: '#d4b483', weathers: ['rain', 'storm'], desc: '雨后从泥洞里钻出来。' },
  { id: 'trout', name: '虹鳟', scenes: ['river'], rarity: 'rare', min: 30, max: 70, price: 65, shape: 'fish', pattern: 'stripes', c1: '#7cb342', c2: '#f48fb1', times: ['dawn', 'day'], desc: '身侧有一道彩虹般的条纹。' },
  { id: 'catfish', name: '鲶鱼', scenes: ['river'], rarity: 'rare', min: 40, max: 120, price: 75, shape: 'catfish', c1: '#4e4a3a', c2: '#9e9a80', times: ['night', 'dusk'], desc: '长着胡子，和小猫有点像？' },
  { id: 'eel', name: '鳗鱼', scenes: ['river'], rarity: 'rare', min: 50, max: 110, price: 110, shape: 'eel', c1: '#37474f', c2: '#90a4ae', times: ['night'], tier: 2, desc: '滑溜溜的，很难抓稳。' },
  { id: 'sturgeon', name: '中华鲟', scenes: ['river'], rarity: 'epic', min: 120, max: 250, price: 900, shape: 'fish', pattern: 'spots', c1: '#546e7a', c2: '#b0bec5', weathers: ['rain', 'storm'], tier: 3, desc: '活化石，钓到后请拍照留念。' },
  { id: 'goldscale', name: '河伯金鳞', scenes: ['river'], rarity: 'legendary', min: 150, max: 260, price: 6000, shape: 'fish', pattern: 'glow', c1: '#ffca28', c2: '#e65100', times: ['night'], weathers: ['storm'], tier: 4, desc: '雷暴之夜逆流而上的金龙。' },

  // —— 落日海湾 ——
  { id: 'sardine', name: '沙丁鱼', scenes: ['sea'], rarity: 'common', min: 10, max: 20, price: 10, shape: 'fish', c1: '#607d8b', c2: '#dfe7ea', desc: '成群结队，银光闪闪。' },
  { id: 'mackerel', name: '鲭鱼', scenes: ['sea'], rarity: 'common', min: 25, max: 45, price: 20, shape: 'fish', pattern: 'stripes', c1: '#1e88e5', c2: '#e3eef7', times: ['day', 'dawn'], desc: '背上有漂亮的波浪纹。' },
  { id: 'saury', name: '秋刀鱼', scenes: ['sea'], rarity: 'common', min: 25, max: 35, price: 18, shape: 'eel', c1: '#546e7a', c2: '#cfd8dc', times: ['dusk', 'night'], seasons: ['autumn'], desc: '烤着吃最香喵～只在秋天洄游到这里。' },
  { id: 'seabream', name: '真鲷', scenes: ['sea'], rarity: 'rare', min: 30, max: 60, price: 120, shape: 'flat', c1: '#ef5350', c2: '#ffcdd2', times: ['day'], weathers: ['sunny', 'cloudy'], tier: 2, desc: '喜庆的红色，宴席上的贵客。' },
  { id: 'squid', name: '鱿鱼', scenes: ['sea'], rarity: 'rare', min: 20, max: 50, price: 90, shape: 'squid', c1: '#f8bbd0', c2: '#ec407a', times: ['night'], desc: '会喷墨，小心胡子被染黑。' },
  { id: 'lantern', name: '灯笼鱼', scenes: ['sea'], rarity: 'rare', min: 8, max: 15, price: 150, shape: 'fish', pattern: 'glow', c1: '#263238', c2: '#80deea', times: ['night'], weathers: ['fog', 'cloudy'], desc: '身上的小灯在雾里一闪一闪。' },
  { id: 'tuna', name: '蓝鳍金枪鱼', scenes: ['sea'], rarity: 'epic', min: 100, max: 250, price: 1500, shape: 'fish', c1: '#0d47a1', c2: '#cfd8dc', times: ['day', 'dawn'], tier: 3, desc: '海洋中的鱼雷，力量惊人。' },
  { id: 'marlin', name: '旗鱼', scenes: ['sea'], rarity: 'epic', min: 150, max: 300, price: 1800, shape: 'fish', pattern: 'stripes', c1: '#1565c0', c2: '#90caf9', weathers: ['sunny'], tier: 3, desc: '背鳍像一面船帆。' },
  { id: 'whaleshark', name: '鲸鲨', scenes: ['sea'], rarity: 'legendary', min: 600, max: 1200, price: 12000, shape: 'fish', pattern: 'spots', c1: '#37474f', c2: '#eceff1', weathers: ['storm'], tier: 4, desc: '温柔的巨人……怎么钓上来的？' },

  // —— 冰封雪湖 ——
  { id: 'icefish', name: '冰鱼', scenes: ['ice'], rarity: 'common', min: 8, max: 15, price: 22, shape: 'fish', c1: '#b2ebf2', c2: '#ffffff', desc: '几乎透明，血液里没有红细胞。' },
  { id: 'cod', name: '鳕鱼', scenes: ['ice'], rarity: 'common', min: 40, max: 90, price: 38, shape: 'fish', pattern: 'spots', c1: '#8d8d6f', c2: '#e0dfc8', desc: '肉质雪白细嫩。' },
  { id: 'smelt', name: '胡瓜鱼', scenes: ['ice'], rarity: 'common', min: 10, max: 20, price: 25, shape: 'eel', c1: '#90a4ae', c2: '#e0f2f1', times: ['dawn', 'day'], desc: '闻起来竟然有黄瓜味。' },
  { id: 'charr', name: '北极红点鲑', scenes: ['ice'], rarity: 'rare', min: 30, max: 70, price: 170, shape: 'fish', pattern: 'spots', c1: '#546e7a', c2: '#e57373', times: ['dawn', 'dusk'], tier: 2, desc: '冰水中最耀眼的红点。' },
  { id: 'icepike', name: '冰川狗鱼', scenes: ['ice'], rarity: 'rare', min: 60, max: 120, price: 210, shape: 'eel', pattern: 'stripes', c1: '#4b6043', c2: '#c5d6a8', weathers: ['snow', 'fog'], tier: 2, desc: '牙齿锋利的冰下猎手。' },
  { id: 'kingcrab', name: '帝王蟹', scenes: ['ice'], rarity: 'epic', min: 40, max: 90, price: 2200, shape: 'crab', c1: '#c62828', c2: '#ffab91', times: ['night', 'dusk'], weathers: ['snow'], tier: 3, desc: '钳子一夹，猫爪生疼。' },
  { id: 'aurora', name: '极光鲑', scenes: ['ice'], rarity: 'legendary', min: 80, max: 140, price: 25000, shape: 'fish', pattern: 'glow', c1: '#80deea', c2: '#b388ff', times: ['night'], weathers: ['sunny'], tier: 5, desc: '只在晴朗的极光之夜现身。' },

  // —— 季节限定（不计入兑换地址所需的图鉴） ——
  { id: 'sakura', name: '樱花鲤', scenes: ['lake'], rarity: 'rare', min: 30, max: 60, price: 130, shape: 'fish', pattern: 'spots', c1: '#ffe4ec', c2: '#ff8fab', seasons: ['spring'], desc: '只在樱花盛开的季节出现，鳞片带着淡淡粉色。' },
  { id: 'sockeye', name: '红鲑', scenes: ['river'], rarity: 'rare', min: 50, max: 80, price: 150, shape: 'fish', c1: '#c62828', c2: '#7cb342', seasons: ['autumn'], desc: '秋天逆流而上，回到出生的溪流。' },
  { id: 'snowcrab', name: '雪蟹', scenes: ['ice'], rarity: 'rare', min: 20, max: 40, price: 260, shape: 'crab', c1: '#ef9a9a', c2: '#ffffff', seasons: ['winter'], desc: '冬天才会爬到冰洞附近。' },
  { id: 'summersquid', name: '萤火鱿', scenes: ['sea'], rarity: 'rare', min: 6, max: 12, price: 140, shape: 'squid', c1: '#80deea', c2: '#1565c0', seasons: ['summer'], times: ['night'], desc: '夏夜里成群发光，像海上的萤火虫。' },

  // —— 竹林幽潭 ——
  { id: 'tube', name: '旧竹筒', scenes: ['bamboo'], rarity: 'junk', min: 20, max: 30, price: 4, shape: 'can', c1: '#8bc34a', c2: '#558b2f', desc: '里面塞着一张写着“平安”的纸条。' },
  { id: 'loach', name: '泥鳅', scenes: ['bamboo'], rarity: 'common', min: 10, max: 20, price: 30, shape: 'eel', c1: '#6d5a3a', c2: '#b39b72', desc: '滑溜溜的，会钻泥巴。' },
  { id: 'whitefish', name: '白条', scenes: ['bamboo'], rarity: 'common', min: 10, max: 22, price: 26, shape: 'fish', c1: '#b0bec5', c2: '#eceff1', desc: '一群一群地在水面游。' },
  { id: 'acro', name: '光唇鱼', scenes: ['bamboo'], rarity: 'common', min: 15, max: 30, price: 34, shape: 'fish', pattern: 'stripes', c1: '#5d6b4a', c2: '#c5cfa0', times: ['dawn', 'day'], desc: '嘴唇亮亮的，很爱干净。' },
  { id: 'spinibar', name: '倒刺鲃', scenes: ['bamboo'], rarity: 'rare', min: 30, max: 60, price: 170, shape: 'fish', c1: '#546e7a', c2: '#cfd8dc', weathers: ['rain', 'fog'], desc: '背鳍上有一根倒刺，别被扎到。' },
  { id: 'masu', name: '樱鳟', scenes: ['bamboo'], rarity: 'rare', min: 30, max: 55, price: 190, shape: 'fish', pattern: 'spots', c1: '#8d6e63', c2: '#f8bbd0', seasons: ['spring'], desc: '春天会染上樱花一样的颜色。' },
  { id: 'ayu', name: '香鱼', scenes: ['bamboo'], rarity: 'rare', min: 15, max: 30, price: 210, shape: 'fish', c1: '#9e9d24', c2: '#f0f4c3', seasons: ['summer'], desc: '带着西瓜的清香，夏天的味道。' },
  { id: 'rouge', name: '胭脂鱼', scenes: ['bamboo'], rarity: 'epic', min: 50, max: 100, price: 1400, shape: 'flat', c1: '#ad1457', c2: '#f8bbd0', tier: 3, desc: '身上像抹了胭脂，被称为“一帆风顺”。' },
  { id: 'bamdragon', name: '竹林青龙', scenes: ['bamboo'], rarity: 'legendary', min: 150, max: 260, price: 9000, shape: 'eel', pattern: 'glow', c1: '#2e7d32', c2: '#a5d6a7', times: ['night'], weathers: ['fog'], tier: 4, desc: '雾夜里在竹影间游动的青色长龙。' },

  // —— 珊瑚礁 ——
  { id: 'shell', name: '彩色贝壳', scenes: ['coral'], rarity: 'junk', min: 5, max: 10, price: 8, shape: 'can', c1: '#ffab91', c2: '#fff3e0', desc: '放在耳边能听到海的声音。' },
  { id: 'clown', name: '小丑鱼', scenes: ['coral'], rarity: 'common', min: 6, max: 11, price: 40, shape: 'fish', pattern: 'stripes', c1: '#ff7043', c2: '#ffffff', desc: '住在海葵里，一点也不怕人。' },
  { id: 'tang', name: '蓝倒吊', scenes: ['coral'], rarity: 'common', min: 15, max: 30, price: 45, shape: 'flat', c1: '#1e88e5', c2: '#ffeb3b', desc: '记性好像不太好的样子。' },
  { id: 'grouper', name: '石斑鱼', scenes: ['coral'], rarity: 'rare', min: 40, max: 90, price: 260, shape: 'fish', pattern: 'spots', c1: '#6d4c41', c2: '#d7ccc8', desc: '躲在珊瑚缝里，一口能吞下一条小鱼。' },
  { id: 'lion', name: '狮子鱼', scenes: ['coral'], rarity: 'rare', min: 20, max: 38, price: 280, shape: 'fish', pattern: 'stripes', c1: '#d84315', c2: '#fff3e0', times: ['dusk', 'night'], desc: '漂亮的鳍上有毒，看看就好。' },
  { id: 'lobster', name: '锦绣龙虾', scenes: ['coral'], rarity: 'rare', min: 20, max: 45, price: 300, shape: 'shrimp', c1: '#e64a19', c2: '#ffcc80', desc: '花纹像锦缎一样。' },
  { id: 'manta', name: '蝠鲼', scenes: ['coral'], rarity: 'epic', min: 200, max: 400, price: 2400, shape: 'flat', c1: '#263238', c2: '#eceff1', weathers: ['sunny'], tier: 3, desc: '像一块会飞的毯子。' },
  { id: 'napoleon', name: '苏眉鱼', scenes: ['coral'], rarity: 'epic', min: 80, max: 180, price: 2600, shape: 'fish', c1: '#00897b', c2: '#80cbc4', times: ['day'], tier: 3, desc: '额头鼓鼓的，像戴了一顶帽子。' },
  { id: 'goldnap', name: '黄金苏眉', scenes: ['coral'], rarity: 'legendary', min: 120, max: 220, price: 15000, shape: 'fish', pattern: 'glow', c1: '#ffd54f', c2: '#ffb300', weathers: ['storm'], tier: 4, desc: '雷暴中闪着金光的珊瑚之王。' },

  // —— 深渊之岛 ——
  { id: 'coin', name: '沉船铜币', scenes: ['abyss'], rarity: 'junk', min: 3, max: 4, price: 60, shape: 'can', c1: '#b08d57', c2: '#7a5a2a', desc: '上面刻着一只猫的头像。' },
  { id: 'ajelly', name: '幽灵水母', scenes: ['abyss'], rarity: 'common', min: 10, max: 30, price: 70, shape: 'squid', c1: '#d1c4e9', c2: '#7e57c2', desc: '半透明的身体里有一颗小星星。' },
  { id: 'ashrimp', name: '紫晶虾', scenes: ['abyss'], rarity: 'common', min: 8, max: 16, price: 60, shape: 'shrimp', c1: '#9c27b0', c2: '#e1bee7', desc: '壳像紫水晶一样闪闪发光。' },
  { id: 'aangler', name: '深渊鮟鱇', scenes: ['abyss'], rarity: 'rare', min: 30, max: 70, price: 260, shape: 'fish', pattern: 'glow', c1: '#3a2a5a', c2: '#b388ff', times: ['night', 'dusk'], tier: 3, desc: '头上的小灯是用来交朋友的。' },
  { id: 'aeel', name: '深渊鳗', scenes: ['abyss'], rarity: 'rare', min: 60, max: 140, price: 300, shape: 'eel', c1: '#311b92', c2: '#7c4dff', weathers: ['fog', 'storm'], tier: 3, desc: '在雾里游动时几乎看不见。' },
  { id: 'apuffer', name: '星光河豚', scenes: ['abyss'], rarity: 'rare', min: 15, max: 35, price: 280, shape: 'flat', pattern: 'spots', c1: '#4a148c', c2: '#ffd54f', times: ['night'], tier: 3, desc: '身上的斑点像一片小星空。' },
  { id: 'acoel', name: '腔棘鱼', scenes: ['abyss'], rarity: 'epic', min: 120, max: 200, price: 2800, shape: 'fish', pattern: 'spots', c1: '#283593', c2: '#90caf9', tier: 4, desc: '比恐龙还古老的鱼。' },
  { id: 'aheart', name: '深渊之心', scenes: ['abyss'], rarity: 'legendary', min: 90, max: 150, price: 40000, shape: 'fish', pattern: 'glow', c1: '#7c4dff', c2: '#ff80ab', times: ['night'], weathers: ['storm'], tier: 5, desc: '据说是墨的眼泪变成的。' },
];

// speed: 上钩时间倍率（越小越快） control: 控鱼（降低脱钩） luck: 幸运（提高稀有） tier: 可钓等级
const RODS = [
  { id: 'bamboo', name: '竹竿',   price: 0,      speed: 1.0,  control: 0.30, luck: 0,    tier: 1, icon: '🎋', desc: '奶奶留下的老竹竿。' },
  { id: 'carbon', name: '碳素竿', price: 800,    speed: 0.85, control: 0.42, luck: 0.05, tier: 2, icon: '🎣', desc: '轻巧耐用，可钓二级鱼。' },
  { id: 'alloy',  name: '合金竿', price: 6000,   speed: 0.72, control: 0.55, luck: 0.12, tier: 3, icon: '🎣', desc: '可挑战史诗级大鱼。' },
  { id: 'gold',   name: '黄金竿', price: 35000,  speed: 0.6,  control: 0.68, luck: 0.22, tier: 4, icon: '✨', desc: '闪闪发光，传说之鱼也心动。' },
  { id: 'star',   name: '星辰竿', price: 180000, speed: 0.48, control: 0.82, luck: 0.35, tier: 5, icon: '🌟', desc: '以星光织就，可钓一切。' },
];
const LINES = [
  { id: 'basic',    name: '普通鱼线', price: 0,     control: 0,    icon: '🧵', desc: '能用就行。' },
  { id: 'nylon',    name: '尼龙线',   price: 1500,  control: 0.08, icon: '🧶', desc: '控鱼 +8%' },
  { id: 'titanium', name: '钛合金线', price: 12000, control: 0.16, icon: '🪢', desc: '控鱼 +16%' },
  { id: 'silk',     name: '天蚕丝',   price: 60000, control: 0.25, icon: '🕸️', desc: '控鱼 +25%' },
];
// mult: 各稀有度权重倍率
const BAITS = [
  { id: 'dough',   name: '面团',       price: 0,   infinite: true, bite: 1.0,  mult: { junk: 1.3, common: 1, rare: 1, epic: 1, legendary: 1 }, icon: '🍙', desc: '无限供应的基础鱼饵。' },
  { id: 'worm',    name: '蚯蚓',       price: 4,   bite: 0.85, mult: { junk: 0.8, common: 1.2, rare: 1.1, epic: 1, legendary: 1 }, icon: '🪱', desc: '上钩更快，普通鱼最爱。' },
  { id: 'shrimp',  name: '鲜虾',       price: 15,  bite: 0.85, mult: { junk: 0.6, common: 1, rare: 1.6, epic: 1.2, legendary: 1.1 }, icon: '🦐', desc: '稀有鱼概率 ×1.6' },
  { id: 'lure',    name: '亮片拟饵',   price: 50,  bite: 0.9,  mult: { junk: 0.5, common: 0.9, rare: 2.0, epic: 1.8, legendary: 1.4 }, icon: '🪩', desc: '稀有 ×2，史诗 ×1.8' },
  { id: 'catnip',  name: '秘制猫薄荷饵', price: 250, bite: 0.75, mult: { junk: 0.3, common: 0.8, rare: 2.2, epic: 3.0, legendary: 3.0 }, icon: '🌿', desc: '史诗与传说 ×3！' },
];
const ITEM_LIST = [
  { id: 'luckbell',  name: '幸运猫铃', price: 500,  type: 'consumable', icon: '🔔', desc: '使用后 10 分钟内幸运 +30%。' },
  { id: 'raincharm', name: '祈雨符',   price: 800,  type: 'consumable', icon: '🌧️', desc: '立即让天气变为小雨（冰湖为飘雪）。' },
  { id: 'sundoll',   name: '晴天娃娃', price: 800,  type: 'consumable', icon: '🧸', desc: '立即让天气放晴。' },
  { id: 'fogbottle', name: '雾之瓶',   price: 1500, type: 'consumable', icon: '🫙', desc: '立即召来大雾，稀有鱼更多。' },
  { id: 'glowfloat', name: '夜光浮漂', price: 3000, type: 'permanent', icon: '🏮', desc: '夜晚不再减速，反而上钩更快。' },
  { id: 'autostore', name: '自动收纳盒', price: 2000, type: 'permanent', icon: '📦', desc: '背包满时自动把鱼送进仓库。' },
  { id: 'luckycat',  name: '招财猫',   price: 4000, type: 'permanent', icon: '🐱', desc: '解锁“满仓时自动出售普通鱼和杂物”。' },
];


// ---------- 注册到内容表 ----------
const FISH = [], FISH_BY_ID = {}, ITEMS = [], ITEM_BY_ID = {};
CF.content.type('fish', { list: FISH, map: FISH_BY_ID });       // 能钓起来的东西（宝藏模块也会往这里加钥匙、宝箱）
CF.content.type('item', { list: ITEMS, map: ITEM_BY_ID });      // 道具
CF.content.type('rod', { list: RODS }); CF.content.type('line', { list: LINES }); CF.content.type('bait', { list: BAITS });
SCENE_LIST.forEach(s => CF.content.define('scene', s.id, s));
FISH_LIST.forEach(f => CF.content.define('fish', f.id, f));
ITEM_LIST.forEach(i => CF.content.define('item', i.id, i));
