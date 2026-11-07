// ===== 内核 · 对话系统（Undertale 风格的打字机对话） =====
// 台词和角色由各模块注册：
//   CF.story.chars({ otter: { name: '獭爷爷', face: '🦦', pitch: 300 } });
//   CF.story.lines({ captain: [['otter', '哟，小家伙。'], ['narr', '* 旁白'], { choice: [['a', '选项 A'], ['b', '选项 B']] }] });
//   Story.run('captain', cb)   // 每段剧情只播放一次（force=true 可以重播）
'use strict';

const STORY = {};
const CHARS = { narr: { name: '', face: '' } };
CF.content.type('story', { map: STORY });
CF.story = {
  lines(map) { for (const [k, v] of Object.entries(map)) STORY[k] = v; },
  chars(map) { for (const [k, v] of Object.entries(map)) CHARS[k] = Object.assign(CHARS[k] || {}, v); },
};

const Story = {
  q: [], active: null,
  init() {
    const el = document.createElement('div');
    el.id = 'story'; el.className = 'hidden';
    el.innerHTML = '<div class="story-box"><div id="story-face"></div><div class="story-main"><div id="story-name"></div><div id="story-text"></div><div id="story-choices"></div></div><div id="story-more">▼</div></div>';
    document.body.appendChild(el);
    el.addEventListener('click', e => { const b = e.target.closest('button[data-c]'); if (b) { Sound.click(); this.choose(b.dataset.c); } else this.next(); });
    Game.on('story', d => this.play(d.id, d.cb, d.lines));
    // 剧情播放时，冒险模式（航海、副本……）暂停；钓鱼不停
    CF.hook('mode.blocked', d => !!this.active && d.id !== CF.modes.home);
  },
  // 播放一段剧情（记录已看过）
  run(id, cb, force) {
    const S = Game.S;
    if (!id || !STORY[id] || (S.story.seen[id] && !force)) { if (cb) cb(); return; }
    S.story.seen[id] = true;
    Game.emit('story', { id, cb });
  },
  seen(id) { return !!Game.S.story.seen[id]; },
  play(id, cb, extra) {
    const lines = extra || STORY[id]; if (!lines) { if (cb) cb(); return; }
    this.q.push({ lines: lines.slice(), cb });
    if (!this.active) this.nextScript();
  },
  nextScript() {
    const s = this.q.shift();
    if (!s) { this.active = null; this.hide(); return; }
    this.active = s; this.i = -1; this.choosing = false;
    $('#story').classList.remove('hidden'); this.next();
  },
  hide() { $('#story').classList.add('hidden'); },
  next() {
    const s = this.active; if (!s) return;
    if (this.typing) { this.finishType(); return; }
    if (this.choosing) return;
    this.i++;
    if (this.i >= s.lines.length) return this.end();
    const ln = s.lines[this.i];
    if (ln.choice) return this.showChoice(ln.choice);
    const [who, text] = ln, ch = CHARS[who] || CHARS.narr;
    const face = $('#story-face');
    face.innerHTML = ch.spr && SPRITES[ch.spr] ? sprImg(ch.spr, ch.spr === 'hero' ? 5 : 3) : (ch.face || '');
    face.classList.toggle('hidden', !ch.face && !ch.spr);
    $('#story-name').textContent = ch.name || '';
    $('#story-choices').innerHTML = '';
    $('#story-more').classList.add('hidden');
    this.type(text, ch);
  },
  type(text, ch) {
    const el = $('#story-text'); el.textContent = '';
    this.full = text; this.pos = 0; this.typing = true;
    const pitch = ch.pitch || 440;
    clearInterval(this.timer);
    this.timer = setInterval(() => {
      this.pos++;
      el.textContent = this.full.slice(0, this.pos);
      const c = this.full[this.pos - 1];
      if (this.pos % 2 === 0 && c && !/[\s，。！？、…*（）]/.test(c)) Sound.tone(pitch * (0.95 + Math.random() * 0.1), 0.035, 'square', 0.025);
      if (this.pos >= this.full.length) this.finishType();
    }, ch.slow ? 75 : 32);
  },
  finishType() { clearInterval(this.timer); this.typing = false; $('#story-text').textContent = this.full; $('#story-more').classList.remove('hidden'); },
  showChoice(choices) {
    this.choosing = true; $('#story-more').classList.add('hidden');
    $('#story-choices').innerHTML = choices.map(([id, label]) => `<button data-c="${id}">${label}</button>`).join('');
  },
  choose(id) { this.choosing = false; this.choice = id; this.end(); },
  end() {
    const s = this.active, c = this.choice;
    this.choice = null; this.choosing = false; this.typing = false;
    $('#story-choices').innerHTML = '';
    this.active = null;
    if (s && s.cb) s.cb(c);
    if (!this.active) { if (this.q.length) this.nextScript(); else { this.hide(); UI.popModal(); } }
  },
};
