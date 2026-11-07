// ===== 像素立绘：怪物、Boss、小橘 =====
// 每个立绘是一张像素网格。mirror:true 时只画左半边，右半边自动镜像。
// 画完后会自动加一圈深色描边，并按 scale 放大成清晰的像素图。
'use strict';

const SPR_K = '#1b1424';
const SPRITES = {
  hero: { mirror: true, pal: { y: '#e9c46a', Y: '#c9a04a', r: '#d64545', o: '#f2a246', d: '#c8741f', l: '#fff1dc', p: '#f59aac', k: '#2a1a10', w: '#fff' },
    rows: ['....yyyy', '.o.YYyyy', '.oorrrrr', '.yyyyyyy', 'yyyyyyyy', '.oooodoo', 'oooooooo', 'oowkoooo', 'ookkoooo', 'oollllll', '.llllllp', '..oooooo', '.oodolll', '.ooollll', '.ooollll', '..ll....'] },
  rat: { mirror: true, pal: { a: '#8e8fa0', A: '#6d6e80', c: '#dcdde6', p: '#f29bb3', k: SPR_K, w: '#fff' },
    rows: ['..aa....', '.appa...', '.appa...', '.aaaaaaa', '..aaaaaa', '..awkaaa', '..akkaaa', '..aaaaap', '...aaaaa', '....aaww', '...aaccc', '..aacccc', '..Aacccc', '..AaaCcc'.replace('C', 'c'), '...pp.aa', '...pp...'] },
  mosq: { mirror: true, pal: { g: '#5d4a36', G: '#8a6d4c', w: '#d6ecff', r: '#e53935', k: SPR_K },
    rows: ['........', '.ww.....', 'wwww....', 'wwwww...', '.wwwwg..', '..wwgGrr', '....gGrr', '.....ggg', '...g..Gk', '..g..ggg', '.g...ggG', 'g...gggg', '...g..gg', '..g....k', '.g.....k', '........'] },
  frog: { mirror: true, pal: { g: '#5aa35a', l: '#9fd67a', y: '#efe7a8', m: '#2d5a2d', w: '#fff', k: SPR_K },
    rows: ['........', '..www...', '.wwkkw..', '.wwkkwg.', '.gwwwggg', 'gggggggg', 'gglggggg', 'gggggggg', 'ggmmmmmm', '.ggggggg', '.gyyyyyy', 'ggyyyyyy', 'ggyyyyyy', 'gggyyyyy', 'll.gg.gg', '........'] },
  gull: { mirror: true, pal: { w: '#f4f6f8', a: '#9aa6b2', A: '#6f7d8a', y: '#f2b33d', k: SPR_K },
    rows: ['........', '........', '.....www', '....wwww', 'A...wkww', 'Aa..wwww', 'aaa.wwyy', 'aaaaawyy', '.aaaaawy', '..aaaaww', '...aawww', '....wwww', '.....www', '......y.', '.....yy.', '........'] },
  snake: { pal: { t: '#3e9e8f', l: '#8fdcc6', y: '#ffe14a', r: '#e53935', k: SPR_K },
    rows: ['................', '..........ttt...', '.........ttttt..', '.........tyttyt.', '.........ttttt..', '..........ttt...', '..........r.r...', '.........tt.....', '........ttt.....', '.......tttl.....', '...tttttttt.....', '..ttllllltttt...', '.tttttttttttttt.', 'tlllllllllllllt.', '.tttttttttttttt.', '................'] },
  shark: { mirror: true, pal: { b: '#5f7f9c', B: '#46627b', w: '#e6eef4', x: '#ffffff', m: '#7a1f2b', k: SPR_K },
    rows: ['.......b', '......bb', '.....bbb', '...bbbbb', '..bbbbbb', '.bkbbbbb', 'bbbbbbbb', 'bbmmmmmm', 'bmxmxmxm', 'bmmmmmmm', 'bmxmxmxm', 'bbmmmmmm', '.bwwwwww', '..wwwwww', 'B..wwwww', 'BB......'] },
  pirate: { pal: { r: '#c0392b', R: '#8e2a20', o: '#f0a04b', l: '#ffe0b0', k: SPR_K, w: '#fff', s: '#cfd6de', S: '#8f9aa6', b: '#3b2a1a' },
    rows: ['................', '...rrrrrrrrrr...', '..rrwrrrrrrwrrr.', '.rrrrrrrrrrrrrrr', '.oo.rrrrrrrr.ooR', '.oooooooooooooR.', '.okkkoooooowkoo.', '.okkkoooooookoo.', '.oooooolloooooo.', '.ooooollllooooo.', '..ooolkllklooo..', '...oooooooooo...', '..llrrrrrrrrll.s', '.ollbbbbbbbbllos', '.oollllllllllooS', '..oo..oo..oo..b.'] },
  squidm: { mirror: true, pal: { p: '#e86a8a', P: '#b84466', l: '#f8b8c8', w: '#fff', k: SPR_K },
    rows: ['......pp', '.....ppp', '....pppp', '...ppPpp', '...plppp', '..pppppp', '..ppwkpp', '..ppkkpp', '..pppppp', '...ppppp', '..p.pp.p', '.p.pp.pp', '.p.p..p.', 'p..p.p..', 'p.p..p..', '.p...p..'] },
  seal: { mirror: true, pal: { a: '#8fa3b5', A: '#6d8193', c: '#dfe8ef', k: SPR_K, w: '#fff', n: '#2a2a35' },
    rows: ['........', '........', '....aaaa', '...aaaaa', '..aaaaaa', '..awkaaa', '..akkaaa', '..aaaacc', '...accnn', '...acccc', '..aaaaaa', '.aaaaacc', 'aaaaaccc', 'aAaaaccc', 'AA.aaacc', 'A....aaa'] },
  serpent: { pal: { g: '#2e7d6b', G: '#1e5a4c', y: '#ffd54a', l: '#7fd1b3', r: '#e53935', w: '#fff', k: SPR_K },
    rows: ['..........GGG...', '.........gggggG.', '........ggyggggG', '........gggggggg', '........gwwgwwg.', '.........gggg...', '........rr......', '..........gg....', '...gg.....ggg...', '..gglg...gglgg..', '.gglggg.gglggg..', '.gg.gggggggg.gg.', 'gg...gglggg...gg', 'g.....ggggg....g', 'l......lll.....l', '................'] },
  bat: { mirror: true, pal: { p: '#5a3d6e', P: '#3e2850', m: '#8a6aa0', r: '#ff5252', w: '#fff' },
    rows: ['........', '........', '........', '.....p..', 'p....pp.', 'pp...ppp', 'ppp.pppp', 'pppppprp', '.pppmppp', '..pmpppw', '..p.pppp', '.....ppp', '......pp', '.......p', '........', '........'] },
  rock: { mirror: true, pal: { s: '#8d8a80', S: '#6b675e', m: '#6aa84f', M: '#4a8a3a', k: SPR_K, y: '#ffd54a' },
    rows: ['........', '....mmmm', '...mMsmm', '..smmsss', '..ssssss', '.sssssss', '.ssyksss', '.sskksss', '.sssssss', '.ssssskk', '.ssSssss', 'ssssssss', 'sSssssSs', 'ssssssss', '.sss..ss', '.SSS..SS'] },
  hermit: { mirror: true, pal: { s: '#e0a070', S: '#b87a4a', r: '#e05a3a', R: '#a8402a', w: '#fff', k: SPR_K },
    rows: ['........', '....ssss', '...sSSss', '..sSsssS', '..sSsSsS', '..ssSSss', '...ssssr', '..w.rrrr', '..k.rrrr', 'rr.rrrrr', 'rrrrrrRr', 'rR.rrrrr', '.r.rRrrr', '..r.r.rr', '...r.r..', '........'] },
  jelly: { mirror: true, pal: { c: '#7fd3ff', C: '#4fa3e0', y: '#fff176', w: '#fff', k: SPR_K },
    rows: ['........', '...ccccc', '..cccccc', '.ccwcccc', '.cccCccc', 'ccckcccc', 'ccCccccc', '.cccCccc', '.c.c.c.c', '.c.c.c.c', 'y..c.c.c', '...c..c.', '..y.c..c', '....c...', '.y......', '........'] },
  octo: { mirror: true, pal: { o: '#c76ad0', O: '#9a45a3', l: '#e7a6ec', g: '#e8d9a0', w: '#fff', k: SPR_K },
    rows: ['....oooo', '...ooooo', '..oooooo', '..oolooo', '..oooooo', '.oogggoo', '.oogwkgo', '.oogggoo', '.ooooooo', '..oooOoo', '.o.oo.oo', 'o.o.o.o.', 'o.o.o..o', '.o..o.o.', 'o..o..o.', '........'] },
  sprite: { mirror: true, pal: { w: '#ffffff', c: '#bfe8ff', C: '#8fc8f0', k: SPR_K, b: '#6fa8dc' },
    rows: ['......c.', '.....ccc', '..c...c.', '.ccc.www', '..c.wwww', '...wwwww', '..wwkwww', '..wwkwww', '..wwwwbb', '...wwwww', '..c.wwww', '.ccc.www', '..c..www', '......ww', '.......w', '........'] },
  peng: { mirror: true, pal: { k: '#22252e', w: '#f4f6f8', y: '#f2a93b', r: '#d33a3a', e: '#fff' },
    rows: ['....kkkk', '...kkkkk', '..kkkkkk', '..kkekkk', '..kkkkyy', '..kkkyyy', '..kkwwww', '.kkwwwrr', '.kkwwwwr', 'kkkwwwww', 'kk.wwwww', 'k..wwwww', '..kwwwww', '...kkwww', '...yy...', '........'] },
  bear: { mirror: true, pal: { w: '#f4f8fb', c: '#d6e2ea', k: SPR_K, n: '#2a2a35' },
    rows: ['........', '..ww....', '.wcww...', '.wwwwwww', '..wwwwww', '..wkwwww', '..wkwwww', '..wwwwcc', '...wwcnn', '...wwccc', '..wwwwww', '.wwwwwww', 'wwwwwwww', 'wcwwwwww', 'ww.wwwww', 'cc..cccc'] },
  ghost: { mirror: true, pal: { g: '#c9d6ff', G: '#9aa8e0', k: SPR_K, b: '#4a5a9a' },
    rows: ['........', '....gggg', '...ggggg', '..gggggg', '..gggggg', '..gkkggg', '..gkkggg', '.ggggggg', '.ggggggb', '.gggggbb', 'gggggggg', 'gggggggg', 'gGgggggg', 'gg.gGggg', 'g...gg.g', '........'] },
  puffer: { mirror: true, pal: { y: '#f2c94c', Y: '#c99a2e', w: '#fff3c4', k: SPR_K, s: '#8a6a20', r: '#c0392b', e: '#fff' },
    rows: ['...s....', 's..yy.s.', '.syyyyys', '..yyyyyy', '.yyyyyyy', 'syyekyyy', '.yykkyyy', 'syyyyyyy', '.yyyyyrr', '.ywwwwww', 'syywwwww', '.yywwwww', '..yywwww', 's..yyyyy', '...s..s.', '........'] },
  bonef: { pal: { b: '#e8e2d0', B: '#b5ad95', r: '#ff5252', k: SPR_K },
    rows: ['................', '................', '..b.............', '..bb....bbbbb...', '..b.b..bbBbbbb..', '...b.bbbbbbrbbb.', '..bbbbbbbbbbbbbb', '..bb.b.b.b.bbbb.', '...b.b.b.b.bBbb.', '..bbbbbbbbbbbbbb', '..b.b..bbbbbbbb.', '..bb....bbbbbb..', '..b.............', '................', '................', '................'] },
  skelcat: { mirror: true, pal: { b: '#ece6d4', B: '#bdb59c', n: '#2a2a35', c: '#7fe7ff', r: '#8e2430', k: SPR_K },
    rows: ['.b......', '.bb.....', '.bbbbbbb', '.bbbbbbb', '.bnnbbbb', '.bncbbbb', '.bbbbbbb', '..bbbbBb', '..bkbkbk', '...bbbbb', '..rrrrrr', '.b.Bbbbb', 'b..b.bBb', '...bbbbb', '...b..b.', '..bb..bb'] },
  parrot: { pal: { r: '#e53935', y: '#ffd54a', b: '#1e88e5', g: '#6d4c2a', w: '#fff', k: SPR_K, o: '#555a66' },
    rows: ['................', '......rrr.......', '.....rrrrr......', '....rrwkrrr.....', '....rrkkrrooo...', '....rrrrrroo....', '.....rrrrr......', '....rrrrrr......', '...yrrrrrr......', '..yyyrrrrr......', '..byyyrrrr......', '..bbyyrrrr......', '...bbyrrr.......', '....b.ooo.......', '......o.o.......', '....gggggggg....'] },
  memfish: { pal: { p: '#ffb3d9', l: '#fff0f8', c: '#a0e7ff', k: SPR_K },
    rows: ['................', '................', '......cc........', '.....cpppp......', '..c.ppppplpp....', '.cccppppppppkp..', '..cpppplpppppppl', '.cccpppppppppp..', '..c.ppppplpp....', '.....cpppp......', '......cc........', '..l.........l...', '................', '......l.........', '................', '................'] },
  shadow: { mirror: true, pal: { s: '#2a1f3d', S: '#4a3a6a', r: '#ff4d6d' },
    rows: ['..s.....', '.sss....', '.ssss...', '.ssssSss', 'ssssssss', 'ssrrssss', 'ssrrssss', 'ssssssss', '.sssssss', '..ssssss', '.sssssss', 'ssssssss', 'sSssssss', 'ssssssss', '.s.s.sss', 's.s.s..s'] },
  mimic: { mirror: true, pal: { b: '#8b5e3c', B: '#5e3d24', y: '#e0b040', w: '#fff', r: '#e05a6a', k: SPR_K, e: '#ffeb3b' },
    rows: ['........', '..bbbbbb', '.bBBBBBB', '.bbebbbb', '.yyyyyyy', '.bwbwbwb', '.kkkkkkk', '.kkkkrrr', '.kkkrrrr', '.wbwbwbw', '.yyyyyyy', '.bbbbbyy', '.bbbbbbb', '.BBBBBBB', '..B....B', '........'] },
  lakemon: { mirror: true, pal: { g: '#3f7d5c', l: '#8fcf9f', w: '#fff', k: SPR_K, b: '#4f8fb0', B: '#3a7090' },
    rows: ['....gggg', '...ggggg', '..gggggg', '..gwkggg', '..gkkggg', '..gggggg', '...ggggg', '...gwgwg', 'g..ggggg', 'gg.ggggg', 'ggggllll', '.gglllll', '..glllll', 'bbbbbbbb', 'BbbBbbbB', 'bbbbbbbb'] },

  // ---------- Boss（24×24） ----------
  ratking: { mirror: true, pal: { a: '#8e8fa0', A: '#6b6c7e', c: '#dcdde6', p: '#f29bb3', y: '#ffd54a', Y: '#e0a82e', r: '#b83a4b', R: '#8a2436', k: SPR_K, w: '#fff' },
    rows: ['........yyyy', '.......yyYyy', '......yyyyyy', '.aa...yYyyYy', 'apaa..yyyyyy', 'appaa.aaaaaa', 'appaaaaaaaaa', '.aaaaaaaaaaa', '..aaawkaaaaa', '..aaakkaaaaa', '..aaaaaaaaap', '...aaaaaaaaa', '....aaaaaaww', '...rraaaaaaa', '..rrrrcccccc', '.rrrrccccccc', '.rrRrccccccc', 'rrrRrccccccc', 'rrRrrrcccccc', 'rrRrraaccccc', 'rRrrraaacccc', '.rrr..aaaaaa', '......pp..aa', '.....ppp....'] },
  turtle: { mirror: true, pal: { g: '#5b8c4a', G: '#3e6633', h: '#a3c76a', s: '#9bbf7a', S: '#7a9e5e', k: SPR_K, w: '#f4f4f4', y: '#e8e0a0' },
    rows: ['............', '..........ss', '.........sss', '........ssss', '........ssss', '........skss', '........ssss', '........swww', '......ggwwww', '....gggggwww', '...ggGgggggg', '..ggGhGggggg', '.gggGhhGgggG', '.ggGhhhhGggG', 'gggGhhhhGGgh', 'ggGhhhhhhGgh', 'ggGhhhhhhGhh', 'gggGhhhhGGgh', '.gggGGGGgggg', '.ssgggggggss', 'ssss......ss', 'sSs.......ss', '............', '............'] },
  crabgen: { mirror: true, pal: { r: '#e0503a', R: '#a8342a', o: '#ff8a65', y: '#ffd54a', w: '#fff', k: SPR_K, h: '#607d8b', H: '#455a64' },
    rows: ['............', '..rr........', '.rrrr.......', 'rr..r.......', 'rr.rr.......', '.rrrr...hhhh', '..rr...hhhhh', '..rr..hhHhhh', '..rr....wk..', '..rr....r...', '..rr..rrrrrr', '...rrrrrrrrr', '....rrrrrrrr', '...rrrrrrryr', '...rrrrrrrrr', '..rrRrrrrrrr', '.rr.rrrrrrrr', 'rr..rRrrrrrr', 'r..rr.rRrrrr', '..rr..rr.rrR', '.rr..rr..rr.', '.r..rr..rr..', '...r...r....', '............'] },
  queen: { mirror: true, pal: { c: '#bfe8ff', C: '#7fc4f0', w: '#fff', b: '#3a6fa8', B: '#24507f', s: '#e8f4ff', k: SPR_K, p: '#b39ddb' },
    rows: ['..........c.', '.......c..cc', '......cc.ccw', '......cccccc', '.....bbbbbbb', '....bbssssss', '....bsssssss', '....bsskssss', '....bsssssss', '....bbsssssp', '...bbbbsssss', '...bbbcccccc', '..cbbcCwCwCw', '..cbbbbbbbbb', '.bcbbbbbbbbb', '.bc.bbbbBbbb', 'b.c.bbbbBbbb', '..c.bbbBbbbb', '..c.bbbBbbbb', '..cbbbBbbbbb', '..cbbBbbbbbb', '..bbBbbbbbbb', '.bbBbbbbbbbb', 'CCCCCCCCCCCC'] },
  mo: { mirror: true, pal: { n: '#2b3a67', N: '#1b2547', l: '#6f86c9', w: '#cfd8f5', k: SPR_K, e: '#ffd54a', t: '#8fd3ff' },
    rows: ['............', '....nnnnnnnn', '..nnnnnnnnnn', '.nnnnlnnnnnn', '.nnnlnnnnnnn', 'nnnnnnnnnnnn', 'nneeennnnnnn', 'nnekennnnnnn', 'nneeennnnnnn', 'nnntnnnnnnnn', 'nnntnnnnnnnn', 'nnnnnnnnnnnn', 'nwwwwwwwwwww', 'nnwnwnwnwnwn', 'nnwwwwwwwwww', 'nnnwnwnwnwnw', '.nnwwwwwwwww', 'N.nnnwwwwwww', 'NN.nnnnnnnnn', 'NNN.nnnnnnnn', 'NN...nnnnnnn', 'N.....nnnnnn', '........nnnn', '............'] },
  onecap: { mirror: true, pal: { h: '#2b2b3a', H: '#1a1a26', w: '#f0f0f0', g: '#e0b040', o: '#b0703a', l: '#e8c49a', k: SPR_K, r: '#8e2430', R: '#6a1824' },
    rows: ['............', '......hhhhhh', '....hhhhhhhh', '...hhhhhhhww', '..hhhhhhhwkw', '.hhhhhhhhhww', 'gggggggggggg', 'hhhhhhhhhhhh', '..oo.ooooooo', '..oooooooooo', '..oowkoooooo', '..ookkoooooo', '..oooooollll', '...ooollllkk', '....oooooooo', '...rrrrrrrgg', '..rrrrrrrrrr', '.rrrrrrrrrrg', 'rrRrrrrrrrrr', 'rrRrrrrrrrgg', 'rrRrrrrrrrrr', '.rRrrrrrrrrr', '..kkk...kkkk', '..kkk.......'],
    patch: [[17, 10, 'k'], [18, 10, 'k'], [19, 10, 'k'], [20, 10, 'k'], [17, 11, 'k'], [18, 11, 'k'], [19, 11, 'k'], [20, 11, 'k'], [14, 9, 'k'], [15, 9, 'k'], [16, 9, 'k'], [21, 9, 'k'], [22, 9, 'k']] },
  younghua: { mirror: true, pal: { y: '#e9c46a', Y: '#c9a04a', r: '#d64545', o: '#f2a246', d: '#c8741f', l: '#fff1dc', p: '#f59aac', k: '#2a1a10', w: '#fff', b: '#2f5fa8', R: '#6b4a2a' },
    rows: ['............', '.......yyyyy', '......yyyyyy', '..o...rrrrrr', '..oo.yyyyyyy', '.yyyyyyyyyyy', 'yyyyyyyyyyyy', '...ooooodooo', '..oooooooooo', '..oowkoooooo', '..ookkoooooo', '..oolllllll l'.replace(' ', ''), '...ooolllllp', '....oooooooo', '....wwwwwrrr', '...wwbbbbrrr', '..wwbbbbbbrr', '..obbbbbbbbb', '..obbbbbbbbb', '...bbbbbbbbb', '...wwwwwwwww', '...bbbbbbbbb', '....oo......', '....kk......'],
    patch: [[22, 1, 'R'], [22, 2, 'R'], [21, 3, 'R'], [21, 4, 'R'], [21, 5, 'R'], [20, 6, 'R'], [20, 7, 'R'], [20, 8, 'R'], [19, 9, 'R'], [19, 10, 'R'], [19, 11, 'R'], [18, 12, 'R'], [18, 13, 'R'], [18, 14, 'R'], [17, 15, 'R'], [17, 16, 'R'], [23, 2, 'w'], [23, 3, 'w'], [23, 4, 'w']] },
};

const _sprCache = {};
function spriteGrid(id) {
  const d = SPRITES[id]; if (!d) return null;
  const rows = d.rows.map(r => d.mirror ? r + r.split('').reverse().join('') : r);
  const h = rows.length, w = Math.max(...rows.map(r => r.length));
  const g = rows.map(r => (r + '.'.repeat(w)).slice(0, w).split(''));
  for (const [x, y, c] of d.patch || []) if (g[y] && x < w) g[y][x] = c;
  return { g, w, h, pal: d.pal };
}
// 返回 dataURL；flash=true 时返回纯白剪影（受击闪白）
function spriteURL(id, scale, flash) {
  const key = id + ':' + (scale || 6) + (flash ? 'f' : '');
  if (_sprCache[key]) return _sprCache[key];
  const c = spriteCanvas(id, scale, flash); if (!c) return '';
  return (_sprCache[key] = c.toDataURL());
}
const _sprCv = {};
function spriteCanvas(id, scale, flash) {
  const key = id + ':' + (scale || 6) + (flash ? 'f' : '');
  if (_sprCv[key]) return _sprCv[key];
  const s = spriteGrid(id); if (!s) return null;
  const sc = scale || 6, W = s.w + 2, H = s.h + 2;
  const c = document.createElement('canvas'); c.width = W * sc; c.height = H * sc;
  const x = c.getContext('2d');
  const filled = (gx, gy) => gx >= 0 && gy >= 0 && gx < s.w && gy < s.h && s.g[gy][gx] !== '.';
  // 描边
  x.fillStyle = flash ? '#ffffff' : SPR_K;
  for (let gy = -1; gy <= s.h; gy++) for (let gx = -1; gx <= s.w; gx++) {
    if (filled(gx, gy)) continue;
    if (filled(gx - 1, gy) || filled(gx + 1, gy) || filled(gx, gy - 1) || filled(gx, gy + 1)) x.fillRect((gx + 1) * sc, (gy + 1) * sc, sc, sc);
  }
  for (let gy = 0; gy < s.h; gy++) for (let gx = 0; gx < s.w; gx++) {
    const ch = s.g[gy][gx]; if (ch === '.') continue;
    x.fillStyle = flash ? '#ffffff' : (s.pal[ch] || '#ff00ff');
    x.fillRect((gx + 1) * sc, (gy + 1) * sc, sc, sc);
  }
  // 左上角一点高光，让像素更有体积
  if (!flash) {
    x.fillStyle = 'rgba(255,255,255,0.18)';
    for (let gy = 0; gy < s.h; gy++) for (let gx = 0; gx < s.w; gx++) {
      if (s.g[gy][gx] === '.' || s.g[gy][gx] === 'k') continue;
      if (!filled(gx, gy - 1) || !filled(gx - 1, gy)) x.fillRect((gx + 1) * sc, (gy + 1) * sc, sc, sc);
    }
  }
  return (_sprCv[key] = c);
}
