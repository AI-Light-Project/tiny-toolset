/* 工具集首页：渲染卡片、搜索与分类过滤 */
(function () {
  'use strict';

  var TOOLS = window.TOOLS || [];
  var grid = document.getElementById('grid');
  var empty = document.getElementById('empty');
  var chipsBox = document.getElementById('chips');
  var search = document.getElementById('search');
  var stat = document.getElementById('stat');

  var keyword = '';
  var activeCat = '全部';

  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function categories() {
    var set = [];
    TOOLS.forEach(function (t) {
      if (t.category && set.indexOf(t.category) < 0) set.push(t.category);
    });
    return set;
  }

  function renderChips() {
    var list = ['全部'].concat(categories());
    chipsBox.innerHTML = '';
    list.forEach(function (c) {
      var b = document.createElement('button');
      b.className = 'chip' + (c === activeCat ? ' active' : '');
      b.textContent = c;
      b.addEventListener('click', function () {
        activeCat = c;
        renderChips();
        renderCards();
      });
      chipsBox.appendChild(b);
    });
  }

  function match(t) {
    if (activeCat !== '全部' && t.category !== activeCat) return false;
    if (!keyword) return true;
    var k = keyword.toLowerCase();
    var hay = [t.name, t.desc, t.category, (t.tags || []).join(' '), t.id].join(' ').toLowerCase();
    return hay.indexOf(k) >= 0;
  }

  function renderCards() {
    var list = TOOLS.filter(match);
    grid.innerHTML = '';
    empty.hidden = list.length > 0;

    list.forEach(function (t) {
      var a = document.createElement('a');
      a.className = 'card';
      a.href = t.path;

      var feats = (t.features || []).slice(0, 3).map(function (f) {
        return '<li>' + esc(f) + '</li>';
      }).join('');

      var tags = (t.tags || []).map(function (g) {
        return '<span class="tag">' + esc(g) + '</span>';
      }).join('');

      // 有插画配置则用插画，否则退回 emoji 图标
      var iconHtml = t.illustration
        ? '<img class="card-illo" src="' + esc(t.illustration) + '" alt="" loading="lazy">'
        : '<div class="card-icon">' + esc(t.icon || '🧩') + '</div>';

      a.innerHTML =
        '<div class="card-head">' +
          iconHtml +
          '<div>' +
            '<p class="card-title">' + esc(t.name) + '</p>' +
            '<span class="card-ver">v' + esc(t.version || '0.1.0') + ' · ' + esc(t.updated || '') + '</span>' +
          '</div>' +
        '</div>' +
        '<p class="card-desc">' + esc(t.desc) + '</p>' +
        (feats ? '<ul class="card-feats">' + feats + '</ul>' : '') +
        '<div class="card-foot">' +
          '<div class="tags">' + tags + '</div>' +
          '<span class="card-go">打开 →</span>' +
        '</div>';

      grid.appendChild(a);
    });
  }

  function renderStat() {
    var n = TOOLS.length;
    var c = categories().length;
    stat.textContent = n + ' 个工具 · ' + c + ' 个分类';
  }

  search.addEventListener('input', function () {
    keyword = search.value.trim();
    renderCards();
  });

  // 按 "/" 快速聚焦搜索框
  document.addEventListener('keydown', function (e) {
    if (e.key === '/' && document.activeElement !== search) {
      e.preventDefault();
      search.focus();
    }
    if (e.key === 'Escape' && document.activeElement === search) {
      search.value = '';
      keyword = '';
      renderCards();
      search.blur();
    }
  });

  renderStat();
  renderChips();
  renderCards();
})();
