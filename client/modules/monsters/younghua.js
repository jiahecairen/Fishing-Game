// ===== 怪物：年轻的花 =====
// 出没：副本「梦之湖·花的回忆」的 Boss
'use strict';

CF.monster('younghua', {
  name: "年轻的花",
  boss: true,
  hidden: true,
  skill: { name: "回忆中的一竿", mult: 2.1, every: 3 },
  check: "* 她的眼神和奶奶一模一样。",
  sprite: {
    mirror: true,
    pal: { y: "#e9c46a", Y: "#c9a04a", r: "#d64545", o: "#f2a246", d: "#c8741f", l: "#fff1dc", p: "#f59aac", k: "#2a1a10", w: "#fff", b: "#2f5fa8", R: "#6b4a2a" },
    rows: [
      "............",
      ".......yyyyy",
      "......yyyyyy",
      "..o...rrrrrr",
      "..oo.yyyyyyy",
      ".yyyyyyyyyyy",
      "yyyyyyyyyyyy",
      "...ooooodooo",
      "..oooooooooo",
      "..oowkoooooo",
      "..ookkoooooo",
      "..oollllllll",
      "...ooolllllp",
      "....oooooooo",
      "....wwwwwrrr",
      "...wwbbbbrrr",
      "..wwbbbbbbrr",
      "..obbbbbbbbb",
      "..obbbbbbbbb",
      "...bbbbbbbbb",
      "...wwwwwwwww",
      "...bbbbbbbbb",
      "....oo......",
      "....kk......",
    ],
    patch: [[22,1,"R"],[22,2,"R"],[21,3,"R"],[21,4,"R"],[21,5,"R"],[20,6,"R"],[20,7,"R"],[20,8,"R"],[19,9,"R"],[19,10,"R"],[19,11,"R"],[18,12,"R"],[18,13,"R"],[18,14,"R"],[17,15,"R"],[17,16,"R"],[23,2,"w"],[23,3,"w"],[23,4,"w"]],
  },
});
