// ===== 怪物：影子猫 =====
// 出没：副本「梦之湖·花的回忆」
'use strict';

CF.monster('shadow', {
  name: "影子猫",
  skill: { name: "黑暗之爪", mult: 1.9, every: 3 },
  check: "* 它和你长得一模一样，只是没有颜色。",
  sprite: {
    mirror: true,
    pal: { s: "#2a1f3d", S: "#4a3a6a", r: "#ff4d6d" },
    rows: [
      "..s.....",
      ".sss....",
      ".ssss...",
      ".ssssSss",
      "ssssssss",
      "ssrrssss",
      "ssrrssss",
      "ssssssss",
      ".sssssss",
      "..ssssss",
      ".sssssss",
      "ssssssss",
      "sSssssss",
      "ssssssss",
      ".s.s.sss",
      "s.s.s..s",
    ],
  },
});
