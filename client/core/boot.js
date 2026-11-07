// ===== 内核 · 加载器 =====
// 1. 加载内核文件  2. 读取 modules.js 里列出的每个模块的 module.js（清单）
// 3. 按依赖排序    4. 依次加载每个模块的文件  5. 启动游戏
'use strict';
(function () {
  const CORE = ['core/util.js', 'core/kernel.js', 'core/state.js', 'core/game.js', 'core/modes.js', 'core/ui.js',
    'core/net.js', 'core/sound.js', 'core/sprites.js', 'core/story.js', 'core/main.js', 'assets/icons.js'];
  const ver = (window.CF_CONFIG && window.CF_CONFIG.build) || Date.now();
  const status = msg => { const el = document.getElementById('boot-msg'); if (el) el.textContent = msg; };
  const fail = msg => { const el = document.getElementById('boot'); if (el) el.classList.add('err'); status(msg); console.error(msg); };

  function script(src) {
    return new Promise((ok, no) => {
      const s = document.createElement('script');
      s.src = src + '?v=' + ver; s.async = false;
      s.onload = ok; s.onerror = () => no(new Error('加载失败：' + src));
      document.head.appendChild(s);
    });
  }
  function css(href) {
    const l = document.createElement('link'); l.rel = 'stylesheet'; l.href = href + '?v=' + ver; document.head.appendChild(l);
  }

  (async () => {
    try {
      status('正在加载内核…');
      for (const f of CORE) await script(f);
      const wanted = (window.CF_MODULES || []).filter(Boolean);
      status('正在读取模块清单…');
      for (const id of wanted) await script(`modules/${id}/module.js`);
      const order = CF.sortManifests(wanted);
      CF.order = order;
      for (const id of order) {
        const m = CF.manifests[id];
        status(`正在加载模块：${m.name || id}`);
        for (const c of m.css) css(`modules/${id}/${c}`);
        for (const f of m.files) await script(`modules/${id}/${f}`);
      }
      status('启动中…');
      await CF.start();
    } catch (e) {
      fail('😿 ' + e.message);
    }
  })();
})();
