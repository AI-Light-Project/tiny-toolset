/* ============================================================
   theme.js —— 主题切换器 + 主题 API
   职责：读取/持久化主题（localStorage）→ 设置 <html data-theme>
        → 暴露 window.THEME 供页面调用（全站唯一的主题入口是首页「齿轮 → 页面设置」）
   说明：本脚本**不往页面里注入任何东西**——不放悬浮切换按钮，也不放漂浮装饰插画。
        主题只由 <html data-theme> 驱动，工具页跟随首页选好的主题。
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

  function apply(id) {
    document.documentElement.setAttribute('data-theme', id);
    // 清理历史版本注入过的漂浮装饰层，避免老页面缓存残留
    var stale = document.getElementById('fx-layer');
    if (stale) stale.parentNode.removeChild(stale);
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
