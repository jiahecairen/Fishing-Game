// ===== 怪物：鼠王·芝士大人 =====
// 出没：副本「芦苇岛·鼠鼠地窖」的 Boss
'use strict';

CF.monster('ratking', {
  name: "鼠王·芝士大人",
  boss: true,
  skill: { name: "奶酪炸弹", mult: 1.8, every: 3 },
  check: "* 头上的王冠是一块奶酪。",
  unique: ["u_cheese",0.12],   // 掉落隐藏装备 [id, 概率]
  sprite: {
    mirror: true,
    pal: { a: "#8e8fa0", A: "#6b6c7e", c: "#dcdde6", p: "#f29bb3", y: "#ffd54a", Y: "#e0a82e", r: "#b83a4b", R: "#8a2436", k: SPR_K, w: "#fff" },
    rows: [
      "........yyyy",
      ".......yyYyy",
      "......yyyyyy",
      ".aa...yYyyYy",
      "apaa..yyyyyy",
      "appaa.aaaaaa",
      "appaaaaaaaaa",
      ".aaaaaaaaaaa",
      "..aaawkaaaaa",
      "..aaakkaaaaa",
      "..aaaaaaaaap",
      "...aaaaaaaaa",
      "....aaaaaaww",
      "...rraaaaaaa",
      "..rrrrcccccc",
      ".rrrrccccccc",
      ".rrRrccccccc",
      "rrrRrccccccc",
      "rrRrrrcccccc",
      "rrRrraaccccc",
      "rRrrraaacccc",
      ".rrr..aaaaaa",
      "......pp..aa",
      ".....ppp....",
    ],
  },
});
