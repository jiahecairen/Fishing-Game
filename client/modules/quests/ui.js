// ===== 任务 · 界面 =====
'use strict';

CF.panel('quest', {
  title: '📜 任务',
  tabs: [['line', '📜 任务线'], ['req', '📮 委托']],
  render(p) {
  const S = Game.S, Q = S.quests;
  if (p.tab === 'line') {
    let h = '<div class="hint">套装不能合成：每条任务线从一个「线索」开始，完成步骤拿到图纸，再收集素材找工匠打造。</div>';
    for (const q of QUESTS) {
      const done = Q.done[q.id], i = Q.active[q.id], set = SETS[q.set];
      if (!done && i === undefined) { h += `<div class="qcard lock"><div class="qh">${gi('lock', '#a89d86', '22px')} <b>？？？</b></div><div class="ds">线索可能藏在：${q.clue.from}</div></div>`; continue; }
      const steps = q.steps.map((st, k) => {
        const state = done || k < i ? 'done' : k === i ? 'cur' : 'todo';
        let extra = '';
        if (state === 'cur') {
          if (st.type === 'submit') extra = `<div class="need">${Inv.needHTML(st.need)}</div><button class="btn sm primary" data-act="qact" data-id="${q.id}" ${Inv.canPay(st.need) ? '' : 'disabled'}>上交</button>`;
          else if (st.type === 'talk') extra = '<button class="btn sm primary" data-act="qact" data-id="' + q.id + '">继续</button>';
          else if (st.type === 'catch') extra = `<div class="need">进度 ${Q.prog[q.id] || 0}/${st.n}${st.weather ? `（需要${WEATHERS[st.weather].name}）` : ''}</div>`;
          else if (st.type === 'clear') extra = `<div class="need">通关「${(CF.content.get('dungeon', st.dungeon) || {}).name || st.dungeon}」</div>`;
        }
        return `<div class="qstep ${state}"><span class="qi">${state === 'done' ? '✔' : state === 'cur' ? '▶' : '·'}</span><div>${state === 'todo' ? '？？？' : st.text}${st.recipe && state === 'done' ? ` <small class="ok">→ 图纸：${UNIQUES[st.recipe].name}</small>` : ''}${extra}</div></div>`;
      }).join('');
      h += `<div class="qcard ${done ? 'done' : ''}"><div class="qh">${gi(q.clue.gi, '#c9a04a', '22px')} <b>${q.name}</b> <small>线索：${q.clue.name}</small>${done ? ' <span class="owned">已完成</span>' : ''}</div>
        <div class="qset">套装「${set.name}」：2 件 ${set.b2}；3 件 ${set.b3}</div>${steps}</div>`;
    }
    return [h, ''];
  }
  const avail = REQUESTS.filter(r => Quests.reqAvailable(r)), doneN = REQUESTS.filter(r => S.reqDone[r.id]).length;
  let h = '<div class="hint">码头的委托板。大家需要的东西各不相同，完成后能换到料理配方、素材和其他好东西。</div>';
  h += avail.length ? avail.map(r => {
    const ch = CHARS[r.npc] || CHARS.narr, w = r.reward;
    const rw = [w.cook && typeof DISHES !== 'undefined' && `料理配方「${DISHES[w.cook].name}」`, w.coins && `🪙${fmtFull(w.coins)}`, w.mats && Object.entries(w.mats).map(([m, n]) => `${MATERIALS[m].name}×${n}`).join('、'), w.perm && ITEM_BY_ID[w.perm].name, w.repair && '免费修船', w.kitchen && '厨房 +1 口锅'].filter(Boolean).join('、');
    return `<div class="qcard req"><div class="qh">${ch.spr && SPRITES[ch.spr] ? sprImg(ch.spr, 2, 'qface') : `<span class="qface">${ch.face}</span>`} <b>${r.title}</b> <small>${ch.name}</small></div>
      <div class="ds">${r.text}</div><div class="need">需要：${Inv.needHTML(r.need)}</div><div class="need">报酬：${rw}</div>
      <button class="btn sm primary" data-act="reqdo" data-id="${r.id}" ${Inv.canPay(r.need) ? '' : 'disabled'}>交付</button></div>`;
  }).join('') : '<div class="empty">暂时没有新的委托。去更远的地方看看吧。</div>';
  return [h, `<span class="info">已完成委托 ${doneN}/${REQUESTS.length}</span>`];
  },
});

UI.nav({ id: 'quest', label: '任务', icon: 'quest', order: 90, key: 'q', dot: () => Quests.anyReady() });
UI.goal(40, S => { const q = QUESTS.find(x => S.quests.active[x.id] !== undefined); return q ? [`📜 任务「${q.name}」：${Quests.step(q.id).text}`, 'quest'] : null; });
UI.actions({
  qact(ds) { Quests.act(ds.id); },
  reqdo(ds) { Quests.submitReq(ds.id); },
});
