// ===== 战斗 · 冒险模式的通用部分 =====
// 航海、副本（以及以后的潜水……）都是「离开码头去冒险」的模式，它们共用：
//   Adventure.offline(ctx, step, stop)   离线时一秒一秒地模拟，直到回到码头或时间用完
//   Adventure.barRow(fleeLabel)          底部状态条最下面那一行（口粮、HP、背包、撤退）
'use strict';

const Adventure = {
  offline(ctx, step, stop) {
    const S = Game.S, gm0 = S.gameMinutes;
    const rep = { kind: S.mode, before: { coins: S.coins, gear: S.gear.length, battles: S.advStats.battles, wins: S.advStats.wins }, left: 0 };
    let t = 0;
    while (t < ctx.left && CF.modes.busy()) {
      if (stop && stop(rep)) break;
      step(1, true); t += 1;
    }
    rep.left = Math.max(0, ctx.left - t);
    rep.coins = S.coins - rep.before.coins; rep.gear = S.gear.length - rep.before.gear;
    rep.battles = S.advStats.battles - rep.before.battles; rep.wins = S.advStats.wins - rep.before.wins;
    rep.endMode = S.mode;
    S.gameMinutes = gm0 + t * TIME_SCALE;
    if (S.gameMinutes >= S.weatherUntil) Game.rollWeather();
    ctx.left = rep.left;
    ctx.report.adv = rep; ctx.report.notable = true;
    return rep;
  },
  barRow(fleeLabel) {
    const S = Game.S, st = Hero.stats(), H = S.hero;
    const foodN = S.bag.filter(x => foodValue(x)).length + Object.values(S.dishes || {}).reduce((a, b) => a + b, 0);
    return `<div class="ab-row"><span>🍱 口粮 ${foodN} 份 · ❤️ ${Math.ceil(H.hp)}/${st.maxHp}</span><button data-open="bag">🎒 背包</button><button data-open="adv" data-tab="gear">⚔️ 装备</button><button data-flee class="flee">${fleeLabel || '撤退'}</button></div>`;
  },
};

UI.offline(20, r => {
  if (!r.adv) return '';
  const a = r.adv;
  let h = `<div class="stats"><div><b>${a.battles}</b>场战斗</div><div><b>${a.wins}</b>胜利</div><div><b>🪙${fmtFull(a.coins)}</b>金币</div><div><b>${a.gear}</b>件装备</div></div>`;
  if (a.bossWait) h += '<div class="hint">小橘停在了 Boss 的门前，等你回来一起面对。</div>';
  else if (a.endMode !== CF.modes.home) h += `<div class="hint">${(CF.modes.defs[a.endMode] || {}).offlineText || '小橘还在冒险中……'}</div>`;
  return h;
});
