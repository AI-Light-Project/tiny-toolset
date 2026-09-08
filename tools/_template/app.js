/**
 * 新工具逻辑入口
 *
 * 约定：
 * 1. 用普通 <script> 引入，不要用 ES module —— 这样 file:// 双击打开也能跑；
 * 2. 全部逻辑放在这个 IIFE 里，避免污染全局；
 * 3. 需要持久化时优先用 localStorage，注意加 try/catch（隐私模式下可能不可用）。
 */
(function () {
  'use strict';

  var input = document.getElementById('input');
  var output = document.getElementById('output');
  var run = document.getElementById('run');

  // 示例逻辑：把输入文字反转 —— 换成你自己的功能
  function transform(text) {
    return String(text).split('').reverse().join('');
  }

  function update() {
    var v = input.value.trim();
    output.textContent = v ? transform(v) : '—';
  }

  run.addEventListener('click', update);
  input.addEventListener('input', update);
})();
