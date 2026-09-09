/* ============================================================
   theme.js —— 主题切换器
   职责：读取/持久化主题（localStorage）→ 设置 <html data-theme>
        → 注入右上角切换按钮 → 多巴胺主题下注入漂浮装饰层
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
  function current() {
    var id = stored();
    for (var i = 0; i < THEMES.length; i++) {
      if (THEMES[i].id === id) return id;
    }
    return 'clean';
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

  function apply(id) {
    document.documentElement.setAttribute('data-theme', id);
    var fx = document.getElementById('fx-layer');
    if (id === 'dopamine') {
      if (!fx) injectFx();
    } else if (fx) {
      fx.remove();
    }
    var label = document.querySelector('.theme-toggle .tt-label');
    if (label) label.textContent = labelFor(id);
  }

  function injectToggle() {
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
      save(next);
      apply(next);
      b.setAttribute('aria-label', '切换界面主题，当前：' + labelFor(next));
    });
    document.body.appendChild(b);
  }

  apply(current());
  injectToggle();
})();
