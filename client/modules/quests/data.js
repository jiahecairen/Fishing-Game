// ===== 任务 · 数据：套装任务线、委托、相关台词 =====
// 任务线的步骤：talk 对话 / submit 上交 / catch 钓到指定的鱼（可要求天气）/ clear 通关副本
// need：[种类, id, 数量]，种类见 Inv.kind（fish item bait mat treasure dish coins）
'use strict';

// ---------- 任务线（套装） ----------
// 步骤：talk 对话 / submit 上交 / catch 钓到指定鱼 / clear 通关副本
// need: [类型, id, 数量]  类型 fish|item|bait|mat|treasure|dish|coins
const QUESTS = [];
CF.content.type('quest', { list: QUESTS });
[
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
].forEach(q => CF.content.define('quest', q.id, q));

// ---------- 委托（一次性支线，大多数道具都有用武之地） ----------
const REQUESTS = [];
CF.content.type('request', { list: REQUESTS });
[
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
].forEach(r => CF.content.define('request', r.id, r));

CF.story.chars({
  octo: { name: '章鱼教授', face: '🐙', spr: 'octo' },
  monk: { name: '竹林隐士', face: '🧘' },
  smith: { name: '工匠·铁爪', face: '🔨' },
  diary: { name: '老渔夫的日记', face: '📔' },
  merchant: { name: '流浪商人·喵喵', face: '🧳' },
});
CF.story.lines({
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

