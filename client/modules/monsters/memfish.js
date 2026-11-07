// ===== 怪物：记忆之鱼 =====
// 出没：副本「梦之湖·花的回忆」
'use strict';

CF.monster('memfish', {
  name: "记忆之鱼",
  skill: { name: "回忆涌现", mult: 1.7, every: 3 },
  check: "* 它的鳞片上映着很久以前的湖。",
  sprite: {
    pal: { p: "#ffb3d9", l: "#fff0f8", c: "#a0e7ff", k: SPR_K },
    rows: [
      "................",
      "................",
      "......cc........",
      ".....cpppp......",
      "..c.ppppplpp....",
      ".cccppppppppkp..",
      "..cpppplpppppppl",
      ".cccpppppppppp..",
      "..c.ppppplpp....",
      ".....cpppp......",
      "......cc........",
      "..l.........l...",
      "................",
      "......l.........",
      "................",
      "................",
    ],
  },
});
