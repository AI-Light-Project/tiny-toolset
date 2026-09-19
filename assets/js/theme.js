/* ============================================================
   theme.js —— 主题切换器 + 主题 API
   职责：读取/持久化主题（localStorage）→ 设置 <html data-theme>
        → 暴露 window.THEME 供页面（如首页设置面板）调用
        → 注入主题切换按钮：仅当页面既没有设置面板、也没有 .topbar 时才注入
          （首页用设置面板；工具页有顶栏，主题在首页设置好后跟随即可）
        → 多巴胺主题下注入漂浮装饰层
   约定：普通 <script> 引入（非 ESM，file:// 兼容）；
        页面 <head> 里先放一段内联脚本设置初始 data-theme 防闪烁。
   ============================================================ */
(function () {
  'use strict';

  var KEY = 'tools-hub-theme';
  var THEMES = [
    { id: 'clean', label: '清爽' },
    { id: 'dopamine', label: '多巴胺' }
  ];

  // 通过本脚本自身的 src 推导 assets/ 根路径，任意层级的页面都能正确引用图片
  var base = (function () {
    var s = (document.currentScript && document.currentScript.src) || '';
    return s.replace(/js\/theme\.js.*$/, '');
  })();

  function stored() {
    try { return localStorage.getItem(KEY); } catch (e) { return null; }
  }
  function save(id) {
    try { localStorage.setItem(KEY, id); } catch (e) { /* 隐私模式等场景忽略 */ }
  }
  function isValid(id) {
    for (var i = 0; i < THEMES.length; i++) {
      if (THEMES[i].id === id) return true;
    }
    return false;
  }
  function current() {
    var id = stored();
    return isValid(id) ? id : 'clean';
  }
  function labelFor(id) {
    for (var i = 0; i < THEMES.length; i++) {
      if (THEMES[i].id === id) return THEMES[i].label;
    }
    return id;
  }

  /* 漂浮装饰（仅多巴胺主题注入；样式见 theme-maximal.css 的 .fx-layer） */
  var FX = [
    { img: 'sparkles.png', style: 'top:8%;left:3%;width:62px;', cls: 'fx-a' },
    { img: 'star.png',     style: 'top:15%;right:5%;width:42px;', cls: 'fx-b' },
    { img: 'rainbow.png',  style: 'bottom:13%;left:2.5%;width:78px;', cls: 'fx-a' },
    { img: 'rocket.png',   style: 'top:52%;right:2.5%;width:54px;', cls: 'fx-b' },
    { img: 'fire.png',     style: 'bottom:6%;right:9%;width:46px;', cls: 'fx-c' },
    { img: 'boom.png',     style: 'top:40%;left:2%;width:38px;', cls: 'fx-c' },
    { img: 'crayon.png',   style: 'bottom:22%;left:5%;width:40px;', cls: 'fx-d' },
    { img: 'star.png',     style: 'bottom:31%;right:7%;width:26px;', cls: 'fx-d' }
  ];

  function injectFx() {
    if (document.getElementById('fx-layer')) return;
    var layer = document.createElement('div');
    layer.id = 'fx-layer';
    layer.className = 'fx-layer';
    layer.setAttribute('aria-hidden', 'true');
    FX.forEach(function (f) {
      var img = document.createElement('img');
      img.src = base + 'img/' + f.img;
      img.alt = '';
      img.className = f.cls;
      img.style.cssText = f.style;
      layer.appendChild(img);
    });
    document.body.appendChild(layer);
  }

  function removeFx() {
    var fx = document.getElementById('fx-layer');
    if (fx) fx.remove();
  }

  function apply(id) {
    document.documentElement.setAttribute('data-theme', id);
    if (id === 'dopamine') {
      if (!document.getElementById('fx-layer')) injectFx();
    } else {
      removeFx();
    }
    // 工具页的悬浮按钮（若存在）同步标签
    var label = document.querySelector('.theme-toggle .tt-label');
    if (label) label.textContent = labelFor(id);
    // 通知页面（首页设置面板借此高亮当前主题）
    try {
      document.dispatchEvent(new CustomEvent('themechange', { detail: { theme: id } }));
    } catch (e) { /* 老浏览器忽略 */ }
  }

  function set(id) {
    if (!isValid(id)) return;
    save(id);
    apply(id);
  }

  function injectToggle() {
    // 首页自带设置面板 → 不注入悬浮按钮（主题切换收进设置里）
    if (document.getElementById('settings-panel')) return;
    // 工具页统一不注入：顶栏（.topbar）本身就是页面头部，悬浮按钮会压在它右侧的按钮上；
    // 主题在首页设置面板里选好即可，工具页通过 localStorage 跟随。
    if (document.querySelector('.topbar')) return;
    if (document.querySelector('.theme-toggle')) return;
    var b = document.createElement('button');
    b.type = 'button';
    b.className = 'theme-toggle';
    b.setAttribute('aria-label', '切换界面主题，当前：' + labelFor(current()));
    b.innerHTML = '<span class="tt-dot" aria-hidden="true"></span><span class="tt-label"></span>';
    b.addEventListener('click', function () {
      var idx = 0;
      for (var i = 0; i < THEMES.length; i++) {
        if (THEMES[i].id === current()) idx = i;
      }
      var next = THEMES[(idx + 1) % THEMES.length].id;
      set(next);
      b.setAttribute('aria-label', '切换界面主题，当前：' + labelFor(next));
    });
    document.body.appendChild(b);
  }

  /* 对外 API：首页设置面板调用 */
  window.THEME = {
    KEY: KEY,
    THEMES: THEMES,
    current: current,
    labelFor: labelFor,
    set: set,
    apply: apply
  };

  apply(current());
  injectToggle();
})();
