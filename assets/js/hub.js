/* ============================================================
   hub.js —— 首页交互
   一级：分类网格；二级：分类下的工具
   点击分类的交互随主题变化：
     - clean 主题 → 在分类网格下方「下拉展开」工具列表
     - dopamine 主题 → 「炸开」，工具气泡散列在分类四周
   另含：搜索、汉堡抽屉、齿轮设置面板、轻提示
   ============================================================ */
(function () {
  'use strict';

  var TOOLS = window.TOOLS || [];
  var CATS = window.CATEGORIES || [];
  var META = window.HUB_META || {};

  var el = {
    catGrid: document.getElementById('cat-grid'),
    catTools: document.getElementById('cat-tools'),
    catTitle: document.getElementById('cat-tools-title'),
    grid: document.getElementById('grid'),
    empty: document.getElementById('empty'),
    search: document.getElementById('search'),
    stat: document.getElementById('stat'),
    back: document.getElementById('cat-back'),
    menuBtn: document.getElementById('menu-btn'),
    drawer: document.getElementById('drawer'),
    drawerClose: document.getElementById('drawer-close'),
    scrim: document.getElementById('scrim'),
    settingsBtn: document.getElementById('settings-btn'),
    settings: document.getElementById('settings-panel'),
    settingsClose: document.getElementById('settings-close'),
    themeSeg: document.getElementById('theme-seg'),
    clearData: document.getElementById('clear-data'),
    bell: document.getElementById('bell-btn'),
    burst: document.getElementById('burst-layer'),
    toast: document.getElementById('toast')
  };

  var keyword = '';
  var activeCat = null;   // clean：下拉展开的分类 id
  var burstCat = null;    // dopamine：炸开的分类 id

  /* ---------------- 工具函数 ---------------- */
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function toolsOf(id) {
    return TOOLS.filter(function (t) { return t.categoryId === id; });
  }
  function themeName() {
    return (window.THEME && window.THEME.current()) || 'clean';
  }
  function isDopamine() { return themeName() === 'dopamine'; }
  function clamp(v, min, max) { return Math.max(min, Math.min(max, v)); }

  function toast(msg) {
    if (!el.toast) return;
    el.toast.hidden = false;
    el.toast.textContent = msg;
    requestAnimationFrame(function () { el.toast.classList.add('show'); });
    clearTimeout(toast._t);
    toast._t = setTimeout(function () {
      el.toast.classList.remove('show');
      setTimeout(function () { el.toast.hidden = true; }, 220);
    }, 1900);
  }

  /* ---------------- 一级：分类网格 ---------------- */
  function renderCatGrid() {
    if (!el.catGrid) return;
    var curId = activeCat || burstCat;
    el.catGrid.innerHTML = '';
    CATS.forEach(function (c) {
      var n = toolsOf(c.id).length;
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'cat-tile' +
        (n === 0 ? ' is-empty' : '') +
        (curId === c.id ? ' is-active' : '');
      b.dataset.cat = c.id;
      b.style.setProperty('--cat-c', 'var(--cat-' + (c.color || 1) + ')');
      b.setAttribute('aria-label', c.name + '（' + n + ' 个工具）');
      b.innerHTML =
        '<span class="cat-ico" aria-hidden="true">' + esc(c.icon || '🧩') + '</span>' +
        '<span class="cat-name">' + esc(c.name) + '</span>';
      b.addEventListener('click', function () { onCatClick(c, b); });
      el.catGrid.appendChild(b);
    });
  }

  function onCatClick(c, btn) {
    if (isDopamine()) { openBurst(c, btn); }
    else { toggleAccordion(c); }
  }

  /* ---------------- 二级：工具卡片 ---------------- */
  function cardHtml(t) {
    var feats = (t.features || []).slice(0, 3).map(function (f) {
      return '<li>' + esc(f) + '</li>';
    }).join('');
    var tags = (t.tags || []).map(function (g) {
      return '<span class="tag">' + esc(g) + '</span>';
    }).join('');
    var iconHtml = t.illustration
      ? '<img class="card-illo" src="' + esc(t.illustration) + '" alt="" loading="lazy">'
      : '<div class="card-icon">' + esc(t.icon || '🧩') + '</div>';
    return '<div class="card-head">' + iconHtml +
        '<div><p class="card-title">' + esc(t.name) + '</p>' +
        '<span class="card-ver">v' + esc(t.version || '0.1.0') + ' · ' + esc(t.updated || '') + '</span></div></div>' +
      '<p class="card-desc">' + esc(t.desc) + '</p>' +
      (feats ? '<ul class="card-feats">' + feats + '</ul>' : '') +
      '<div class="card-foot"><div class="tags">' + tags + '</div>' +
      '<span class="card-go">打开 →</span></div>';
  }

  function showTools(title, mutedText, list, emptyMsg) {
    el.grid.innerHTML = '';
    list.forEach(function (t) {
      var a = document.createElement('a');
      a.className = 'card';
      a.href = t.path;
      a.innerHTML = cardHtml(t);
      el.grid.appendChild(a);
    });
    el.empty.textContent = emptyMsg || '该分类暂无工具，敬请期待。';
    el.empty.hidden = list.length > 0;
    el.catTitle.innerHTML = esc(title) +
      (mutedText ? '<span class="muted">' + esc(mutedText) + '</span>' : '');
    el.catTools.classList.add('is-open');
  }

  function closeTools() {
    el.catTools.classList.remove('is-open');
    activeCat = null;
    renderCatGrid();
  }

  function toggleAccordion(c) {
    closeBurst();
    if (activeCat === c.id) { closeTools(); return; }   // 再点一次收起
    activeCat = c.id;
    renderCatGrid();
    var list = toolsOf(c.id);
    showTools(c.name, list.length ? list.length + ' 个工具' : '', list,
      '「' + c.name + '」分类暂无工具，敬请期待。');
    setTimeout(function () {
      if (el.catTools.scrollIntoView) el.catTools.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }, 30);
  }

  /* ---------------- 光束扇形炸开（多巴胺主题） ----------------
     分类磁贴当"光源"，朝视野开阔的一侧射出一道扇形光束，
     该分类下的工具沿光束的角度范围依次展开，并各有一条光射线连回光源。 */
  function openBurst(c, btn) {
    if (!el.burst) { toggleAccordion(c); return; }
    closeTools();

    var W = window.innerWidth, H = window.innerHeight;
    var rect = btn.getBoundingClientRect();
    var cx = rect.left + rect.width / 2;
    var cy = rect.top + rect.height / 2;

    var list = toolsOf(c.id);
    var items = list.length ? list : [{ empty: true, name: '敬请期待', icon: '✨' }];
    var n = items.length;

    // 1) 发射方向（conic 角度制：0=上，90=右，180=下，270=左，顺时针）
    //    磁贴下半屏 → 朝上打；贴左右边 → 朝屏幕内侧倾斜
    var MX = 52, MT = 76, MB = 72;                       // 视口边距
    var down = cy < H * 0.56;
    var bias = cx < W * 0.3 ? -1 : (cx > W * 0.7 ? 1 : 0);
    var base = (down ? 180 : 0) + (down ? 1 : -1) * bias * 26;

    // 2) 扇形张角：工具越多张得越开，但控制在 76°~152°
    var spread = n > 1 ? clamp(30 * n, 76, 152) : 44;
    var a0 = base - spread / 2;

    // 3) 半径：理想值 → 按视口逐角度收敛，保证整个扇形都在屏幕内
    //    工具越多，弧长越紧张 → 半径相应放大，避免气泡挤在一起
    var R0 = Math.min(210, Math.max(118, Math.min(W, H) * 0.34));
    R0 = Math.min(R0 * (1 + 0.05 * Math.max(0, n - 3)), Math.min(W, H) * 0.44);
    var R = R0;
    var angs = [];
    for (var k = 0; k < n; k++) {
      var deg = n > 1 ? a0 + k * (spread / (n - 1)) : base;
      angs.push(deg);
      var rad = deg * Math.PI / 180;
      var sx = Math.sin(rad), sy = -Math.cos(rad);       // 屏幕坐标方向向量
      if (sx > 0.001) R = Math.min(R, (W - MX - cx) / sx);
      else if (sx < -0.001) R = Math.min(R, (cx - MX) / -sx);
      if (sy > 0.001) R = Math.min(R, (H - MB - cy) / sy);
      else if (sy < -0.001) R = Math.min(R, (cy - MT) / -sy);
    }
    R = Math.max(76, Math.min(R0, R));

    // 4) 绘制
    el.burst.innerHTML = '';
    el.burst.hidden = false;
    var colorVar = 'var(--cat-' + (c.color || 1) + ')';

    var beam = document.createElement('div');
    beam.className = 'burst-beam';
    beam.style.left = cx + 'px';
    beam.style.top = cy + 'px';
    beam.style.setProperty('--bl', (R + 92).toFixed(1) + 'px');
    beam.style.setProperty('--a0', a0.toFixed(1) + 'deg');
    beam.style.setProperty('--spread', spread.toFixed(1) + 'deg');
    beam.style.setProperty('--cat-c', colorVar);
    el.burst.appendChild(beam);

    var core = document.createElement('div');
    core.className = 'burst-core';
    core.style.left = cx + 'px';
    core.style.top = cy + 'px';
    core.style.setProperty('--cat-c', colorVar);
    el.burst.appendChild(core);

    items.forEach(function (t, i) {
      var deg = angs[i];
      var rad = deg * Math.PI / 180;
      var rr = R * (i % 2 === 1 ? 0.9 : 1);              // 轻微错落，避免相邻气泡贴太紧
      var dx = Math.sin(rad) * rr;
      var dy = -Math.cos(rad) * rr;
      var delay = 110 + i * 60;

      var ray = document.createElement('div');
      ray.className = 'burst-ray';
      ray.style.setProperty('--rx', cx.toFixed(1) + 'px');
      ray.style.setProperty('--ry', (cy - 1).toFixed(1) + 'px');
      ray.style.setProperty('--len', (rr - 30).toFixed(1) + 'px');
      ray.style.setProperty('--a', deg.toFixed(1) + 'deg');
      ray.style.setProperty('--cat-c', colorVar);
      ray.style.setProperty('--delay', delay + 'ms');
      el.burst.appendChild(ray);

      var node;
      if (t.empty) {
        node = document.createElement('div');
        node.className = 'burst-bubble is-empty';
      } else {
        node = document.createElement('a');
        node.className = 'burst-bubble';
        node.href = t.path;
      }
      node.style.left = cx + 'px';
      node.style.top = cy + 'px';
      node.style.setProperty('--dx', dx.toFixed(1) + 'px');
      node.style.setProperty('--dy', dy.toFixed(1) + 'px');
      node.style.setProperty('--delay', delay + 'ms');
      node.innerHTML = '<span class="bb-ico" aria-hidden="true">' + esc(t.icon || '🧩') + '</span>' +
                       '<span class="bb-name">' + esc(t.name || '') + '</span>';
      el.burst.appendChild(node);
    });

    burstCat = c.id;
    renderCatGrid();
  }

  function closeBurst() {
    if (!el.burst || el.burst.hidden) { burstCat = null; return; }
    el.burst.hidden = true;
    el.burst.innerHTML = '';
    burstCat = null;
    renderCatGrid();
  }

  /* ---------------- 搜索 ---------------- */
  function onSearch() {
    keyword = el.search.value.trim();
    if (!keyword) { closeTools(); return; }
    closeBurst();
    var k = keyword.toLowerCase();
    var list = TOOLS.filter(function (t) {
      var hay = [t.name, t.desc, t.category, (t.tags || []).join(' '), t.id].join(' ').toLowerCase();
      return hay.indexOf(k) >= 0;
    });
    activeCat = null;
    renderCatGrid();
    showTools('搜索结果', list.length ? list.length + ' 个' : '', list,
      '没有匹配的工具，换个关键词试试。');
  }

  /* ---------------- 抽屉 / 设置 ---------------- */
  function openDrawer() {
    el.scrim.hidden = false;
    el.drawer.hidden = false;
    requestAnimationFrame(function () {
      el.scrim.classList.add('show');
      el.drawer.classList.add('show');
    });
    el.menuBtn.setAttribute('aria-expanded', 'true');
  }
  function closeDrawer() {
    el.scrim.classList.remove('show');
    el.drawer.classList.remove('show');
    el.menuBtn.setAttribute('aria-expanded', 'false');
    setTimeout(function () { el.scrim.hidden = true; el.drawer.hidden = true; }, 240);
  }

  function syncSeg() {
    var cur = themeName();
    Array.prototype.forEach.call(el.themeSeg.querySelectorAll('button[data-theme-id]'), function (b) {
      b.setAttribute('aria-checked', b.dataset.themeId === cur ? 'true' : 'false');
    });
  }

  function openSettings() {
    closeDrawer();
    el.settings.hidden = false;
    el.settingsBtn.setAttribute('aria-expanded', 'true');
    syncSeg();
  }
  function closeSettings() {
    el.settings.hidden = true;
    el.settingsBtn.setAttribute('aria-expanded', 'false');
  }

  /* ---------------- 事件绑定 ---------------- */
  el.search.addEventListener('input', onSearch);

  el.back.addEventListener('click', function () { closeTools(); closeBurst(); });

  el.burst.addEventListener('click', function (e) { if (e.target === el.burst) closeBurst(); });

  el.menuBtn.addEventListener('click', openDrawer);
  el.drawerClose.addEventListener('click', closeDrawer);
  el.scrim.addEventListener('click', closeDrawer);

  el.settingsBtn.addEventListener('click', openSettings);
  el.settingsClose.addEventListener('click', closeSettings);
  el.settings.addEventListener('click', function (e) { if (e.target === el.settings) closeSettings(); });

  el.bell.addEventListener('click', function () { toast('通知功能开发中，敬请期待～'); });

  el.themeSeg.addEventListener('click', function (e) {
    var b = e.target.closest && e.target.closest('button[data-theme-id]');
    if (!b || !window.THEME) return;
    window.THEME.set(b.dataset.themeId);
  });

  el.clearData.addEventListener('click', function () {
    if (!window.confirm('确定清除本机保存的主题偏好与工具配置吗？此操作不可撤销。')) return;
    try { localStorage.clear(); } catch (e) { /* 忽略 */ }
    location.reload();
  });

  Array.prototype.forEach.call(document.querySelectorAll('[data-open="settings"]'), function (b) {
    b.addEventListener('click', openSettings);
  });

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') {
      if (!el.settings.hidden) { closeSettings(); return; }
      if (!el.drawer.hidden) { closeDrawer(); return; }
      if (!el.burst.hidden) { closeBurst(); return; }
      if (document.activeElement === el.search) { el.search.value = ''; onSearch(); el.search.blur(); }
      return;
    }
    if (e.key === '/' && document.activeElement !== el.search &&
        !/^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement.tagName)) {
      e.preventDefault();
      el.search.focus();
    }
  });

  // 主题切换：同步分段控件，并收起已展开的两级视图，避免交互残留
  document.addEventListener('themechange', function () {
    closeBurst();
    closeTools();
    syncSeg();
  });

  // 视口变化会让炸开坐标失效，直接收起
  window.addEventListener('resize', closeBurst);

  /* ---------------- 初始化 ---------------- */
  (function init() {
    var ver = META.version || '0.0.1';
    Array.prototype.forEach.call(document.querySelectorAll('[data-ver]'), function (n) {
      n.textContent = ver;
    });
    el.stat.textContent = TOOLS.length + ' 个工具 · ' + CATS.length + ' 个分类';
    renderCatGrid();
    syncSeg();
  })();
})();
