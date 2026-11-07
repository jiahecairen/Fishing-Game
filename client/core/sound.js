// ===== 内核 · 音效（WebAudio 合成，不需要音频文件） =====
'use strict';

const Sound = {
  ac: null,
  unlock() {
    if (!this.ac) { try { this.ac = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { return; } }
    if (this.ac.state === 'suspended') this.ac.resume();
  },
  ok() { return this.ac && Game.S && Game.S.settings.sound !== false && this.ac.state === 'running'; },
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
