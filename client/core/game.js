// ===== 内核 · 世界与玩家（时间、日历、季节、天气、地点、金币、等级） =====
// 这些是所有玩法都会用到的「公共事实」，所以放在内核里。玩法本身都在 modules/ 里。
'use strict';

const TIME_SCALE = 1;             // 现实 1 秒 = 游戏 1 分钟（一天 24 分钟）
const OFFLINE_CAP_SEC = 8 * 3600; // 离线收益最多 8 小时

// ---------- 日历 ----------
const SEASONS = [
  { id: 'spring', name: '春', icon: '🌸', color: '#ff9ec4' },
  { id: 'summer', name: '夏', icon: '☀️', color: '#ffcf4a' },
  { id: 'autumn', name: '秋', icon: '🍁', color: '#ff8a3d' },
  { id: 'winter', name: '冬', icon: '❄️', color: '#9fd8ff' },
];
const MONTH_DAYS = 10;            // 1 个月 10 天，1 年 12 个月，每个季节 3 个月
const SEASON_WEATHER = {          // 季节对天气的影响（乘到地点的天气权重上）
  spring: { rain: 1.3, fog: 1.2, sunny: 1.1 },
  summer: { sunny: 1.3, storm: 1.7, fog: 0.6 },
  autumn: { cloudy: 1.3, fog: 1.4 },
  winter: { snow: 1.6, rain: 0.4, storm: 0.5 },
};
const PHASES = {
  dawn: { name: '清晨', icon: '🌅' },
  day: { name: '白天', icon: '☀️' },
  dusk: { name: '黄昏', icon: '🌇' },
  night: { name: '夜晚', icon: '🌙' },
};
function phaseOf(hour) {
  if (hour >= 5 && hour < 8) return 'dawn';
  if (hour >= 8 && hour < 17) return 'day';
  if (hour >= 17 && hour < 20) return 'dusk';
  return 'night';
}
// bite < 1 表示上钩更快；rare 为稀有及以上鱼的权重倍率；escape 为额外脱钩率
const WEATHERS = {
  sunny: { name: '晴朗', nightName: '晴夜', icon: '☀️', nightIcon: '✨', bite: 1.05, rare: 1.0, escape: 0 },
  cloudy: { name: '多云', icon: '⛅', bite: 0.95, rare: 1.05, escape: 0 },
  rain: { name: '小雨', icon: '🌧️', bite: 0.8, rare: 1.15, escape: 0.02 },
  storm: { name: '雷暴', icon: '⛈️', bite: 0.75, rare: 1.4, escape: 0.1 },
  fog: { name: '大雾', icon: '🌫️', bite: 1.0, rare: 1.3, escape: 0 },
  snow: { name: '飘雪', icon: '🌨️', bite: 1.1, rare: 1.2, escape: 0.03 },
};

// 地点（scene）是一种内容：由钓鱼模块注册具体的地点，内核只负责「现在在哪」
const SCENES = [];
CF.content.type('scene', { list: SCENES });

const Game = {
  _dirty: false,
  get S() { return CF.state.S; },

  // ---------- 事件（转发给内核总线） ----------
  on(ev, fn) { return CF.on(ev, fn); },
  emit(ev, data) { CF.emit(ev, data); },
  toast(msg, kind) { CF.emit('toast', { msg, kind }); },
  changed() { this._dirty = true; CF.emit('change'); },

  // ---------- 存档 ----------
  coreState() {
    return {
      coins: CF.tune('econ.startCoins', 300), level: 1, exp: 0,
      gameMinutes: 6 * 60, weather: 'sunny', weatherUntil: 9 * 60,
      scene: 'lake', unlockedScenes: ['lake'],
      mode: 'fish',
      story: { seen: {} },   // 看过的剧情（对话系统用）
    };
  },
  save() {
    if (!this.S) return;
    CF.storage.save(CF.state.serialize());
    this._dirty = false;
  },
  reset() {
    if (CF.storage.clear) CF.storage.clear();
    CF.state.S = CF.state.fresh();
    CF.each('migrate', CF.state.S);
    CF.each('reset');
    this.save(); this.changed();
  },

  // ---------- 时间 ----------
  hour(gm) { return ((gm === undefined ? this.S.gameMinutes : gm) / 60) % 24; },
  day(gm) { return Math.floor((gm === undefined ? this.S.gameMinutes : gm) / 1440) + 1; },
  phase(gm) { return phaseOf(this.hour(gm)); },
  dayIndex(gm) { return Math.floor((gm === undefined ? this.S.gameMinutes : gm) / 1440); },
  date(gm) {
    const d = this.dayIndex(gm), mi = Math.floor(d / MONTH_DAYS);
    return { d, year: Math.floor(mi / 12) + 1, month: mi % 12 + 1, dom: d % MONTH_DAYS + 1, monthIndex: mi, season: Math.floor((mi % 12) / 3) };
  },
  season(gm) { return SEASONS[this.date(gm).season].id; },
  dateStr() { const t = this.date(); return `第${t.year}年 ${SEASONS[t.season].icon}${SEASONS[t.season].name} ${t.month}月${t.dom}日`; },
  timeStr() {
    const m = Math.floor(this.S.gameMinutes) % 1440;
    return String(Math.floor(m / 60)).padStart(2, '0') + ':' + String(m % 60).padStart(2, '0');
  },
  tickWorld(dt) {
    const S = this.S;
    S.gameMinutes += dt * TIME_SCALE;
    if (S.gameMinutes >= S.weatherUntil) { this.rollWeather(); this.emit('weather'); this.changed(); }
  },
  // 离线时直接快进
  advanceTime(sec) {
    this.S.gameMinutes += sec * TIME_SCALE;
    if (this.S.gameMinutes >= this.S.weatherUntil) this.rollWeather();
  },

  // ---------- 天气 ----------
  weatherName() { const w = WEATHERS[this.S.weather]; return (this.phase() === 'night' && w.nightName) ? w.nightName : w.name; },
  weatherIcon() { const w = WEATHERS[this.S.weather]; return (this.phase() === 'night' && w.nightIcon) ? w.nightIcon : w.icon; },
  rollWeather(scene, gm) {
    const sc = this.sceneDef(scene || this.S.scene), se = SEASON_WEATHER[this.season(gm)] || {};
    const w = Object.entries(sc.weather).map(([k, v]) => [k, v * (se[k] || 1)]);
    if (this.season(gm) === 'winter' && !sc.weather.snow && !sc.noSnow) w.push(['snow', 22]);
    this.S.weather = weightedPick(w);
    this.S.weatherUntil = (gm === undefined ? this.S.gameMinutes : gm) + rand(120, 360);
  },
  setWeather(w, quiet) {
    this.S.weather = w;
    this.S.weatherUntil = this.S.gameMinutes + rand(180, 300);
    if (!quiet) this.emit('weather');
    this.changed();
  },

  // ---------- 地点 ----------
  sceneDef(id) { return CF.content.get('scene', id) || SCENES[0]; },
  scene() { return this.sceneDef(this.S.scene); },
  reached(place) { return this.S.unlockedScenes.includes(place); },
  unlockPlace(id) { if (!this.S.unlockedScenes.includes(id)) this.S.unlockedScenes.push(id); },
  // 玩家的「进度等级」：去过的最远地点的等级（1~5），用来决定掉落的装备等级等
  progressTier() { return Math.max(1, ...this.S.unlockedScenes.map(s => (this.sceneDef(s) || {}).tier || 1)); },
  switchScene(id) {
    if (CF.modes.busy()) return;
    if (!this.reached(id) || this.S.scene === id) return;
    this.S.scene = id;
    const sc = this.sceneDef(id);
    if (!sc.weather[this.S.weather]) this.rollWeather();
    this.emit('scene', id);
    this.changed(); this.save();
  },

  // ---------- 金币与等级 ----------
  addCoins(n) { this.S.coins += n; CF.emit('coins', n); },
  pay(price) {
    if (this.S.coins < price) { this.toast('金币不足喵～', 'warn'); return false; }
    this.S.coins -= price; return true;
  },
  expNeed(lv) { return Math.floor(40 * Math.pow(lv || this.S.level, 1.6)); },
  gainExp(n, quiet) {
    const S = this.S;
    S.exp += n;
    while (S.exp >= this.expNeed(S.level)) {
      S.exp -= this.expNeed(S.level);
      S.level++;
      const bonus = S.level * 50;
      S.coins += bonus;
      if (!quiet) this.emit('levelup', { level: S.level, bonus });
    }
  },
  nextUid() { return this.S.uid++; },
};
window.__game = Game; // 便于调试
