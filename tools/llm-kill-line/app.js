/* ============================================================
   大语言模型斩杀线 —— 成本 × 性能散点图（纯前端，无依赖）
   数据：Artificial Analysis 榜单页。启动先用内置快照秒开，
        随后尝试实时抓取（榜单页带 Access-Control-Allow-Origin: *），
        失败则保留快照并在界面标注。
   ============================================================ */
(function () {
  'use strict';

  // ============ 常量 ============
  var LIVE_URLS = [
    'https://artificialanalysis.ai/zh/leaderboards/models',
    'https://artificialanalysis.ai/leaderboards/models'
  ];
  var SRC_URL = 'https://artificialanalysis.ai/zh/leaderboards/models';
  var PREF_KEY = 'kill_prefs';

  // X 轴：成本口径。每一项都必须在界面上说清"是哪种价"
  var X_METRICS = [
    { id: 'blend',  label: '混合价（输入 : 输出 = 3 : 1）', short: '混合价', unit: 'USD / 百万 tokens',
      note: '混合价 = (3 × 输入价 + 1 × 输出价) ÷ 4。按输入 token 占多数的一般对话负载折算，单位 USD / 百万 tokens。' },
    { id: 'input',  label: '输入价（prompt）', short: '输入价', unit: 'USD / 百万 tokens',
      note: '每百万输入 token 的价格（prompt 计费），单位 USD / 百万 tokens。' },
    { id: 'output', label: '输出价（completion）', short: '输出价', unit: 'USD / 百万 tokens',
      note: '每百万输出 token 的价格（completion 计费），单位 USD / 百万 tokens。' },
    { id: 'cost',   label: '每任务成本（AA 实测口径）', short: '每任务成本', unit: 'USD / 任务',
      note: 'Artificial Analysis 用固定评测任务实测的综合成本，已计入思考 token 与缓存折扣，单位 USD / 任务。' }
  ];

  // Y 轴：评测基准
  var Y_METRICS = [
    { id: 'idx',        label: 'AA 智能指数 v4.3', short: 'AA 智能指数', unit: '分',
      note: 'Artificial Analysis 综合 10 项评测的加权总分，越高越强。' },
    { id: 'gpqa',       label: 'GPQA Diamond', short: 'GPQA', unit: '%', note: '研究生级物理 / 化学 / 生物选择题正确率。' },
    { id: 'hle',        label: "Humanity's Last Exam", short: 'HLE', unit: '%', note: '跨学科专家级难题正确率。' },
    { id: 'tau2',       label: 'τ²-bench（工具调用）', short: 'τ²-bench', unit: '%', note: '多轮对话与工具调用中的指令遵循能力。' },
    { id: 'tbHard',     label: 'Terminal-Bench Hard', short: 'Terminal-Bench', unit: '%', note: '真实终端环境下的 agent 任务完成率。' },
    { id: 'scicode',    label: 'SciCode', short: 'SciCode', unit: '%', note: '科研级代码实现能力。' },
    { id: 'ifbench',    label: 'IFBench（指令遵循）', short: 'IFBench', unit: '%', note: '精确指令遵循能力。' },
    { id: 'critpt',     label: 'CritPt（物理推理）', short: 'CritPt', unit: '%', note: '高难度物理推理。' },
    { id: 'mmmuPro',    label: 'MMMU-Pro（多模态）', short: 'MMMU-Pro', unit: '%', note: '多模态理解与推理。' },
    { id: 'gdpval',     label: 'GDPval（真实工作任务）', short: 'GDPval', unit: '%', note: '真实经济价值工作任务的完成质量。' },
    { id: 'omniscience',label: 'AA-Omniscience（知识/幻觉）', short: 'Omniscience', unit: '分', note: '知识广度与幻觉抑制，可为负分。' },
    { id: 'tps',        label: '输出速度（非评测项）', short: '输出速度', unit: 'tok/s', note: '中位输出速度，单位 token / 秒，不是正确率指标。' }
  ];

  var MAIN_CREATORS = ['OpenAI', 'Anthropic', 'Google', 'DeepSeek', 'Alibaba', 'Meta', 'Mistral', 'xAI', 'SpaceXAI', 'Z AI', 'Kimi', 'MiniMax', 'NVIDIA', 'Amazon'];

  var MARGIN = { t: 22, r: 24, b: 54, l: 68 };

  // ============ 状态 ============
  var state = {
    data: null,          // { models, creators, generated, indexVersion, live, fetchedAt }
    src: 'snapshot',     // snapshot | live | loading | error
    srcText: '',
    selCreators: {},
    keyword: '',
    xMetric: 'blend',
    yMetric: 'idx',
    logX: true,
    logY: false,
    showLine: true,
    selected: null,
    view: null,
    size: { w: 800, h: 480 },
    dragging: false,
    fitting: false
  };

  var visible = [];      // 当前可见（已筛选且当前轴有值）的模型
  var byId = {};

  // ============ DOM ============
  var $ = function (s) { return document.querySelector(s); };
  var el = {
    svg: $('#chart'), wrap: $('#chartWrap'), tooltip: $('#tooltip'),
    status: $('#chartStatus'), statusText: $('#chartStatusText'),
    empty: $('#chartEmpty'), emptyText: $('#chartEmptyText'),
    srcBadge: $('#srcBadge'), srcText: $('#srcText'), refresh: $('#btnRefresh'),
    xMetric: $('#xMetric'), yMetric: $('#yMetric'), logX: $('#logX'), logY: $('#logY'),
    showLine: $('#showLine'), legend: $('#chartLegend'),
    resetView: $('#btnResetView'), axisNote: $('#axisNote'),
    search: $('#searchModel'), creatorList: $('#creatorList'), filterHint: $('#filterHint'),
    selAll: $('#btnSelAll'), selNone: $('#btnSelNone'), selMain: $('#btnSelMain'),
    panelBody: $('#filterBody'), filterToggle: $('#btnFilterToggle'),
    chartTitle: $('#chartTitle'), pointCount: $('#pointCount'),
    killBody: $('#killBody'), clearSel: $('#btnClearSel'),
    toast: $('#toast'), footStamp: $('#footStamp')
  };

  // ============ 通用工具 ============
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function num(v) { var n = Number(v); return isFinite(n) ? n : null; }
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function r1(v) { return Math.round(v * 10) / 10; }

  function fmtMoney(v) {
    if (v == null) return '—';
    if (v === 0) return '$0';
    if (v < 0.01) return '$' + v.toFixed(4);
    if (v < 1) return '$' + v.toFixed(3);
    if (v < 10) return '$' + v.toFixed(2);
    return '$' + v.toFixed(1);
  }
  function fmtScore(v, unit) {
    if (v == null) return '—';
    if (unit === 'tok/s') return Math.round(v) + ' tok/s';
    if (unit === '分') return (Math.round(v * 10) / 10) + ' 分';
    return (Math.round(v * 10) / 10) + '%';
  }

  var toastTimer = null;
  function toast(msg) {
    el.toast.hidden = false;
    el.toast.textContent = msg;
    requestAnimationFrame(function () { el.toast.classList.add('show'); });
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () {
      el.toast.classList.remove('show');
      setTimeout(function () { el.toast.hidden = true; }, 220);
    }, 2400);
  }

  // ============ 轴取值 ============
  function xMeta() { return X_METRICS.filter(function (m) { return m.id === state.xMetric; })[0] || X_METRICS[0]; }
  function yMeta() { return Y_METRICS.filter(function (m) { return m.id === state.yMetric; })[0] || Y_METRICS[0]; }

  function xVal(m) {
    if (state.xMetric === 'blend') {
      if (m.in == null || m.out == null) return null;
      var v = (3 * m.in + m.out) / 4;
      return v > 0 ? v : null;
    }
    if (state.xMetric === 'input') return m.in != null && m.in > 0 ? m.in : null;
    if (state.xMetric === 'output') return m.out != null && m.out > 0 ? m.out : null;
    return m.cost != null && m.cost > 0 ? m.cost : null;
  }
  function yVal(m) {
    if (state.yMetric === 'idx') return num(m.idx);
    if (state.yMetric === 'tps') return num(m.tps);
    var bm = m.bm || {};
    return bm[state.yMetric] == null ? null : num(bm[state.yMetric]);
  }

  // ============ 数据解析（实时抓取） ============
  function sliceArray(s, start) {
    var depth = 0, inStr = false, escp = false;
    for (var i = start; i < s.length; i++) {
      var c = s.charAt(i);
      if (inStr) {
        if (escp) escp = false;
        else if (c === '\\') escp = true;
        else if (c === '"') inStr = false;
        continue;
      }
      if (c === '"') inStr = true;
      else if (c === '[') depth++;
      else if (c === ']') { depth--; if (depth === 0) return s.slice(start, i + 1); }
    }
    return null;
  }

  // 从 Next.js RSC 流式载荷里挖出带 intelligenceIndex 的 models 数组
  function extractModels(html) {
    var re = /self\.__next_f\.push\(\[1,"((?:[^"\\]|\\.)*)"\]\)/g;
    var m, payload = '';
    while ((m = re.exec(html))) {
      try { payload += JSON.parse('"' + m[1] + '"'); } catch (e) { /* 跳过坏块 */ }
    }
    if (!payload) return null;
    var key = '"models":[', pos = 0, found = null;
    while (true) {
      var idx = payload.indexOf(key, pos);
      if (idx < 0) break;
      pos = idx + 1;
      var raw = sliceArray(payload, payload.indexOf('[', idx + key.length - 1));
      if (!raw || raw.indexOf('intelligenceIndex') < 0) continue;
      try { found = JSON.parse(raw); } catch (e) { found = null; }
      if (found && found.length) return found;
    }
    return null;
  }

  function benchVal(key, v) {
    if (v == null || v === 0) return undefined;      // 0 = 未测
    return key === 'omniscience' ? r1(v) : r1(v * 100);
  }
  var BENCH_KEYS = { gpqa: 'gpqa', hle: 'hle', tau2: 'tau2', tbHard: 'terminalbenchHard', scicode: 'scicode',
    ifbench: 'ifbench', critpt: 'critpt', mmmuPro: 'mmmuPro', gdpval: 'gdpvalNormalized', omniscience: 'omniscience' };

  var FALLBACK_COLORS = ['#e11d48', '#7c3aed', '#0891b2', '#ca8a04', '#15803d', '#b45309', '#9333ea', '#0d9488', '#c026d3', '#4f46e5'];
  var KNOWN_COLORS = {
    OpenAI: '#10a37f', Anthropic: '#d97757', Google: '#4285f4', DeepSeek: '#4d6bfe',
    xAI: '#6b7280', SpaceXAI: '#6b7280', 'Z AI': '#1c7ff8', Alibaba: '#ff6a00', Meta: '#0668e1',
    MiniMax: '#e94b8a', Mistral: '#fa520f', NVIDIA: '#76b900', Kimi: '#5a34d6', Amazon: '#ff9900',
    Xiaomi: '#ff6900', Baidu: '#2932e1', Tencent: '#07c160', Microsoft: '#00a4ef', Cohere: '#39594d',
    IBM: '#0f62fe', ByteDance: '#325ab4', StepFun: '#0aa5a5', Perplexity: '#20808d',
    'LG AI Research': '#a50034', Upstage: '#7c3aed', 'Nous Research': '#c2410c',
    'Allen Institute for AI': '#1f6f8b', 'AI21 Labs': '#e4002b', ServiceNow: '#62d84e'
  };
  function colorFor(name) {
    if (KNOWN_COLORS[name]) return KNOWN_COLORS[name];
    var h = 0;
    for (var i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
    return FALLBACK_COLORS[h % FALLBACK_COLORS.length];
  }

  // 把 AA 原始模型对象整理成工具内部结构（与 data.js 的快照同构）
  function normalize(raw, live) {
    var models = [];
    for (var i = 0; i < raw.length; i++) {
      var m = raw[i];
      if (!m || m.deprecated) continue;
      var idx = num(m.intelligenceIndex);
      if (idx === null) continue;
      var bm = {};
      for (var k in BENCH_KEYS) {
        if (!Object.prototype.hasOwnProperty.call(BENCH_KEYS, k)) continue;
        var v = benchVal(k, num(m[BENCH_KEYS[k]]));
        if (v !== undefined) bm[k] = v;
      }
      var cost = num(m.intelligenceIndexCostPerTask);
      var tps = num(m.medianOutputTokensPerSecond);
      var nm = m.shortName || m.name || m.slug;
      var item = {
        id: m.slug,
        n: nm,
        // 同一「发布家族」的不同推理强度变体（low/medium/high/max）会被连成一条线
        r: (m.release && m.release.name) || String(nm).replace(/\s*[（(][^）)]*[）)]\s*$/, ''),
        c: m.modelCreatorName || 'Other',
        o: m.isOpenWeights ? 1 : 0,
        ctx: num(m.contextWindowTokens) || 0,
        idx: r1(idx),
        cost: cost === null ? null : Math.round(cost * 10000) / 10000,
        in: num(m.price1mInputTokens),
        out: num(m.price1mOutputTokens),
        tps: tps === null ? null : r1(tps),
        bm: bm
      };
      if (m.intelligenceIndexIsEstimated) item.est = 1;
      models.push(item);
    }
    models.sort(function (a, b) { return b.idx - a.idx; });

    var cmap = {}, creators = [];
    models.forEach(function (m) {
      if (!cmap[m.c]) { cmap[m.c] = { n: m.c, count: 0, color: colorFor(m.c) }; creators.push(cmap[m.c]); }
      cmap[m.c].count++;
    });
    creators.sort(function (a, b) { return b.count - a.count; });

    return {
      models: models, creators: creators,
      generated: live ? new Date().toISOString().slice(0, 10) : (window.AA_SNAPSHOT && window.AA_SNAPSHOT.generated) || '',
      indexVersion: (window.AA_SNAPSHOT && window.AA_SNAPSHOT.indexVersion) || 'v4.3',
      live: !!live,
      fetchedAt: live ? new Date() : null
    };
  }

  // ============ 数据源 ============
  function loadSnapshot() {
    var s = window.AA_SNAPSHOT;
    if (!s || !s.models || !s.models.length) return null;
    byId = {};
    s.models.forEach(function (m) { byId[m.id] = m; });
    return { models: s.models, creators: s.creators || [], generated: s.generated || '', indexVersion: s.indexVersion || '', live: false, fetchedAt: null };
  }

  function setSrc(kind, text) {
    state.src = kind;
    state.srcText = text;
    el.srcBadge.setAttribute('data-src', kind);
    el.srcText.textContent = text;
  }

  function describeSource() {
    var d = state.data;
    if (!d) return;
    if (d.live && d.fetchedAt) {
      var t = d.fetchedAt;
      var p = function (n) { return (n < 10 ? '0' : '') + n; };
      setSrc('live', '实时抓取 · ' + (t.getMonth() + 1) + '月' + t.getDate() + '日 ' + p(t.getHours()) + ':' + p(t.getMinutes()));
      el.footStamp.textContent = '本次数据为实时抓取（' + t.toLocaleString('zh-CN') + '）';
    } else {
      setSrc('snapshot', '内置快照 · ' + (d.generated || '未知日期'));
      el.footStamp.textContent = '当前使用内置快照，数据日期 ' + (d.generated || '未知') + '（' + d.models.length + ' 个模型）';
    }
  }

  function fetchLive(silent) {
    if (state.fetching) return;
    state.fetching = true;
    if (!silent) { el.refresh.disabled = true; setSrc('loading', '正在获取实时数据…'); showStatus('正在从 Artificial Analysis 抓取实时数据…'); }

    var tryNext = function (i) {
      if (i >= LIVE_URLS.length) {
        state.fetching = false;
        el.refresh.disabled = false;
        hideStatus();
        var d = state.data || loadSnapshot();
        state.data = d;
        describeSource();
        setSrc('error', '实时抓取失败 · 用内置快照（' + (d.generated || '未知') + '）');
        el.footStamp.textContent = '实时抓取失败（可能离线或被跨域限制），已回退到内置快照，数据日期 ' + (d.generated || '未知');
        toast('实时抓取失败，已回退到内置快照数据');
        return;
      }
      if (!silent) showStatus('正在从 Artificial Analysis 抓取实时数据…');
      var ctrl = window.AbortController ? new AbortController() : null;
      var timer = setTimeout(function () { if (ctrl) ctrl.abort(); }, 20000);
      fetch(LIVE_URLS[i], { cache: 'no-store', signal: ctrl ? ctrl.signal : undefined })
        .then(function (res) {
          if (!res.ok) throw new Error('HTTP ' + res.status);
          return res.text();
        })
        .then(function (html) {
          clearTimeout(timer);
          var raw = extractModels(html);
          if (!raw || !raw.length) throw new Error('未解析到模型数据');
          var data = normalize(raw, true);
          if (!data.models.length) throw new Error('解析结果为空');
          state.data = data;
          byId = {};
          data.models.forEach(function (m) { byId[m.id] = m; });
          state.selCreators = defaultSelection(data.creators);
          state.fetching = false;
          el.refresh.disabled = false;
          hideStatus();
          describeSource();
          renderFilter();
          fitView();
          render();
          savePrefs();
          if (!silent) toast('已更新为实时数据（' + data.models.length + ' 个模型）');
        })
        .catch(function () {
          clearTimeout(timer);
          tryNext(i + 1);
        });
    };
    tryNext(0);
  }

  function defaultSelection(creators) {
    var sel = {};
    (creators || []).forEach(function (c) {
      if (MAIN_CREATORS.indexOf(c.n) >= 0 || c.count >= 8) sel[c.n] = true;
    });
    if (!Object.keys(sel).length) (creators || []).forEach(function (c) { sel[c.n] = true; });
    return sel;
  }

  // ============ 筛选 ============
  // 只按厂商 / 关键词筛
  function candidateModels() {
    var kw = state.keyword.toLowerCase();
    var out = [];
    for (var i = 0; i < state.data.models.length; i++) {
      var m = state.data.models[i];
      if (!state.selCreators[m.c]) continue;
      if (kw && (m.n + ' ' + m.c + ' ' + m.id).toLowerCase().indexOf(kw) < 0) continue;
      out.push(m);
    }
    return out;
  }
  // 再要求当前 X / Y 轴都有数据（AA 对不少模型未收录价格，对数为零值会失效）
  function visibleModels() {
    return candidateModels().filter(function (m) { return xVal(m) != null && yVal(m) != null; });
  }

  function renderFilter() {
    var cs = state.data.creators || [];
    var selCount = 0;
    el.creatorList.innerHTML = cs.map(function (c, i) {
      var on = !!state.selCreators[c.n];
      if (on) selCount++;
      return '<button type="button" class="creator-item" data-c="' + esc(c.n) + '" aria-pressed="' + on + '"' +
        ' style="--c:' + esc(c.color) + '" title="' + esc(c.n) + ' · ' + c.count + ' 个模型">' +
        '<span class="swatch"></span><span class="cname">' + esc(c.n) + '</span>' +
        '<span class="ccount">' + c.count + '</span><span class="tick"></span></button>';
    }).join('');
    el.filterHint.textContent = '已选 ' + selCount + ' / ' + cs.length + ' 家厂商，按模型数排序。';
  }

  function setAllCreators(on) {
    state.selCreators = {};
    (state.data.creators || []).forEach(function (c) { if (on) state.selCreators[c.n] = true; });
    renderFilter();
    fitView();
    render();
    savePrefs();
  }

  // ============ 视图（数据坐标范围） ============
  function fx(v) { return state.logX ? Math.log10(v) : v; }
  function fy(v) { return state.logY ? Math.log10(v) : v; }

  function plotBox() {
    return {
      l: MARGIN.l, t: MARGIN.t,
      w: Math.max(10, state.size.w - MARGIN.l - MARGIN.r),
      h: Math.max(10, state.size.h - MARGIN.t - MARGIN.b)
    };
  }
  function px(v) {
    var b = plotBox();
    return b.l + (fx(v) - state.view.x0) / (state.view.x1 - state.view.x0) * b.w;
  }
  function py(v) {
    var b = plotBox();
    return b.t + (state.view.y1 - fy(v)) / (state.view.y1 - state.view.y0) * b.h;
  }

  function fitView() {
    var list = visibleModels();
    if (!list.length) { state.view = null; return; }
    var xs = [], ys = [];
    list.forEach(function (m) { xs.push(fx(xVal(m))); ys.push(fy(yVal(m))); });
    var x0 = Math.min.apply(null, xs), x1 = Math.max.apply(null, xs);
    var y0 = Math.min.apply(null, ys), y1 = Math.max.apply(null, ys);
    if (x1 - x0 < 1e-9) { x0 -= 0.5; x1 += 0.5; }
    if (y1 - y0 < 1e-9) { y0 -= 0.5; y1 += 0.5; }
    var pxp = (x1 - x0) * 0.085, pyp = (y1 - y0) * 0.13;
    state.view = { x0: x0 - pxp, x1: x1 + pxp, y0: y0 - pyp, y1: y1 + pyp };
  }

  // ============ 刻度 ============
  function niceTicks(min, max, count) {
    var span = max - min;
    if (!(span > 0)) return [min];
    var step = Math.pow(10, Math.floor(Math.log10(span / count)));
    var err = (span / count) / step;
    if (err >= 7.5) step *= 10; else if (err >= 3.5) step *= 5; else if (err >= 1.5) step *= 2;
    var out = [], v = Math.ceil(min / step) * step;
    for (; v <= max + step * 1e-6 && out.length < 60; v += step) out.push(Math.abs(v) < step * 1e-6 ? 0 : v);
    return out;
  }
  function logTicks(min, max) {
    var out = [];
    for (var e = Math.floor(min); e <= Math.ceil(max); e++) {
      var base = Math.pow(10, e);
      [1, 2, 5].forEach(function (k) {
        var v = k * base, lv = Math.log10(v);
        if (lv >= min - 1e-9 && lv <= max + 1e-9) out.push(v);
      });
    }
    return out;
  }
  function tickLabelX(v) {
    if (v >= 1) return '$' + (Math.round(v * 100) / 100);
    if (v >= 0.1) return '$' + (Math.round(v * 1000) / 1000);
    return '$' + v.toPrecision(2).replace(/e-?\d+/, '');
  }
  function tickLabelY(v, unit) {
    var span = state.view ? state.view.y1 - state.view.y0 : 1;
    var digits = span > 60 ? 0 : 1;
    return (Math.round(v * Math.pow(10, digits)) / Math.pow(10, digits)) + (unit === '%' ? '%' : '');
  }

  // ============ 渲染 ============
  var renderQueued = false;
  function scheduleRender() {
    if (renderQueued) return;
    renderQueued = true;
    requestAnimationFrame(function () { renderQueued = false; render(); });
  }

  function measure() {
    var r = el.wrap.getBoundingClientRect();
    state.size = { w: Math.max(240, Math.round(r.width)), h: Math.max(200, Math.round(r.height)) };
  }

  function render() {
    if (!state.data) return;
    if (!state.view) fitView();
    visible = visibleModels();

    var cand = candidateModels().length;
    var missing = cand - visible.length;
    el.pointCount.textContent = visible.length + ' 个模型' + (missing > 0 ? ' · 隐藏 ' + missing : '');
    el.pointCount.title = missing > 0
      ? '筛选出 ' + cand + ' 个模型，其中 ' + missing + ' 个在当前 X / Y 轴指标上缺数据（如未收录价格），未绘制'
      : '筛选出 ' + cand + ' 个模型，全部有当前指标数据';
    el.chartTitle.textContent = xMeta().short + ' × ' + yMeta().short;

    if (!visible.length) {
      el.svg.innerHTML = '';
      el.emptyText.textContent = state.data.models.length
        ? (cand
          ? '筛选出的 ' + cand + ' 个模型在「' + xMeta().short + ' × ' + yMeta().short + '」上都缺数据，换一组坐标轴试试'
          : '没有符合筛选条件的模型（可能是厂商被清空或搜索无结果）')
        : '暂无数据';
      el.empty.hidden = false;
      renderLegend();
      renderKill();
      return;
    }
    el.empty.hidden = true;
    if (!state.view) { fitView(); }
    draw();
    renderLegend();
    renderKill();
  }

  function draw() {
    var b = plotBox(), v = state.view;
    if (!v) return;
    var xm = xMeta(), ym = yMeta();
    var parts = [];

    // --- 网格 ---
    var xt = state.logX ? logTicks(v.x0, v.x1) : niceTicks(v.x0, v.x1, 7);
    var yt = state.logY ? logTicks(v.y0, v.y1) : niceTicks(v.y0, v.y1, 6);
    xt.forEach(function (t) {
      var x = px(t);
      if (x < b.l - 1 || x > b.l + b.w + 1) return;
      parts.push('<line class="grid-line" x1="' + x.toFixed(1) + '" y1="' + b.t + '" x2="' + x.toFixed(1) + '" y2="' + (b.t + b.h) + '"/>');
      parts.push('<text class="tick-label" x="' + x.toFixed(1) + '" y="' + (b.t + b.h + 16) + '" text-anchor="middle">' + esc(tickLabelX(t)) + '</text>');
    });
    yt.forEach(function (t) {
      var y = py(t);
      if (y < b.t - 1 || y > b.t + b.h + 1) return;
      parts.push('<line class="grid-line" x1="' + b.l + '" y1="' + y.toFixed(1) + '" x2="' + (b.l + b.w) + '" y2="' + y.toFixed(1) + '"/>');
      parts.push('<text class="tick-label" x="' + (b.l - 8) + '" y="' + (y + 3.5).toFixed(1) + '" text-anchor="end">' + esc(tickLabelY(t, ym.unit)) + '</text>');
    });

    // --- 轴标题 ---
    parts.push('<text class="axis-title" x="' + (b.l + b.w / 2) + '" y="' + (state.size.h - 12) + '" text-anchor="middle">' +
      esc(xm.short + '（' + xm.unit + (state.logX ? '，对数刻度' : '') + '）') + '</text>');
    parts.push('<text class="axis-title" transform="translate(16,' + (b.t + b.h / 2) + ') rotate(-90)" text-anchor="middle">' +
      esc(ym.short + '（' + ym.unit + (state.logY ? '，对数' : '') + '）') + '</text>');

    // --- 轴框 ---
    parts.push('<line class="axis-line" x1="' + b.l + '" y1="' + (b.t + b.h) + '" x2="' + (b.l + b.w) + '" y2="' + (b.t + b.h) + '"/>');
    parts.push('<line class="axis-line" x1="' + b.l + '" y1="' + b.t + '" x2="' + b.l + '" y2="' + (b.t + b.h) + '"/>');

    // --- 象限高亮（选中后） ---
    var sel = state.selected ? byId[state.selected] : null;
    var selX = null, selY = null;
    if (sel && visible.indexOf(sel) >= 0) {
      selX = xVal(sel); selY = yVal(sel);
      var sx0 = px(selX), sy0 = py(selY);
      var qw = sx0 - b.l, qh = (b.t + b.h) - sy0;
      // 左上：成本更低、表现更好 = 斩杀区
      if (qw > 0 && qh > 0) parts.push('<rect class="quad-win" x="' + b.l + '" y="' + sy0.toFixed(1) + '" width="' + qw.toFixed(1) + '" height="' + qh.toFixed(1) + '"/>');
      var qw2 = (b.l + b.w) - sx0, qh2 = sy0 - b.t;
      // 右下：成本更高、表现更差 = 被反杀区
      if (qw2 > 0 && qh2 > 0) parts.push('<rect class="quad-lose" x="' + sx0.toFixed(1) + '" y="' + b.t + '" width="' + qw2.toFixed(1) + '" height="' + qh2.toFixed(1) + '"/>');
    }

    // --- 同家族连线：把同一模型不同推理强度（low→max）的变体连起来，
    //     直观看出「多花钱多思考」的边际收益 ---
    if (state.showLine) {
      var fam = {};
      visible.forEach(function (m) { (fam[m.r || m.n] = fam[m.r || m.n] || []).push(m); });
      Object.keys(fam).forEach(function (k) {
        var arr = fam[k].slice().sort(function (a, b2) { return xVal(a) - xVal(b2); });
        if (arr.length < 2) return;
        var d = arr.map(function (m, i) {
          return (i ? 'L' : 'M') + px(xVal(m)).toFixed(1) + ' ' + py(yVal(m)).toFixed(1);
        }).join(' ');
        parts.push('<path d="' + d + '" fill="none" stroke="' + esc(colorOf(arr[0].c)) +
          '" stroke-width="1.5" stroke-opacity=".5" stroke-linejoin="round"/>');
      });
    }

    // --- 点 ---
    var showAllLabels = visible.length <= 26;
    var winSet = {};
    if (sel && selX != null) {
      visible.forEach(function (m) {
        if (m.id !== sel.id && xVal(m) < selX && yVal(m) > selY) winSet[m.id] = true;
      });
    }
    var sorted = visible.slice().sort(function (a, b2) {
      var ra = (a.id === state.selected ? 2 : (winSet[a.id] ? 1 : 0));
      var rb = (b2.id === state.selected ? 2 : (winSet[b2.id] ? 1 : 0));
      return ra - rb;
    });
    var labels = [];
    sorted.forEach(function (m) {
      var x = px(xVal(m)), y = py(yVal(m));
      if (x < b.l - 20 || x > b.l + b.w + 20 || y < b.t - 20 || y > b.t + b.h + 20) return;
      var isSel = m.id === state.selected;
      var isWin = !!winSet[m.id];
      var cls = 'pt' + (isSel ? ' sel' : '') + (selX != null && !isSel && !isWin ? ' dim' : '');
      var r = isSel ? 7 : (isWin ? 5.6 : 4.6);
      parts.push('<g class="' + cls + '" data-id="' + esc(m.id) + '">' +
        '<circle cx="' + x.toFixed(1) + '" cy="' + y.toFixed(1) + '" r="' + r + '" fill="' + esc(colorOf(m.c)) + '"/>' +
        (isSel ? '<circle class="pt-sel-ring" cx="' + x.toFixed(1) + '" cy="' + y.toFixed(1) + '" r="' + (r + 5) + '"/>' : '') +
        '</g>');
      if (isSel || isWin || showAllLabels) labels.push({ m: m, x: x, y: y, isSel: isSel, isWin: isWin });
    });

    // --- 斩杀十字线 ---
    if (selX != null) {
      parts.push('<line class="cross-line win" x1="' + b.l + '" y1="' + py(selY).toFixed(1) + '" x2="' + (b.l + b.w) + '" y2="' + py(selY).toFixed(1) + '"/>');
      parts.push('<line class="cross-line win" x1="' + px(selX).toFixed(1) + '" y1="' + b.t + '" x2="' + px(selX).toFixed(1) + '" y2="' + (b.t + b.h) + '"/>');
    }

    // --- 象限标签 ---
    if (selX != null) {
      parts.push('<text class="quad-label win" x="' + (b.l + 10) + '" y="' + (b.t + 15) + '">↑ 更便宜 · 更强（斩杀区）</text>');
      parts.push('<text class="quad-label lose" x="' + (b.l + b.w - 10) + '" y="' + (b.t + b.h - 9) + '" text-anchor="end">更贵 · 更弱 ↓</text>');
      parts.push('<text class="quad-label" fill="var(--text-muted)" x="' + (b.l + b.w - 10) + '" y="' + (b.t + 15) + '" text-anchor="end">更贵 · 更强</text>');
      parts.push('<text class="quad-label" fill="var(--text-muted)" x="' + (b.l + 10) + '" y="' + (b.t + b.h - 9) + '">更便宜 · 更弱</text>');
    }

    // --- 标签（最后画，压在最上层；靠近右/上边缘时自动翻转方向，避免出界） ---
    labels.forEach(function (L) {
      var toRight = L.x < b.l + b.w * 0.7;
      var below = L.y < b.t + 26;
      parts.push('<text class="pt-label' + (L.isWin ? ' win' : '') + '"' +
        ' x="' + (L.x + (toRight ? 8 : -8)).toFixed(1) + '"' +
        ' y="' + (L.y + (below ? 15 : -8)).toFixed(1) + '"' +
        ' text-anchor="' + (toRight ? 'start' : 'end') + '">' + esc(L.m.n) + '</text>');
    });

    el.svg.setAttribute('viewBox', '0 0 ' + state.size.w + ' ' + state.size.h);
    el.svg.innerHTML = parts.join('');
  }

  // 图例：只列当前可见的厂商，颜色与散点一致
  function renderLegend() {
    if (!el.legend) return;
    var used = {}, order = [];
    visible.forEach(function (m) { if (!used[m.c]) { used[m.c] = 0; order.push(m.c); } used[m.c]++; });
    order.sort(function (a, b) { return used[b] - used[a]; });
    if (!order.length) { el.legend.hidden = true; el.legend.innerHTML = ''; return; }
    el.legend.hidden = false;
    el.legend.innerHTML = order.map(function (c) {
      return '<span class="lg-item"><i style="--c:' + esc(colorOf(c)) + '"></i>' + esc(c) +
        '<b>' + used[c] + '</b></span>';
    }).join('');
  }

  function colorOf(creator) {
    var cs = state.data.creators || [];
    for (var i = 0; i < cs.length; i++) if (cs[i].n === creator) return cs[i].color;
    return colorFor(creator);
  }

  // ============ 斩杀分析 ============
  function renderKill() {
    var sel = state.selected ? byId[state.selected] : null;
    el.clearSel.hidden = !sel;
    if (!sel) {
      el.killBody.innerHTML =
        '<div class="kill-empty"><span class="ke-ico">🎯</span>' +
        '点击图中任意一个模型，把它设为「斩杀对象」。<ol>' +
        '<li>以该模型为原点画出十字参考线，把图分成四个象限；</li>' +
        '<li>高亮 <b>成本更低、表现更好</b> 的象限；</li>' +
        '<li>列出该象限内的所有模型 —— 它们都能「斩杀」当前选中的模型。</li>' +
        '</ol></div>';
      return;
    }
    var selX = xVal(sel), selY = yVal(sel);
    var xm = xMeta(), ym = yMeta();
    if (selX == null || selY == null) {
      el.killBody.innerHTML = '<div class="kill-empty">该模型在当前 X / Y 轴指标上缺少数据，换一个指标再试。</div>';
      return;
    }
    var killers = [], victims = [];
    visible.forEach(function (m) {
      if (m.id === sel.id) return;
      var mx = xVal(m), my = yVal(m);
      if (mx == null || my == null) return;
      if (mx < selX && my > selY) killers.push(m);
      else if (mx > selX && my < selY) victims.push(m);
    });
    killers.sort(function (a, b) { return yVal(b) - yVal(a) || xVal(a) - xVal(b); });
    victims.sort(function (a, b) { return xVal(b) - xVal(a); });

    var html = '';
    html += '<div class="kill-target" style="--c:' + esc(colorOf(sel.c)) + '">' +
      '<div class="kt-tag">斩杀对象</div>' +
      '<div class="kt-name"><i></i>' + esc(sel.n) + '</div>' +
      '<dl>' +
      '<dt>厂商</dt><dd>' + esc(sel.c) + (sel.o ? ' · 开源权重' : '') + '</dd>' +
      '<dt>' + esc(xm.short) + '</dt><dd>' + esc(fmtMoney(selX)) + '</dd>' +
      '<dt>' + esc(ym.short) + '</dt><dd>' + esc(fmtScore(selY, ym.unit)) + '</dd>' +
      '</dl></div>';

    html += '<div class="kill-summary"><div class="ks win"><b>' + killers.length + '</b><span>可斩杀它的模型</span></div>' +
      '<div class="ks"><b>' + victims.length + '</b><span>被它反杀</span></div></div>';

    if (!killers.length) {
      html += '<div class="kill-empty">在当前筛选范围与坐标口径下，没有 <b>同时更便宜且更强</b> 的模型 —— ' +
        '它位于性价比前沿，暂时无人能斩。</div>';
    } else {
      html += '<ul class="kill-list">';
      killers.forEach(function (m) {
        var mx = xVal(m), my = yVal(m);
        var dScore = my - selY;
        var dPrice = (mx - selX) / selX * 100;
        html += '<li class="kill-item" data-id="' + esc(m.id) + '" style="--c:' + esc(colorOf(m.c)) + '">' +
          '<div class="ki-top"><i></i><span class="ki-name">' + esc(m.n) + '</span>' +
          '<span class="ki-delta">+' + (Math.round(dScore * 10) / 10) + (ym.unit === '%' ? '%' : '') + '</span></div>' +
          '<div class="ki-meta">' +
          '<span>' + esc(fmtMoney(mx)) + '（<span class="up">便宜 ' + Math.abs(Math.round(dPrice)) + '%</span>）</span>' +
          '<span>' + esc(ym.short) + ' ' + esc(fmtScore(my, ym.unit)) + '</span>' +
          '</div></li>';
      });
      html += '</ul>';
      html += '<p class="hint">按表现从高到低排列，点击任一项把它设为新的斩杀对象。</p>';
    }
    el.killBody.innerHTML = html;
  }

  function selectModel(id) {
    if (!id || !byId[id]) return;
    if (state.selected === id) { state.selected = null; }
    else { state.selected = id; }
    render();
    if (state.selected && window.innerWidth < 900) {
      var p = el.killBody.closest('.panel');
      if (p && p.scrollIntoView) setTimeout(function () { p.scrollIntoView({ behavior: 'smooth', block: 'nearest' }); }, 60);
    }
  }

  // ============ 交互：缩放 / 平移 / 悬停 ============
  var pointers = {}, lastDist = 0, dragStart = null, moved = false;

  function localPos(e) {
    var r = el.svg.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  }

  function zoomAt(cx, cy, k) {
    var v = state.view, b = plotBox();
    if (!v) return;
    var dx = (cx - b.l) / b.w, dy = 1 - (cy - b.t) / b.h;
    var mx = v.x0 + dx * (v.x1 - v.x0);
    var my = v.y0 + dy * (v.y1 - v.y0);
    var nx0 = mx + (v.x0 - mx) * k, nx1 = mx + (v.x1 - mx) * k;
    var ny0 = my + (v.y0 - my) * k, ny1 = my + (v.y1 - my) * k;
    var MIN = 1e-4;
    if (nx1 - nx0 < MIN || ny1 - ny0 < MIN) return;
    state.view = { x0: nx0, x1: nx1, y0: ny0, y1: ny1 };
    scheduleRender();
  }

  el.svg.addEventListener('wheel', function (e) {
    if (!state.view) return;
    e.preventDefault();
    var p = localPos(e);
    zoomAt(p.x, p.y, e.deltaY > 0 ? 1.14 : 1 / 1.14);
  }, { passive: false });

  el.svg.addEventListener('pointerdown', function (e) {
    if (!state.view) return;
    pointers[e.pointerId] = localPos(e);
    if (Object.keys(pointers).length === 1) {
      dragStart = localPos(e);
      moved = false;
      state.dragging = true;
      el.svg.setPointerCapture && el.svg.setPointerCapture(e.pointerId);
    } else if (Object.keys(pointers).length === 2) {
      var ks = Object.keys(pointers);
      lastDist = dist(pointers[ks[0]], pointers[ks[1]]);
    }
  });

  function dist(a, b) { return Math.hypot(a.x - b.x, a.y - b.y); }

  el.svg.addEventListener('pointermove', function (e) {
    var p = localPos(e);
    if (pointers[e.pointerId]) pointers[e.pointerId] = p;

    // 双指缩放
    var ks = Object.keys(pointers);
    if (ks.length === 2) {
      var d = dist(pointers[ks[0]], pointers[ks[1]]);
      if (lastDist > 0 && d > 0) {
        var mid = { x: (pointers[ks[0]].x + pointers[ks[1]].x) / 2, y: (pointers[ks[0]].y + pointers[ks[1]].y) / 2 };
        zoomAt(mid.x, mid.y, lastDist / d);
      }
      lastDist = d;
      moved = true;
      return;
    }

    // 单指 / 鼠标拖拽
    if (state.dragging && dragStart && e.buttons) {
      var dx = p.x - dragStart.x, dy = p.y - dragStart.y;
      if (!moved && Math.hypot(dx, dy) > 4) moved = true;
      if (moved) {
        var b = plotBox(), v = state.view;
        var wx = dx / b.w * (v.x1 - v.x0), wy = dy / b.h * (v.y1 - v.y0);
        state.view = { x0: v.x0 - wx, x1: v.x1 - wx, y0: v.y0 + wy, y1: v.y1 + wy };
        dragStart = p;
        hideTooltip();
        scheduleRender();
      }
      return;
    }
    hoverAt(e);
  });

  function endPointer(e) {
    delete pointers[e.pointerId];
    if (Object.keys(pointers).length < 2) lastDist = 0;
    if (state.dragging) {
      state.dragging = false;
      dragStart = null;
    }
  }
  el.svg.addEventListener('pointerup', function (e) {
    var wasDrag = moved;
    endPointer(e);
    if (wasDrag) { moved = false; return; }
    var g = e.target && e.target.closest ? e.target.closest('.pt') : null;
    if (g) selectModel(g.getAttribute('data-id'));
    else if (state.selected) { state.selected = null; render(); }
  });
  el.svg.addEventListener('pointercancel', endPointer);
  el.svg.addEventListener('pointerleave', function () { hideTooltip(); });

  el.killBody.addEventListener('click', function (e) {
    var li = e.target.closest ? e.target.closest('.kill-item') : null;
    if (li) selectModel(li.getAttribute('data-id'));
  });

  function hideTooltip() { el.tooltip.hidden = true; }

  function hoverAt(e) {
    var g = e.target && e.target.closest ? e.target.closest('.pt') : null;
    if (!g) { hideTooltip(); return; }
    var m = byId[g.getAttribute('data-id')];
    if (!m) { hideTooltip(); return; }
    showTooltip(m, e);
  }

  function showTooltip(m, e) {
    var xm = xMeta(), ym = yMeta();
    var mv = xVal(m), sv = yVal(m);
    var rows = '';
    rows += '<dt>' + esc(xm.short) + '</dt><dd>' + esc(fmtMoney(mv)) + '</dd>';
    rows += '<dt>' + esc(ym.short) + '</dt><dd>' + esc(fmtScore(sv, ym.unit)) + '</dd>';
    rows += '<dt>输入 / 输出价</dt><dd>' + esc(fmtMoney(m.in)) + ' / ' + esc(fmtMoney(m.out)) + '</dd>';
    if (m.cost != null) rows += '<dt>每任务成本</dt><dd>' + esc(fmtMoney(m.cost)) + '</dd>';
    if (m.tps != null) rows += '<dt>输出速度</dt><dd>' + Math.round(m.tps) + ' tok/s</dd>';
    if (m.ctx) rows += '<dt>上下文</dt><dd>' + (m.ctx >= 1000 ? Math.round(m.ctx / 1000) + 'K' : m.ctx) + '</dd>';

    var tip = '';
    var sel = state.selected ? byId[state.selected] : null;
    if (sel && sel.id !== m.id) {
      var sx = xVal(sel), sy = yVal(sel);
      if (sx != null && sy != null && mv != null && sv != null) {
        var dp = (mv - sx) / sx * 100;
        var ds = sv - sy;
        if (dp < 0 && ds > 0) tip = '可斩杀当前选中模型（便宜 ' + Math.abs(Math.round(dp)) + '%，高 ' + (Math.round(ds * 10) / 10) + '）';
        else if (dp > 0 && ds < 0) tip = '被当前选中模型斩杀（贵 ' + Math.round(dp) + '%，低 ' + Math.abs(Math.round(ds * 10) / 10) + '）';
      }
    } else if (!sel) {
      tip = '点击设为斩杀对象';
    }

    el.tooltip.innerHTML =
      '<div class="tt-name">' + esc(m.n) + '</div>' +
      '<div class="tt-creator"><i style="--c:' + esc(colorOf(m.c)) + '"></i>' + esc(m.c) +
      (m.o ? ' · 开源权重' : '') + (m.est ? ' · 指数为估算值' : '') + '</div>' +
      '<dl>' + rows + '</dl>' + (tip ? '<p class="tt-tip">' + esc(tip) + '</p>' : '');

    var r = el.wrap.getBoundingClientRect();
    var lx = clamp(e.clientX - r.left, 90, r.width - 90);
    var ly = Math.max(110, e.clientY - r.top);
    el.tooltip.style.left = lx + 'px';
    el.tooltip.style.top = ly + 'px';
    el.tooltip.hidden = false;
  }

  // ============ 加载 / 空状态 ============
  function showStatus(text) { el.statusText.textContent = text; el.status.hidden = false; }
  function hideStatus() { el.status.hidden = true; }

  // ============ 偏好持久化 ============
  function savePrefs() {
    try {
      localStorage.setItem(PREF_KEY, JSON.stringify({
        xMetric: state.xMetric, yMetric: state.yMetric,
        logX: state.logX, logY: state.logY, showLine: state.showLine,
        sel: Object.keys(state.selCreators).filter(function (k) { return state.selCreators[k]; })
      }));
    } catch (e) { /* 忽略 */ }
  }
  function loadPrefs() {
    try { return JSON.parse(localStorage.getItem(PREF_KEY) || 'null'); } catch (e) { return null; }
  }

  // ============ 轴选择器 ============
  function buildSelectors() {
    el.xMetric.innerHTML = X_METRICS.map(function (m) {
      return '<option value="' + m.id + '">' + esc(m.label) + '</option>';
    }).join('');
    el.yMetric.innerHTML = Y_METRICS.map(function (m) {
      return '<option value="' + m.id + '">' + esc(m.label) + '</option>';
    }).join('');
  }

  function updateAxisNote() {
    var xm = xMeta(), ym = yMeta();
    el.axisNote.innerHTML =
      '<b>X 轴</b>（成本）：' + esc(xm.note) +
      ' &nbsp;·&nbsp; <b>Y 轴</b>（表现）：' + esc(ym.label) + ' —— ' + esc(ym.note) +
      ' <span class="win">斩杀区</span> = 成本更低 <b>且</b> 表现更好，' +
      '<span class="lose">右下区</span> = 成本更高且表现更差。';
  }

  // ============ 事件绑定 ============
  function bind() {
    el.xMetric.addEventListener('change', function () {
      state.xMetric = el.xMetric.value;
      if (state.xMetric !== 'cost') state.logX = el.logX.checked;
      fitView(); updateAxisNote(); render(); savePrefs();
    });
    el.yMetric.addEventListener('change', function () {
      state.yMetric = el.yMetric.value;
      fitView(); updateAxisNote(); render(); savePrefs();
    });
    el.logX.addEventListener('change', function () { state.logX = el.logX.checked; fitView(); render(); savePrefs(); });
    el.logY.addEventListener('change', function () { state.logY = el.logY.checked; fitView(); render(); savePrefs(); });
    el.showLine.addEventListener('change', function () { state.showLine = el.showLine.checked; render(); savePrefs(); });
    el.resetView.addEventListener('click', function () { fitView(); render(); });

    el.search.addEventListener('input', function () {
      state.keyword = el.search.value.trim();
      fitView(); render();
    });

    el.creatorList.addEventListener('click', function (e) {
      var b = e.target.closest ? e.target.closest('.creator-item') : null;
      if (!b) return;
      var c = b.getAttribute('data-c');
      if (state.selCreators[c]) delete state.selCreators[c];
      else state.selCreators[c] = true;
      renderFilter(); fitView(); render(); savePrefs();
    });

    el.selAll.addEventListener('click', function () { setAllCreators(true); });
    el.selNone.addEventListener('click', function () { setAllCreators(false); });
    el.selMain.addEventListener('click', function () {
      state.selCreators = defaultSelection(state.data.creators);
      renderFilter(); fitView(); render(); savePrefs();
    });

    el.filterToggle.addEventListener('click', function () {
      var open = el.filterBody.style.display !== 'none';
      el.filterBody.style.display = open ? 'none' : '';
      el.filterToggle.textContent = open ? '展开' : '收起';
      el.filterToggle.setAttribute('aria-expanded', String(!open));
      setTimeout(function () { measure(); render(); }, 30);
    });

    el.clearSel.addEventListener('click', function () { state.selected = null; render(); });
    el.refresh.addEventListener('click', function () { fetchLive(false); });

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && state.selected) { state.selected = null; render(); }
    });

    var rt = null;
    window.addEventListener('resize', function () {
      clearTimeout(rt);
      rt = setTimeout(function () { measure(); render(); }, 100);
    });
    if (window.ResizeObserver) {
      var ro = new ResizeObserver(function () {
        var w = el.wrap.clientWidth, h = el.wrap.clientHeight;
        if (Math.abs(w - state.size.w) > 2 || Math.abs(h - state.size.h) > 2) { measure(); render(); }
      });
      ro.observe(el.wrap);
    }
  }

  // ============ 启动 ============
  (function init() {
    buildSelectors();

    var prefs = loadPrefs();
    if (prefs) {
      if (prefs.xMetric && X_METRICS.some(function (m) { return m.id === prefs.xMetric; })) state.xMetric = prefs.xMetric;
      if (prefs.yMetric && Y_METRICS.some(function (m) { return m.id === prefs.yMetric; })) state.yMetric = prefs.yMetric;
      state.logX = prefs.logX !== false;
      state.logY = !!prefs.logY;
      state.showLine = prefs.showLine !== false;
    }
    el.xMetric.value = state.xMetric;
    el.yMetric.value = state.yMetric;
    el.logX.checked = state.logX;
    el.logY.checked = state.logY;
    el.showLine.checked = state.showLine;

    var snap = loadSnapshot();
    if (!snap) {
      setSrc('error', '内置快照缺失');
      el.killBody.innerHTML = '<div class="kill-empty">内置数据快照未能加载（data.js 缺失或损坏）。点击右上角「刷新数据」尝试在线获取。</div>';
      showStatus('内置数据缺失，请点击右上角「刷新数据」在线获取');
      bind();
      return;
    }
    state.data = snap;
    byId = {};
    snap.models.forEach(function (m) { byId[m.id] = m; });

    if (prefs && prefs.sel && prefs.sel.length) {
      state.selCreators = {};
      prefs.sel.forEach(function (n) { state.selCreators[n] = true; });
      // 快照里不存在的厂商（可能是上一次实时数据的残留）直接忽略
      var known = {};
      snap.creators.forEach(function (c) { known[c.n] = true; });
      Object.keys(state.selCreators).forEach(function (n) { if (!known[n]) delete state.selCreators[n]; });
      if (!Object.keys(state.selCreators).length) state.selCreators = defaultSelection(snap.creators);
    } else {
      state.selCreators = defaultSelection(snap.creators);
    }

    describeSource();
    renderFilter();
    updateAxisNote();
    measure();
    fitView();
    bind();
    render();

    // 启动后自动尝试实时数据（离线或失败时静默保留快照）
    setTimeout(function () { fetchLive(true); }, 400);
  })();

  // 供离线校验脚本调用
  window.__KILL__ = {
    state: state,
    extractModels: extractModels,
    normalize: normalize,
    visibleModels: visibleModels,
    xVal: xVal, yVal: yVal,
    render: render, fitView: fitView, selectModel: selectModel,
    getVisible: function () { return visible; }
  };
})();
