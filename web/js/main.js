// ===== 音效 + 主循环 + 启动 =====
'use strict';

const Sound = {
  ac: null,
  unlock() {
    if (!this.ac) { try { this.ac = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { return; } }
    if (this.ac.state === 'suspended') this.ac.resume();
  },
  ok() { return this.ac && Game.S && Game.S.settings.sound && this.ac.state === 'running'; },
  tone(freq, dur, type, vol, slide, delay) {
    if (!this.ok()) return;
    const t0 = this.ac.currentTime + (delay || 0);
    const o = this.ac.createOscillator(), g = this.ac.createGain();
    o.type = type || 'sine'; o.frequency.setValueAtTime(freq, t0);
    if (slide) o.frequency.exponentialRampToValueAtTime(slide, t0 + dur);
    g.gain.setValueAtTime(vol || 0.15, t0); g.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
    o.connect(g).connect(this.ac.destination); o.start(t0); o.stop(t0 + dur + 0.02);
  },
  noise(dur, vol, freq) {
    if (!this.ok()) return;
    const n = this.ac.sampleRate * dur, buf = this.ac.createBuffer(1, n, this.ac.sampleRate), d = buf.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n);
    const src = this.ac.createBufferSource(), f = this.ac.createBiquadFilter(), g = this.ac.createGain();
    src.buffer = buf; f.type = 'lowpass'; f.frequency.value = freq || 800; g.gain.value = vol || 0.2;
    src.connect(f).connect(g).connect(this.ac.destination); src.start();
  },
  click() { this.tone(660, 0.05, 'triangle', 0.06); },
  plop() { this.tone(500, 0.18, 'sine', 0.12, 140); this.noise(0.15, 0.05, 1500); },
  bite() { this.tone(880, 0.08, 'square', 0.06); this.tone(1100, 0.1, 'square', 0.06, null, 0.09); },
  coin() { this.tone(988, 0.08, 'square', 0.05); this.tone(1319, 0.18, 'square', 0.05, null, 0.08); },
  catch(r) {
    const seq = { junk: [300, 250], common: [523, 659, 784], rare: [523, 659, 784, 1047], epic: [523, 659, 784, 1047, 1319], legendary: [392, 523, 659, 784, 1047, 1319, 1568] }[r];
    seq.forEach((f, i) => this.tone(f, 0.22, 'triangle', 0.1, null, i * 0.08));
    this.noise(0.25, 0.06, 2000);
  },
  levelup() { [523, 659, 784, 1047].forEach((f, i) => this.tone(f, 0.3, 'triangle', 0.1, null, i * 0.1)); },
  thunder() { this.noise(1.6, 0.35, 300); },
};

(function boot() {
  const hadSave = Game.load();
  Renderer.init(document.getElementById('scene'));
  UI.init();
  AdvUI.init();
  Cheat.init();
  BattleFX.init();
  document.querySelectorAll('#nav button[data-gi]').forEach(b => { b.querySelector('span').innerHTML = gi(b.dataset.gi, '#ffe9b0', '24px'); });

  Game.on('cast', () => setTimeout(() => Sound.plop(), 800));
  Game.on('bite', () => Sound.bite());

  // 离线收益
  if (hadSave) {
    const away = (Date.now() - (Game.S.lastSave || Date.now())) / 1000;
    const report = Game.simulateOffline(away);
    if (report) setTimeout(() => UI.openOffline(report), 300);
  } else {
    setTimeout(() => Game.toast('小猫会自动挂机钓鱼，看到「!」时点击可以完美收竿 🐾', 'good'), 600);
  }
  setTimeout(() => Adv.story('intro'), 400);
  Game.save();

  let last = performance.now(), saveTimer = 0, kTimer = 0;
  function loop(now) {
    let dt = (now - last) / 1000; last = now;
    if (dt > 30) { // 页面被挂起很久：按离线结算
      const r = Game.simulateOffline(dt);
      if (r && (r.caught || r.adv)) UI.openOffline(r);
      dt = 0;
    } else if (dt > 0.1) { // 短暂卡顿：分步追赶
      let left = dt; while (left > 0.1) { Game.update(0.1); left -= 0.1; } dt = left;
    }
    Game.update(dt);
    Events.tick(dt);
    Market.tick(dt);
    Cook.tick();
    BattleFX.frame(dt);
    if (UI.panel && UI.panel.name === 'kitchen' && (kTimer += dt) > 1) { kTimer = 0; UI.render(true); }
    Renderer.frame(dt);
    UI.tick();
    AdvUI.tick();
    saveTimer += dt;
    if (saveTimer > 5) { saveTimer = 0; Game.save(); }
    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);

  document.addEventListener('visibilitychange', () => { if (document.hidden) Game.save(); });
  window.addEventListener('beforeunload', () => Game.save());
  window.__game = Game; // 便于调试
})();
