// ===== 设置 =====
'use strict';

UI.setting(50, S => `<div class="set-row"><div>音效</div><label class="switch"><input type="checkbox" data-act="setting" data-key="sound" ${S.settings.sound !== false ? 'checked' : ''}><span class="slider"></span></label></div>`);

CF.panel('settings', {
  title: '⚙️ 设置',
  render() {
    const S = Game.S, st = S.stats || {};
    let h = UI.settings.map(x => { try { return x.fn(S) || ''; } catch (e) { console.error(e); return ''; } }).join('');
    h += `<div class="section-title" style="margin-top:18px">统计</div>
      <div class="kv">
        <span class="k">抛竿次数</span><span>${fmtFull(st.casts || 0)}</span>
        <span class="k">钓到</span><span>${fmtFull(st.caught || 0)} 条</span>
        <span class="k">跑掉</span><span>${fmtFull(st.escaped || 0)} 条</span>
        <span class="k">累计收入</span><span>🪙 ${fmtFull(st.earned || 0)}</span>
        <span class="k">图鉴</span><span>${Object.keys(S.dex || {}).length}/${typeof FISH !== 'undefined' ? FISH.length : 0}</span>
      </div>
      <div class="section-title" style="margin-top:18px">操作说明</div>
      <div style="font-size:13.5px;line-height:1.8;color:var(--ink-muted)">
        空格 / 点击画面：抛竿、收竿（浮漂下沉出现「!」时点击即为<b>完美收竿</b>：鱼更大、更不容易跑）<br>
        快捷键：${UI.navs.filter(n => n.key).map(n => `${n.key.toUpperCase()} ${n.label}`).join(' · ')} · Esc 关闭面板<br>
        时间：现实 1 秒 = 游戏 1 分钟，一天 24 分钟；每月 10 天，3 个月一季。不同的鱼只在特定时段、天气和季节出没。
      </div>
      <div class="section-title" style="margin-top:18px">素材致谢</div>
      <div style="font-size:12.5px;line-height:1.7;color:var(--ink-muted)">装备与道具图标来自 <b>game-icons.net</b>（作者 Lorc、Delapouite 等），以 CC BY 3.0 协议授权。像素字体为 <b>Fusion Pixel Font</b>（SIL OFL 1.1）。怪物像素立绘为本游戏原创。<br>版本 v${CF.version} · 已加载 ${CF.order.length} 个模块</div>`;
    const foot = `<span class="info">存档自动保存</span><button class="btn sm red" data-act="reset">${UI._resetArmed ? '再点一次确认清空' : '重置存档'}</button>`;
    return [h, foot];
  },
});
UI.nav({ id: 'settings', label: '设置', icon: 'cog', order: 110 });
UI.actions({
  reset() {
    if (this._resetArmed) { this._resetArmed = false; Game.reset(); this.close(); Game.toast('存档已重置'); }
    else { this._resetArmed = true; this.render(true); setTimeout(() => { this._resetArmed = false; }, 4000); }
  },
});
