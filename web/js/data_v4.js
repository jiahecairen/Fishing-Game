// ===== v0.4 数据：新钓点航线、船只耐久与船舱、素材、套装、任务、委托、料理、寄卖行 =====
'use strict';

// ---------- 新钓点 ----------
ROUTES.splice(1, 0, { from: 'river', to: 'bamboo', boat: 1, fish: 40, dur: 300, lv: [8, 12], mons: ['frog', 'snake', 'gull'] });
ROUTES.splice(3, 0, { from: 'sea', to: 'coral', boat: 2, fish: 60, dur: 420, lv: [16, 21], mons: ['shark', 'pirate', 'squidm'] });
Object.assign(PLACES, { bamboo: { name: '竹林幽潭', icon: '🎋' }, coral: { name: '珊瑚礁', icon: '🐠' } });
Object.assign(REGION_LV, { bamboo: [8, 12], coral: [16, 21] });
Object.assign(HUNT_MONS, { bamboo: ['snake', 'frog'], coral: ['shark', 'pirate'] });
Object.assign(SCENE_CHEST, { bamboo: 'chest_wood', coral: 'chest_silver' });
const SCENE_TIER = { lake: 1, river: 2, bamboo: 2, sea: 3, coral: 3, ice: 4, abyss: 5 };
const PLACE_ORDER = ['lake', 'river', 'bamboo', 'sea', 'coral', 'ice', 'abyss'];
Object.assign(STORY, {
  addr_bamboo: [['otter', '溪谷上游还有一处竹林深潭。那里的雾，连鸟都会迷路。'], ['otter', '小木船就能去，带上 40 条鱼当补给。']],
  addr_coral: [['otter', '海湾外有一片珊瑚礁，水清得能看见鱼的表情。'], ['otter', '要帆船，补给 60 条鱼。听说那里的鱼……都很贵。']],
  arrive_bamboo: [['narr', '* 竹叶沙沙作响。水面上漂着一层薄雾。'], ['pao', '好安静……安静得我能听见自己的泡泡。']],
  arrive_coral: [['narr', '* 海水是透明的绿色。脚下的珊瑚五颜六色。'], ['pao', '哇——这里的鱼穿得好花哨！']],
});

// ---------- 船：耐久与船舱 ----------
BOATS[1].hp = 100; BOATS[2].hp = 160; BOATS[3].hp = 240;
BOATS[1].holdBase = 10; BOATS[2].holdBase = 20; BOATS[3].holdBase = 35;
BOAT_UPS.hold = { name: '扩建船舱', gi: 'crate', max: 5, desc: lv => `船舱 +${lv * 10} 格`, cost: lv => Math.round(2500 * Math.pow(lv + 1, 1.9) / 10) * 10 };
BOAT_UPS.hull = { name: '加固船体', gi: 'anchor', max: 4, desc: lv => `耐久上限 +${lv * 40}，事件伤害 -${lv * 15}%`, cost: lv => Math.round(3000 * Math.pow(lv + 1, 1.9) / 10) * 10 };
const REPAIR_PER_HP = 6;     // 每点耐久的修理费 × 船的等级
const FERRY_TIME = 60;       // 去已经到过的地方：短途航行

// ---------- 素材 ----------
const MATERIALS = {
  oldwood:     { name: '老船木', gi: 'oldwood', color: '#b07a4a', desc: '泡过海水的船木，结实又有韧性。', src: '航行中的怪物、海上事件' },
  turtleshell: { name: '龟甲碎片', gi: 'turtleshell', color: '#7cb342', desc: '千年老龟换下来的甲片。', src: '瀑布后的洞穴' },
  pearl:       { name: '潮汐珍珠', gi: 'pearl', color: '#e1f5fe', desc: '涨潮时才会张开的贝壳里的珍珠。', src: '螃蟹岛·潮汐洞窟' },
  stardust:    { name: '星尘', gi: 'stardust', color: '#fff59d', desc: '落进冰里的流星碎屑。', src: '冰晶迷宫、流星事件' },
  icecore:     { name: '冰晶核', gi: 'icecore', color: '#80deea', desc: '永远不会融化的冰。', src: '冰晶迷宫（女王必掉）' },
  whalebone:   { name: '鲸骨碎片', gi: 'whalebone', color: '#d7ccc8', desc: '深渊里古老生物的遗骨。', src: '沉没王座' },
  piratecoin:  { name: '海盗金币', gi: 'piratecoin', color: '#ffd54f', desc: '上面印着一只独眼猫。', src: '海盗湾·独眼喵的宝窟' },
};
// 怪物掉落素材 [素材, 概率, 数量]
const MON_MATS = {
  gull: ['oldwood', 0.2, 1], frog: ['oldwood', 0.15, 1], snake: ['oldwood', 0.2, 1], shark: ['oldwood', 0.25, 1], squidm: ['oldwood', 0.25, 1], seal: ['oldwood', 0.25, 1], serpent: ['oldwood', 0.3, 2],
  pirate: ['piratecoin', 0.3, 1], skelcat: ['piratecoin', 0.35, 1], parrot: ['piratecoin', 0.35, 1], onecap: ['piratecoin', 1, 6],
  bat: ['turtleshell', 0.3, 1], rock: ['turtleshell', 0.3, 1], turtle: ['turtleshell', 1, 4],
  hermit: ['pearl', 0.3, 1], jelly: ['pearl', 0.3, 1], octo: ['pearl', 0.3, 1], crabgen: ['pearl', 1, 4],
  sprite: ['stardust', 0.25, 1], peng: ['icecore', 0.12, 1], bear: ['stardust', 0.25, 1], queen: ['icecore', 1, 3],
  ghost: ['whalebone', 0.3, 1], puffer: ['whalebone', 0.3, 1], bonef: ['whalebone', 0.35, 1], mo: ['whalebone', 1, 5],
};

// ---------- 套装（不能合成，只能通过任务拿到图纸，再找工匠打造） ----------
Object.assign(UNIQUES, {
  sa_w: { name: '渔夫的鱼叉', slot: 'weapon', tier: 4, set: 'angler', stats: { atk: 80, crit: 0.06, luck: 0.1 }, src: '任务「渔夫之魂」' },
  sa_h: { name: '渔夫的斗笠', slot: 'hat', tier: 3, set: 'angler', stats: { maxHp: 140, def: 16, luck: 0.1 }, src: '任务「渔夫之魂」' },
  sa_a: { name: '渔夫的蓑衣', slot: 'armor', tier: 4, set: 'angler', stats: { maxHp: 320, def: 36 }, src: '任务「渔夫之魂」' },
  st_b: { name: '深潮战靴', slot: 'boots', tier: 4, set: 'tide', stats: { spd: 16, def: 18 }, src: '任务「深海潮汐」' },
  st_h: { name: '深潮之冠', slot: 'hat', tier: 4, set: 'tide', stats: { maxHp: 200, def: 24 }, src: '任务「深海潮汐」' },
  st_a: { name: '深潮铠甲', slot: 'armor', tier: 5, set: 'tide', stats: { maxHp: 460, def: 52 }, src: '任务「深海潮汐」' },
  ss_c: { name: '星落吊坠', slot: 'charm', tier: 5, set: 'star', stats: { maxHp: 180, crit: 0.14, luck: 0.15 }, src: '任务「星落」' },
  ss_b: { name: '星落之靴', slot: 'boots', tier: 5, set: 'star', stats: { spd: 24, def: 20 }, src: '任务「星落」' },
  ss_w: { name: '星落之刃', slot: 'weapon', tier: 5, set: 'star', stats: { atk: 120, crit: 0.12 }, src: '任务「星落」' },
});
for (const k of ['sa_w', 'sa_h', 'sa_a', 'st_b', 'st_h', 'st_a', 'ss_c', 'ss_b', 'ss_w']) {
  const U = UNIQUES[k];
  GI[k] = GI[{ weapon: U.set === 'angler' ? 'w2' : 'w5', hat: U.set === 'angler' ? 'h1' : 'h5', armor: U.set === 'angler' ? 'a2' : 'a5', boots: 'b5', charm: 'c4' }[U.slot]];
}
const SET_COLOR = '#3ee0c0';
const SETS = {
  angler: { name: '渔夫之魂', pieces: ['sa_w', 'sa_h', 'sa_a'], b2: '钓鱼幸运 +20%，上钩速度 +15%', b3: '每回合额外 +1 行动点，攻击 +10%' },
  tide: { name: '深海潮汐', pieces: ['st_h', 'st_a', 'st_b'], b2: '生命 +15%', b3: '每回合回复 5% 生命，受到攻击时反弹 15% 伤害' },
  star: { name: '星落', pieces: ['ss_c', 'ss_b', 'ss_w'], b2: '暴击率 +12%', b3: '暴击伤害 +60%，暴击时 +1 行动点' },
};
// 图纸 → 材料（找工匠打造）
const SET_RECIPES = {
  sa_h: { mats: { oldwood: 6, turtleshell: 4 }, fish: [['carp', 10]], coins: 15000 },
  sa_w: { mats: { oldwood: 10, pearl: 6 }, fish: [['blackcarp', 5]], items: { raincharm: 2 }, coins: 40000 },
  sa_a: { mats: { oldwood: 15, turtleshell: 10, piratecoin: 6 }, fish: [['mandarin', 4]], coins: 90000 },
  st_b: { mats: { pearl: 12, oldwood: 6 }, fish: [['seabream', 6]], coins: 40000 },
  st_h: { mats: { pearl: 15, icecore: 5 }, fish: [['marlin', 2]], coins: 80000 },
  st_a: { mats: { pearl: 20, whalebone: 12, icecore: 8 }, fish: [['acoel', 2]], coins: 200000 },
  ss_c: { mats: { stardust: 15 }, fish: [['charr', 6]], items: { luckbell: 5 }, coins: 60000 },
  ss_b: { mats: { stardust: 20, icecore: 10 }, fish: [['icepike', 4]], coins: 150000 },
  ss_w: { mats: { stardust: 30, whalebone: 15, icecore: 12 }, fish: [['acoel', 1]], coins: 300000 },
};

// ---------- 任务线（套装） ----------
// 步骤：talk 对话 / submit 上交 / catch 钓到指定鱼 / clear 通关副本
// need: [类型, id, 数量]  类型 fish|item|bait|mat|treasure|dish|coins
const QUESTS = [
  { id: 'q1', name: '渔夫之魂', set: 'angler', clue: { name: '老渔夫的日记', gi: 'notebook', from: '藏宝图终点' },
    steps: [
      { type: 'talk', text: '读一读老渔夫的日记', story: 'q1_0' },
      { type: 'submit', text: '把日记和渔获交给獭爷爷', need: [['fish', 'crucian', 15], ['item', 'sundoll', 3]], story: 'q1_1', recipe: 'sa_h' },
      { type: 'catch', text: '在雨天钓到 3 条青鱼', fish: 'blackcarp', n: 3, weather: 'rain', story: 'q1_2' },
      { type: 'submit', text: '准备鱼叉的“好运与耐心”', need: [['bait', 'worm', 30], ['item', 'raincharm', 2], ['fish', 'koi', 1]], story: 'q1_3', recipe: 'sa_w' },
      { type: 'clear', text: '去瀑布后的洞穴寻找阿岩的足迹', dungeon: 'falls', story: 'q1_4' },
      { type: 'submit', text: '为蓑衣备齐材料', need: [['mat', 'turtleshell', 8], ['fish', 'mandarin', 3], ['coins', '', 20000]], story: 'q1_5', recipe: 'sa_a' },
    ] },
  { id: 'q2', name: '深海潮汐', set: 'tide', clue: { name: '破损的潮汐石板', gi: 'tablet', from: '螃蟹岛·潮汐洞窟' },
    steps: [
      { type: 'talk', text: '把石板拿给螃蟹将军看', story: 'q2_0' },
      { type: 'submit', text: '献上潮汐的供品', need: [['mat', 'pearl', 8], ['fish', 'seabream', 4]], story: 'q2_1', recipe: 'st_b' },
      { type: 'catch', text: '在晴天钓到 2 条旗鱼', fish: 'marlin', n: 2, weather: 'sunny', story: 'q2_2' },
      { type: 'submit', text: '将军的“生日礼物”', need: [['treasure', 'chest_silver', 2], ['item', 'luckbell', 3], ['bait', 'lure', 10]], story: 'q2_3', recipe: 'st_h' },
      { type: 'clear', text: '去冰晶迷宫找石板的另一半', dungeon: 'crystal', story: 'q2_4' },
      { type: 'submit', text: '为深潮铠甲备齐材料', need: [['mat', 'whalebone', 10], ['fish', 'aangler', 3], ['coins', '', 60000]], story: 'q2_5', recipe: 'st_a' },
    ] },
  { id: 'q3', name: '星落', set: 'star', clue: { name: '坠落的星图', gi: 'starmap', from: '冰晶迷宫 / 流星' },
    steps: [
      { type: 'talk', text: '研究星图', story: 'q3_0' },
      { type: 'submit', text: '收集坠落的星星', need: [['mat', 'stardust', 10], ['bait', 'catnip', 15]], story: 'q3_1', recipe: 'ss_c' },
      { type: 'catch', text: '钓到星星在水里的影子——极光鲑', fish: 'aurora', n: 1, story: 'q3_2' },
      { type: 'submit', text: '冻住流星的光', need: [['mat', 'icecore', 10], ['item', 'fogbottle', 3], ['treasure', 'chest_gold', 1]], story: 'q3_3', recipe: 'ss_b' },
      { type: 'clear', text: '去沉没王座问问墨', dungeon: 'abyss', story: 'q3_4' },
      { type: 'submit', text: '为星落之刃备齐材料', need: [['mat', 'whalebone', 15], ['mat', 'stardust', 20], ['coins', '', 120000]], story: 'q3_5', recipe: 'ss_w' },
    ] },
];

// ---------- 委托（一次性支线，大多数道具都有用武之地） ----------
const REQUESTS = [
  { id: 'r_pao', npc: 'pao', title: '泡泡想吃烤鱼串', text: '“闻到烤鱼的味道了……能给我两串吗？就两串！”', need: [['dish', 'grill', 2]], reward: { cook: 'sweet', coins: 300 } },
  { id: 'r_lantern', npc: 'pao', title: '夜里好黑', text: '“晚上钓鱼什么都看不见……听说猫薄荷饵能换到会发光的浮漂？”', need: [['bait', 'catnip', 5]], reward: { perm: 'glowfloat', coins: 1500 } },
  { id: 'r_merchant', npc: 'merchant', title: '商人的鱼饵订单', text: '“下一站的客人点名要新鲜鱼饵，帮帮忙喵！”', need: [['bait', 'worm', 20], ['bait', 'shrimp', 10]], reward: { cook: 'kabayaki', coins: 800 } },
  { id: 'r_otter', npc: 'otter', title: '出海前的祈祷', text: '“老规矩，出远海之前要挂几个晴天娃娃。”', need: [['item', 'sundoll', 3]], reward: { mats: { oldwood: 4 }, coins: 2000, repair: true }, cond: S => S.boat >= 1 },
  { id: 'r_smith', npc: 'smith', title: '工匠的木料', text: '“我需要好木头来修炉子。修好了，你的厨房也能多一口锅。”', need: [['mat', 'oldwood', 8]], reward: { coins: 3000, kitchen: true }, cond: S => S.boat >= 1 },
  { id: 'r_monk', npc: 'monk', title: '隐士的竹筒饭', text: '“贫僧想念泥鳅的味道。施主，可否结个善缘？”', need: [['fish', 'loach', 5], ['item', 'luckbell', 1]], reward: { cook: 'bamboo' }, cond: S => S.unlockedScenes.includes('bamboo') },
  { id: 'r_turtle', npc: 'turtle', title: '老龟想念下雨', text: '“好……久……没……下……雨……了……”', need: [['item', 'raincharm', 3]], reward: { mats: { turtleshell: 5 } }, cond: S => S.cleared.falls },
  { id: 'r_octo', npc: 'octo', title: '教授的研究样本', text: '“我在研究反光现象！需要亮片拟饵和鱿鱼各几份。”', need: [['bait', 'lure', 5], ['fish', 'squid', 2]], reward: { mats: { pearl: 5 }, coins: 1500 }, cond: S => S.unlockedScenes.includes('sea') },
  { id: 'r_autumn', npc: 'otter', title: '秋刀鱼祭', text: '“秋天就要吃秋刀鱼！给码头的大家凑 8 条吧。”', need: [['fish', 'saury', 8]], reward: { cook: 'sanma', coins: 1500 }, cond: S => S.unlockedScenes.includes('sea') },
  { id: 'r_crab', npc: 'crabgen', title: '将军的庆功宴', text: '“本将军要开庆功宴！需要真鲷和……幸运。”', need: [['fish', 'seabream', 3], ['item', 'luckbell', 2]], reward: { cook: 'crabpot' }, cond: S => S.cleared.tide },
  { id: 'r_queen', npc: 'queen', title: '女王想看雾', text: '“冰原上从来没有雾。我想看看，雾是什么样子的。”', need: [['item', 'fogbottle', 3]], reward: { mats: { icecore: 4 } }, cond: S => S.cleared.crystal },
  { id: 'r_oldcat', npc: 'oldcat', title: '老猫的藏宝图', text: '“把一张没用过的藏宝图给我吧。我想看看年轻时去过的地方。”', need: [['treasure', 'map', 1]], reward: { cook: 'sushi', mats: { stardust: 3 } }, cond: S => S.story.seen.oldcat1 },
  { id: 'r_mo', npc: 'mo', title: '墨的朋友们', text: '“深渊的水母们想要一个新家……还有，我想看看金色的宝箱。”', need: [['fish', 'ajelly', 5], ['treasure', 'chest_gold', 1]], reward: { cook: 'stew', mats: { whalebone: 6 } }, cond: S => S.story.ending === 'spare' },
];
Object.assign(CHARS, {
  octo: { name: '章鱼教授', face: '🐙', spr: 'octo' },
  monk: { name: '竹林隐士', face: '🧘' },
  smith: { name: '工匠·铁爪', face: '🔨' },
  diary: { name: '老渔夫的日记', face: '📔' },
});
Object.assign(STORY, {
  clue_q1: [['narr', '* 藏宝图的终点，压着一本用油纸包好的旧日记。'], ['narr', '* （获得了任务线索「老渔夫的日记」，在「任务」里查看）']],
  clue_q2: [['narr', '* 通关宝箱下面压着一块刻满花纹的石板。'], ['narr', '* （获得了任务线索「破损的潮汐石板」）']],
  clue_q3: [['narr', '* 一张画着星星的旧图纸从冰缝里飘了出来。'], ['narr', '* （获得了任务线索「坠落的星图」）']],
  q1_0: [['diary', '我叫阿岩，是这片湖最好的渔夫。……至少我自己这么觉得。'], ['diary', '我花了一辈子，做了一套能听懂鱼说话的渔具。'], ['diary', '如果你读到了这里——去找码头的獭老弟。他知道该怎么做。'], ['pao', '阿岩？奶奶好像提过这个名字……']],
  q1_1: [['otter', '阿岩……那个老家伙，居然把日记留到了现在。'], ['otter', '他的斗笠是用晴天娃娃的布缝的，说能把雨挡在外面。图纸给你，拿去找工匠吧。']],
  q1_2: [['diary', '雨天的青鱼最懂湖的心情。钓到它们，你就明白了。'], ['narr', '* 你好像真的听见了湖水的声音。']],
  q1_3: [['diary', '鱼叉的秘诀，是锦鲤的好运，加上雨的耐心。'], ['narr', '* 你获得了「渔夫的鱼叉」图纸。']],
  q1_4: [['turtle', '阿……岩……他……也……来……过……这里……'], ['turtle', '他……说……蓑衣……要用……老龟的……壳……']],
  q1_5: [['otter', '最后一张图纸。蓑衣……阿岩说，穿上它的人，会被湖当成家人。'], ['narr', '* 你获得了「渔夫的蓑衣」图纸。']],
  q2_0: [['crabgen', '这块石板……是我们螃蟹族的圣物！上面写着深潮装备的锻造方法！'], ['crabgen', '本将军可以借给你。不过，你得先证明自己是大海的朋友！']],
  q2_1: [['crabgen', '珍珠和真鲷，正是潮汐的供品！战靴的图纸，拿去！']],
  q2_2: [['crabgen', '旗鱼！你竟然钓到了旗鱼！大海认可你了！']],
  q2_3: [['crabgen', '（小声）那两个宝箱……其实是给我的生日礼物对吧？'], ['crabgen', '咳咳！头冠的图纸给你！']],
  q2_4: [['queen', '潮汐石板的另一半，一直冻在我的迷宫里。'], ['queen', '……拿去吧，暖和的猫。']],
  q2_5: [['crabgen', '集齐了！深潮铠甲，是我们一族最古老的传说。穿上它，你就是半只螃蟹了！'], ['pao', '我不要变成螃蟹……']],
  q3_0: [['narr', '* 星图上，七颗星星连成了一条鱼的形状。'], ['oldcat', '坠落的星星会变成星尘，藏在最冷的地方。'], ['oldcat', '收集它们。猫，也是可以摘下星星的。']],
  q3_1: [['oldcat', '很好。吊坠的图纸给你——它会记住每一颗流星。']],
  q3_2: [['oldcat', '极光鲑……你真的钓到了。那是星星落在水里的影子。']],
  q3_3: [['oldcat', '靴子的图纸。穿上它，你能踩着星光走路。']],
  q3_4: [['mo', '……星落之刃？花也找过它。'], ['mo', '她说，要把星星送给一个人。'], ['mo', '……那个人，是我。']],
  q3_5: [['oldcat', '最后一张图纸。剩下的，就交给工匠吧。'], ['narr', '* 你获得了「星落之刃」图纸。']],
});

// ---------- 料理 ----------
// need：{ rarity / id / scene / bait , n }；buff 持续 min 分钟
const DISHES = {
  grill:    { name: '烤鱼串', gi: 'grill', need: [{ rarity: 'common', n: 2 }], time: 90, heal: 0.3, price: 70, known: true, desc: '最简单的美味。' },
  soup:     { name: '鲜鱼汤', gi: 'soup', need: [{ rarity: 'common', n: 3 }, { bait: 'shrimp', n: 2 }], time: 180, heal: 0.4, buff: { atk: 0.1, min: 10 }, price: 180, known: true, desc: '暖暖的，喝了浑身是劲。' },
  sashimi:  { name: '刺身拼盘', gi: 'sashimi', need: [{ rarity: 'rare', n: 2 }], time: 240, heal: 0.55, ap: 2, price: 480, known: true, desc: '新鲜就是正义。' },
  sweet:    { name: '糖醋鲤鱼', gi: 'sweet', need: [{ id: 'carp', n: 3 }], time: 200, heal: 0.45, buff: { def: 0.15, min: 10 }, price: 320, desc: '酸酸甜甜，泡泡的最爱。' },
  kabayaki: { name: '蒲烧鳗鱼', gi: 'kabayaki', need: [{ id: 'eel', n: 1 }, { id: 'ricefield', n: 1 }], time: 300, heal: 0.5, buff: { spd: 0.15, min: 10 }, price: 650, desc: '刷上酱汁，烤得滋滋响。' },
  sanma:    { name: '盐烤秋刀鱼', gi: 'sanma', need: [{ id: 'saury', n: 2 }], time: 240, heal: 0.4, buff: { luck: 0.25, min: 15 }, price: 260, desc: '秋天的味道。' },
  bamboo:   { name: '竹筒鱼饭', gi: 'bamboodish', need: [{ scene: 'bamboo', rarity: 'common', n: 2 }], time: 300, heal: 0.45, buff: { regen: 0.03, min: 10 }, price: 360, desc: '米饭里有竹子的清香。' },
  sushi:    { name: '锦鲤寿司', gi: 'sushi', need: [{ id: 'koi', n: 1 }, { rarity: 'rare', n: 2 }], time: 480, heal: 0.6, buff: { luck: 0.4, min: 20 }, price: 1500, desc: '据说吃了会转运。' },
  stew:     { name: '深渊炖菜', gi: 'stew', need: [{ scene: 'abyss', rarity: 'common', n: 2 }, { scene: 'abyss', rarity: 'rare', n: 1 }], time: 400, heal: 0.7, ap: 3, price: 950, desc: '紫色的汤，意外地好喝。' },
  crabpot:  { name: '帝王蟹火锅', gi: 'crabpot', need: [{ id: 'kingcrab', n: 1 }, { rarity: 'common', n: 3 }, { bait: 'catnip', n: 1 }], time: 600, heal: 1, buff: { atk: 0.2, def: 0.2, min: 15 }, price: 5200, desc: '豪华大餐！' },
};
const BUFF_NAMES = { atk: '攻击', def: '防御', spd: '速度', luck: '钓鱼幸运', regen: '每回合回血' };

// ---------- 寄卖行 ----------
const MARKET_OPEN_FEE = 200;
const MARKET_TIERS = [
  { name: '普通', req: 0, fee: 0, cut: 0.12, slots: 10, color: '#a39a86', perks: '只能看到当天价格，一次挂一件' },
  { name: '铜卡', req: 3000, fee: 200, cut: 0.09, slots: 25, chart: true, color: '#c0803a', perks: '行情走势图（实时监控 30 天价格）' },
  { name: '银卡', req: 20000, fee: 1200, cut: 0.07, slots: 50, chart: true, batch: true, color: '#9fb4c8', perks: '+ 批量定价' },
  { name: '金卡', req: 100000, fee: 5000, cut: 0.05, slots: 100, chart: true, batch: true, band: true, color: '#ffc93c', perks: '+ 显示本月价格区间' },
  { name: '钻石', req: 500000, fee: 20000, cut: 0.03, slots: 200, chart: true, batch: true, band: true, color: '#7fe7ff', perks: '+ 最低手续费' },
];
