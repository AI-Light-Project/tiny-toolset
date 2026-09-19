/* ============================================================
   theme.js —— 主题切换器 + 主题 API
   职责：读取/持久化主题（localStorage）→ 设置 <html data-theme>
        → 暴露 window.THEME 供页面调用（全站唯一的主题入口是首页「齿轮 → 页面设置」）
   说明：本脚本**不往页面里注入任何东西**——不放悬浮切换按钮，也不放漂浮装饰插画；
        并且每次 apply() 会顺手清掉旧版本注入的 .theme-toggle / #fx-layer 残留。
        主题只由 <html data-theme> 驱动，工具页跟随首页选好的主题。
   缓存：页面 HTML 里对本文件与 theme*.css 的引用都带 ?v= 版本号，
        改完这些文件记得同步更新版本号，否则浏览器可能拿到新旧混搭的版本
        （曾出现"旧 JS 注入元素 + 新 CSS 没有定位样式"导致元素堆在左下角）。
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

  /* 早期版本的 theme.js 会往页面里注入：
       - .theme-toggle  悬浮主题按钮
       - #fx-layer      漂浮装饰插画
     现在两者都不再注入。这里做一次清理，避免浏览器缓存了旧脚本时，
     这些元素失去配套样式后堆在页面角落（点一下还能切主题，很容易让人困惑）。 */
  function cleanupLegacy() {
    var fx = document.getElementById('fx-layer');
    if (fx && fx.parentNode) fx.parentNode.removeChild(fx);
    var btns = document.querySelectorAll('.theme-toggle');
    for (var i = 0; i < btns.length; i++) {
      if (btns[i].parentNode) btns[i].parentNode.removeChild(btns[i]);
    }
  }

  function apply(id) {
    document.documentElement.setAttribute('data-theme', id);
    cleanupLegacy();
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
})();
