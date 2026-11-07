// ===== 怪物：偷鱼鼠 =====
// 出没：副本「芦苇岛·鼠鼠地窖」
'use strict';

CF.monster('rat', {
  name: "偷鱼鼠",
  skill: { name: "偷袭", mult: 1.5, every: 3 },
  check: "* 它的口袋里塞满了别人的鱼。",
  sprite: {
    mirror: true,
    pal: { a: "#8e8fa0", A: "#6d6e80", c: "#dcdde6", p: "#f29bb3", k: SPR_K, w: "#fff" },
    rows: [
      "..aa....",
      ".appa...",
      ".appa...",
      ".aaaaaaa",
      "..aaaaaa",
      "..awkaaa",
      "..akkaaa",
      "..aaaaap",
      "...aaaaa",
      "....aaww",
      "...aaccc",
      "..aacccc",
      "..Aacccc",
      "..Aaaccc",
      "...pp.aa",
      "...pp...",
    ],
  },
});
