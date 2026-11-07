// ===== 战斗 · 引擎（纯逻辑，不碰界面） =====
// 回合制：速度决定出手顺序；小橘每回合 +1 行动点（最多 10），技能消耗行动点。
//
// 开一场战斗：
//   Battle.fight('gull', 12, { where: 'voyage', tier: 3, boss: false, onWin(offline) {}, onLose(offline) {} });
//
// 不同场合（钓鱼突发 / 航海 / 副本 / 以后的潜水……）用「战斗场合」决定战斗方式、背景、输赢后怎么办：
//   Battle.context('diving', { mode: () => 'auto', theme: () => ({ kind: 'sea' }), win(B, offline) {}, lose(B, offline) {} });
//
// 技能：CF.content.define('skill', 'id', { name, ap, hits, mult } | { heal } | { guard } | { use(B, api) {...} })
// 怪物：见 modules/monsters/（每只一个文件，可以写自己的 act() 行为）
//
// 钩子：battle.foods() 战斗中能吃的东西；battle.autoAction(B, st) 自动战斗的决定（可以覆盖）
//       battle.heroDamage(d, B) / battle.foeDamage(d, B) 修改伤害（作弊模式用）；battle.tags(B) 状态栏文字
// 事件：battleStart / battleLog / battleAwait / battle:win / battleEnd
'use strict';

const STEP_TIME = 0.8;
const SKILLS = {};
CF.content.type('skill', { map: SKILLS });
const MONSTERS = {};
CF.content.type('monster', { map: MONSTERS });

// 怪物强度按「该等级玩家的预期装备」来计算：装备落后会很吃力，装备领先会很轻松
function heroExpect(L) {
  const t = clamp(1 + (L - 4) / 9, 1, 5.6), m = 1.45;
  return { hp: 100 + 82 * Math.pow(t, 1.4) * m, atk: 10 + (6 + 10 * Math.pow(t, 1.3)) * m + 0.4 * L, def: 9.5 + 7.4 * Math.pow(t, 1.3) * m };
}
function monsterStats(id, lv) {
  const m = MONSTERS[id], X = heroExpect(lv);
  const soft = lv < 10 ? 0.75 + 0.025 * lv : 1;
  const b = m.final ? 5.5 : m.hidden ? 4.2 : m.boss ? 3.4 : 1, a = m.final ? 1.3 : m.hidden ? 1.35 : m.boss ? 1.2 : 1;
  const def = 0.45 * X.def;
  const st = {
    id, name: m.name, lv, boss: !!m.boss, final: !!m.final, skill: m.skill,
    maxHp: Math.round(7.5 * X.atk * 100 / (100 + def) * b * (1 + Math.max(0, lv - 6) / 22)),
    atk: Math.round(0.06 * X.hp * (100 + X.def) / 100 * a * soft * (1 + Math.max(0, lv - 6) / 45)),
    def: Math.round(def), spd: Math.round(8 + 0.5 * lv),
  };
  if (m.scale) Object.assign(st, m.scale(st, lv)); // 怪物文件可以微调自己的数值
  return st;
}

const Battle = {
  battle: null,
  _endTimer: 0,
  contexts: {},
  get S() { return Game.S; },
  context(where, def) { this.contexts[where] = def; },
  ctxDef(B) { return this.contexts[(B || this.battle || {}).ctx ? (B || this.battle).ctx.where : ''] || {}; },

  // 这场战斗用什么方式：auto 自动 / manual 纯手动 / boss Boss 战手动
  mode(B) { const C = this.ctxDef(B); return (C.mode && C.mode()) || this.S.settings.battleMode || 'auto'; },
  isManual(B) {
    if (B.offline || B.forceAuto) return false;
    const m = this.mode(B);
    return m === 'manual' || (m === 'boss' && B.foe.boss);
  },
  theme(B) { const C = this.ctxDef(B); return (C.theme && C.theme(B)) || { kind: 'out', scene: this.S.scene }; },

  // ---------- 开始 ----------
  fight(monId, lv, ctx, offline) { return this.start(monsterStats(monId, lv), ctx, offline); },
  start(foe, ctx, offline) {
    const S = this.S, st = Hero.stats();
    S.advStats.battles++;
    const B = {
      foe: Object.assign({}, foe, { hp: foe.maxHp }), ctx: ctx || { where: 'event' }, log: [], over: false, result: null, offline: !!offline,
      ht: 100 / st.spd, ft: 100 / foe.spd * 1.05, foeTurns: 0, timer: 0, fx: null, mercy: false,
      ap: Math.min(st.apStart, st.apMax), guard: 0, freeze: 0, nine: false, turn: 0, vars: {},
    };
    const M = MONSTERS[foe.id];
    B.log.push(M.check);
    B.log.push(`* ${foe.name}（Lv.${foe.lv}）出现了！`);
    if (M.onStart) M.onStart(B, this.api(B));
    this.battle = B;
    if (!offline) { Game.emit('battleStart', B); if (!S.story.seen.firstBattle) Story.run('firstBattle'); }
    else this.runOffline(B);
    return B;
  },
  // 给技能 / 怪物脚本用的小工具
  api(B) {
    const self = this;
    return {
      log: msg => B.log.push(msg),
      hero: Hero, stats: () => Hero.stats(),
      damageFoe(n) { B.foe.hp = Math.max(0, B.foe.hp - n); return n; },
      damageHero(n) { const S = self.S; n = CF.filter('battle.heroDamage', n, B); S.hero.hp = Math.max(0, S.hero.hp - n); return n; },
      healHero: n => Hero.heal(n),
      healFoe: n => { B.foe.hp = Math.min(B.foe.maxHp, B.foe.hp + n); },
      dmg: (atk, def, mult) => self.dmg(atk, def, mult),
      fx: f => { B.fx = f; },
    };
  },
  dmg(atk, def, mult) { return Math.max(1, Math.round(atk * mult * rand(0.9, 1.1) * 100 / (100 + def))); },
  heroHit(B, st, fx, mult) {
    let d = this.dmg(st.atk, B.foe.def, mult), crit = false;
    if (Math.random() < st.crit) { d = Math.round(d * st.critDmg); crit = true; }
    if (fx.rage && this.S.hero.hp < st.maxHp * 0.4) d = Math.round(d * (1 + fx.rage));
    d = CF.filter('battle.foeDamage', d, B);
    return { d, crit };
  },
  // 战斗中能吃的东西（料理、鱼……由各模块提供）
  foods() { return CF.call('battle.foods').flat().filter(Boolean); },

  // ---------- 自动战斗 AI ----------
  autoAction(B, st) {
    const custom = CF.first('battle.autoAction', B, st); if (custom) return custom;
    const S = this.S, H = S.hero, F = B.foe, known = Hero.skills(), has = k => known.includes(k) && SKILLS[k];
    if (H.hp < st.maxHp * 0.35 && S.settings.autoEat) {
      const miss = (st.maxHp - H.hp) / st.maxHp;
      const foods = this.foods();
      if (foods.length) {
        foods.sort((a, b) => Math.abs(a.heal - miss) - Math.abs(b.heal - miss) - (b.ap - a.ap) * (B.ap < 3 ? 0.05 : 0));
        return { type: 'eat', food: foods[0] };
      }
    }
    if (has('heal') && H.hp < st.maxHp * 0.45 && B.ap >= SKILLS.heal.ap) return { type: 'skill', id: 'heal' };
    if (has('guard') && !B.guard && F.skill && (B.foeTurns + 1) % F.skill.every === 0 && B.ap >= SKILLS.guard.ap && B.ft <= B.ht + 100 / st.spd) return { type: 'skill', id: 'guard' };
    if (has('sweep') && B.ap >= 5) return { type: 'skill', id: 'sweep' };
    if (has('bone') && B.ap >= 2 && (!has('sweep') || B.ap >= 7)) return { type: 'skill', id: 'bone' };
    if (!has('bone') && !has('sweep') && B.ap >= 1) return { type: 'skill', id: 'claw' };
    return { type: 'skill', id: 'punch' };
  },
  // 手动操作：界面调用
  heroAct(action) {
    const B = this.battle; if (!B || !B.await) return;
    if (action.type === 'skill') {
      const K = SKILLS[action.id];
      if (!K || !Hero.skills().includes(action.id) || B.ap < K.ap) { Game.toast('行动点不够', 'warn'); return; }
    }
    if (action.type === 'auto') { B.forceAuto = true; action = null; }
    B.await = false; B.pending = action;
    B.timer = STEP_TIME; // 立即执行
  },
  doHero(B, st, fx, act) {
    const S = this.S, F = B.foe;
    B.ht += 100 / st.spd; B.turnStarted = false; B.turn++;
    if (act.type === 'eat') {
      const fd = act.food, r = fd.eat ? fd.eat() : null;
      const hp = r ? r.hp : 0, ap = r ? r.ap : 0;
      if (ap) B.ap = Math.min(st.apMax, B.ap + ap);
      B.log.push(`* 小橘吃掉了${fd.name}。HP +${hp}${ap ? `，行动点 +${ap}` : ''}`);
      B.fx = { who: 'hero', kind: 'heal', skill: 'eat' };
      return;
    }
    const id = act.id, K = SKILLS[id];
    B.ap -= K.ap;
    if (K.use) { K.use(B, Object.assign(this.api(B), { st, fx })); return; }
    if (K.heal) { const r = Hero.heal(st.maxHp * K.heal); B.log.push(`${K.text} HP +${r}`); B.fx = { who: 'hero', kind: 'heal', skill: id }; return; }
    if (K.guard) { B.guard = K.guard; B.log.push(K.text); B.fx = { who: 'hero', kind: 'buff', skill: id }; return; }
    let total = 0, crit = false;
    for (let i = 0; i < K.hits; i++) { const h = this.heroHit(B, st, fx, K.mult); total += h.d; crit = crit || h.crit; }
    let extra = '';
    if (fx.double && Math.random() < fx.double) { const h = this.heroHit(B, st, fx, 1); total += h.d; extra = '（追加攻击！）'; }
    if (crit && fx.critAp) B.ap = Math.min(st.apMax, B.ap + fx.critAp);
    F.hp = Math.max(0, F.hp - total);
    if (fx.lifesteal) Hero.heal(total * fx.lifesteal);
    if (fx.freeze && F.hp > 0 && Math.random() < fx.freeze) { B.freeze = 1; extra += '（冻住了！）'; }
    B.log.push(`${K.text} 造成 ${total} 点伤害${crit ? '（会心一击！）' : ''}${extra}`);
    B.fx = { who: 'foe', kind: 'hit', n: total, crit, skill: id, hits: K.hits };
    const M = MONSTERS[F.id];
    if (M.onHit) M.onHit(B, total, this.api(B));
    if (M.mercy && !B.mercy && F.hp > 0 && F.hp <= F.maxHp * M.mercy.at) { B.mercy = true; B.pause = 'mercy'; }
  },
  // 怪物的回合：怪物文件可以写 act(B, api) 自定义行为（返回 true 表示已经处理）
  doFoe(B, st, fx) {
    const S = this.S, H = S.hero, F = B.foe, M = MONSTERS[F.id];
    B.ft += 100 / F.spd;
    if (B.freeze) { B.freeze = 0; B.log.push(`* ${F.name}被冻住了，动弹不得！`); B.fx = { who: 'foe', kind: 'frozen' }; return; }
    B.foeTurns++;
    if (M.act && M.act(B, this.api(B))) return;
    const useSk = F.skill && B.foeTurns % F.skill.every === 0;
    if (fx.dodge && Math.random() < fx.dodge) { B.log.push(`* ${F.name}${useSk ? `使出了「${F.skill.name}」` : '发起了攻击'}……小橘轻盈地闪开了！`); B.fx = { who: 'hero', kind: 'dodge', foeSkill: useSk }; return; }
    let d = this.dmg(F.atk, st.def, useSk ? F.skill.mult : 1);
    let note = '';
    if (B.guard) { d = Math.round(d / 2); B.guard--; note = '（炸毛减伤）'; }
    d = CF.filter('battle.heroDamage', d, B);
    H.hp -= d;
    if (H.hp <= 0 && Hero.talentRank('s5') && !B.nine) { H.hp = 1; B.nine = true; note += ' 九命猫发动，小橘咬牙撑住了！'; }
    H.hp = Math.max(0, H.hp);
    if (fx.thorns && d > 0) { const r = Math.round(d * fx.thorns); F.hp = Math.max(0, F.hp - r); note += ` 反弹 ${r}`; }
    B.log.push((useSk ? `* ${F.name}使出了「${F.skill.name}」！小橘受到 ${d} 点伤害` : `* ${F.name}发起了攻击。小橘受到 ${d} 点伤害`) + note);
    B.fx = { who: 'hero', kind: 'hit', n: d, big: useSk, foeSkill: useSk };
  },
  step(B) {
    if (B.over || B.pause || B.await) return;
    const st = Hero.stats(), fx = Hero.effects();
    B.fx = null;
    if (B.ht <= B.ft) {
      // —— 小橘的回合 ——
      if (!B.turnStarted) {
        B.turnStarted = true;
        B.ap = Math.min(st.apMax, B.ap + 1 + (fx.apRegen || 0));
        if (fx.regen) Hero.heal(st.maxHp * fx.regen);
      }
      let act = B.pending; B.pending = null;
      if (!act) {
        if (this.isManual(B)) { B.await = true; Game.emit('battleAwait', B); return; }
        act = this.autoAction(B, st);
      }
      this.doHero(B, st, fx, act);
    } else this.doFoe(B, st, fx);
    this.afterStep(B);
  },
  afterStep(B) {
    if (B.log.length > 40) B.log.splice(0, B.log.length - 40);
    if (B.foe.hp <= 0) this.win(B);
    else if (this.S.hero.hp <= 0) this.lose(B);
  },

  // ---------- 结果 ----------
  win(B) {
    const S = this.S, F = B.foe, fx = Hero.effects(), M = MONSTERS[F.id];
    B.over = true; B.result = 'win';
    S.advStats.wins++; S.advStats.kills++;
    const exp = Math.round(F.lv * 7 * (F.boss ? 5 : 1) * (B.ctx.expMul || 1));
    const coins = Math.round(F.lv * rand(6, 10) * (F.boss ? 5 : 1) * (1 + (fx.gold || 0)));
    Game.gainExp(exp); Game.addCoins(coins);
    let msg = `* 你赢了！获得 ${exp} 经验和 🪙${coins}。`;
    const tier = B.ctx.tier || Game.progressTier();
    if (!F.boss && Math.random() < 0.22) { const g = Hero.newGear(tier, 1); if (Hero.addGear(g, true)) { msg += ` 掉落了【${gearName(g)}】！`; B.drop = g; } }
    if (!F.boss && Math.random() < 0.04 && Inv.kinds.treasure) { Inv.give('treasure', 'key', 1); msg += ' 掉落了一把钥匙！'; }
    if (M.drop && Math.random() < M.drop[1] && Inv.kinds.treasure) { Inv.give('treasure', M.drop[0], 1); msg += ` 掉落了【${Inv.needName('treasure', M.drop[0])}】！`; }
    if (M.unique && Math.random() < M.unique[1] && !Hero.ownsUnique(M.unique[0])) {
      const g = Hero.giveUnique(M.unique[0], true); if (g) { msg += ` ✨掉落了隐藏装备【${gearName(g)}】！`; B.drop = g; }
    }
    if (M.mats && Math.random() < M.mats[1]) { Inv.give('mat', M.mats[0], M.mats[2]); msg += ` 获得素材【${Inv.needName('mat', M.mats[0])}×${M.mats[2]}】`; }
    if (M.onDefeat) M.onDefeat(B, this.api(B));
    B.reward = { exp, coins, gear: !!B.drop };
    B.log.push(msg);
    CF.emit('battle:win', B);
  },
  lose(B) {
    B.over = true; B.result = 'lose';
    this.S.hero.hp = 1;
    B.log.push('* 小橘眼前一黑……');
    B.log.push('* 但是，泡泡把你拖回了岸边。');
  },
  // 饶恕（怪物文件里写了 mercy 才会出现）
  mercyChoice(c) {
    const B = this.battle; if (!B) return;
    B.pause = null;
    if (c === 'spare') { B.over = true; B.result = 'spare'; B.log.push('* 你放下了鱼竿。'); Game.gainExp(B.foe.lv * 40); }
    else B.log.push('* 你握紧了鱼竿。');
    Game.emit('battleLog', B);
  },
  runOffline(B) { B.offline = true; let n = 0; while (!B.over && n++ < 600) { if (B.pause) B.pause = null; B.await = false; this.step(B); } this.finish(true); },
  finish(offline) {
    const B = this.battle;
    if (!B) return;
    this.battle = null;
    if (!offline) Game.emit('battleEnd', B);
    const C = this.ctxDef(B);
    if (B.result === 'lose') {
      if (B.ctx.onLose) B.ctx.onLose(offline);
      if (C.lose) C.lose(B, offline); else Game.toast('被打败了……', 'warn');
      Game.changed();
      return;
    }
    if (B.ctx.onWin) B.ctx.onWin(offline);
    if (C.win) C.win(B, offline);
    Game.changed();
  },
  // 不打了（逃跑 / 撤退时）
  cancel() { if (!this.battle) return; this.battle = null; Game.emit('battleEnd', {}); },

  tick(dt) {
    const B = this.battle; if (!B) return;
    if (Story.active || B.pause) return;
    if (B.over) { this._endTimer += dt; if (this._endTimer > 1.6) { this._endTimer = 0; this.finish(false); } return; }
    B.timer += dt * (this.S.settings.battleSpeed || 1);
    if (B.await) return;
    while (B.timer >= STEP_TIME && !B.over && !B.pause && !B.await) { B.timer -= STEP_TIME; this.step(B); if (!B.await) Game.emit('battleLog', B); }
  },
};

CF.module({
  id: 'battle',
  state: () => ({ advStats: { battles: 0, wins: 0, kills: 0 } }),
  shared: { settings: { battleMode: 'auto', battleSpeed: 1, autoEat: true } },
  init() {
    CF.hook('fish.paused', () => !!Battle.battle);
    CF.hook('mode.blocked', () => !!Battle.battle);
    CF.on('mode', () => Battle.cancel());
    // 码头上的突发战斗：打完不切换模式
    Battle.context('event', {});
    // 背包里的鱼也能在战斗中吃
    CF.hook('battle.foods', () => {
      const S = Game.S, st = Hero.stats(), seen = {}, out = [];
      for (const it of S.bag) {
        const fv = foodValue(it); if (!fv) continue;
        if (seen[it.id]) { seen[it.id].n++; continue; }
        const f = seen[it.id] = { kind: 'fish', id: it.id, n: 1, name: FISH_BY_ID[it.id].name, heal: fv.hp / st.maxHp, ap: fv.ap,
          eat: () => { const i = S.bag.findIndex(x => x.id === it.id); if (i < 0) return null; const item = S.bag.splice(i, 1)[0], v = foodValue(item); return { hp: Hero.heal(v.hp), ap: v.ap }; } };
        out.push(f);
      }
      return out;
    }, 10);
  },
  tick: dt => Battle.tick(dt),
  reset() { Battle.battle = null; },
});
