// ===== 突发事件 · 卡片界面 =====
'use strict';

const EventsUI = {
  init() {
    document.body.insertAdjacentHTML('beforeend', '<div id="event-card" class="hidden"></div>');
    $('#event-card').addEventListener('click', e => { const b = e.target.closest('button[data-ev]'); if (b) { Sound.click(); Events.choose(+b.dataset.ev); } });
    Game.on('event', c => this.render(c));
  },
  render(c) {
    const el = $('#event-card');
    if (!c) { el.classList.add('hidden'); return; }
    const d = c.def;
    const icon = d.spr ? sprImg(d.spr, 4, 'ev-spr') : gi(d.icon, d.color || '#fff', '44px');
    const text = typeof d.text === 'function' ? d.text(c.ctx) : (c.ctx.text || d.text);
    let body;
    if (c.done) body = `<div class="ev-res">${c.result}</div>`;
    else body = `<div class="ev-text">${(text || '').replace(/\n/g, '<br>')}</div><div class="ev-ch">${d.choices.map((ch, i) => `<button data-ev="${i}">${typeof ch.t === 'function' ? ch.t(c.ctx) : ch.t}</button>`).join('')}</div>
      <div class="ev-timer"><div style="animation-duration:${c.max}s"></div></div>`;
    el.innerHTML = `<div class="ev-head">${icon}<div><div class="ev-kind">${Events.labels[c.where] || '事件'}</div><div class="ev-title">${d.title}</div></div></div>${body}`;
    el.classList.remove('hidden');
  },
};
CF.module({ id: 'events', init: () => EventsUI.init() });
