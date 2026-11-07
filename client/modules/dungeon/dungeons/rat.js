// ===== 副本：芦苇岛·鼠鼠地窖 =====
// 湖心小岛的地下，传来吱吱的声音。
'use strict';

CF.story.chars({"ratking":{"name": "鼠王·芝士大人", "face": "🐭", "spr": "ratking", "pitch":900}});

CF.dungeon('rat', {
  name: "芦苇岛·鼠鼠地窖",
  desc: "湖心小岛的地下，传来吱吱的声音。",
  region: 'lake',        // 在哪个地点（到过那里、有船才能进）
  floors: 3, lv: [2,5],        // 层数、小怪等级（从第一层到最后一层）
  mons: ["rat","mosq","frog"],
  boss: 'ratking', bossLv: 7, tier: 1, gi: 'u_cheese',
  style: {"wall": "#3a2c1e", "wall2": "#5a4430", "floor": "#241a12", "torch": "#ffb347", "deco": "cheese"},
  story: {
    enter: [
      ["narr", "* 地窖里弥漫着奶酪的味道。"],
      ["pao", "我闻到了……阴谋的味道。还有切达干酪。"],
    ],
    boss: [
      ["ratking", "吱吱吱！你就是那个把湖里的鱼都钓走的猫？！"],
      ["ratking", "鱼是我们鼠鼠的！奶酪也是我们的！什么都是我们的！"],
    ],
    win: [
      ["ratking", "呜……好吧好吧，奶酪还给你……"],
      ["ratking", "什么？你不要奶酪？……那你真是只奇怪的猫。"],
    ],
  },
});
