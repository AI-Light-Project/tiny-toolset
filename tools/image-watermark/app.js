/* 图片水印工具 —— 纯前端实现，无依赖，双击 index.html 即可使用 */
(function () {
  'use strict';

  // ============ 默认配置 ============
  const DEFAULTS = {
    mode: 'text',
    text: {
      content: '仅供本人使用 · 请勿转载',
      family: '"PingFang SC", "Microsoft YaHei", sans-serif',
      bold: false,
      italic: false,
      size: 4.5,
      unit: '%',
      lineHeight: 1.3,
      color: '#ffffff',
      opacity: 35,
      stroke: { on: true, color: '#000000', width: 0.15 },
      shadow: { on: false, color: '#000000', blur: 4 }
    },
    image: { width: 20, unit: '%', opacity: 35 },
    layout: { position: 'tile', angle: -30, margin: 4, marginUnit: '%', gapX: 60, gapY: 60, stagger: true },
    output: { format: 'original', quality: 0.92, nameRule: 'suffix', affix: '_wm' }
  };

  let cfg = loadCfg();

  const state = {
    items: [],       // { id, name, file, url, img, w, h }
    current: -1,
    logo: null,      // HTMLImageElement
    showWM: true,
    busy: false
  };

  // ============ DOM ============
  const $ = (s) => document.querySelector(s);
  const fileInput = $('#fileInput');
  const logoInput = $('#logoInput');
  const dropzone = $('#dropzone');
  const thumbList = $('#thumbList');
  const emptyTip = $('#emptyTip');
  const imgCount = $('#imgCount');
  const previewWrap = $('#previewWrap');
  const canvas = $('#previewCanvas');
  const previewEmpty = $('#previewEmpty');
  const metaName = $('#metaName');
  const metaSize = $('#metaSize');
  const progress = $('#progress');
  const progressBar = $('#progressBar');
  const exportTip = $('#exportTip');
  const toastEl = $('#toast');

  // ============ 通用工具 ============
  let toastTimer = null;
  function toast(msg) {
    toastEl.textContent = msg;
    toastEl.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toastEl.classList.remove('show'), 2200);
  }

  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  function getPath(obj, p) { return p.split('.').reduce((o, k) => (o == null ? o : o[k]), obj); }
  function setPath(obj, p, v) {
    const ks = p.split('.');
    const last = ks.pop();
    const t = ks.reduce((o, k) => o[k], obj);
    if (t) t[last] = v;
  }

  function loadCfg() {
    const base = JSON.parse(JSON.stringify(DEFAULTS));
    try {
      const saved = JSON.parse(localStorage.getItem('wm_cfg') || 'null');
      if (saved && typeof saved === 'object') mergeDeep(base, saved);
    } catch (e) { /* 忽略 */ }
    return base;
  }
  function mergeDeep(dst, src) {
    for (const k in src) {
      if (src[k] && typeof src[k] === 'object' && !Array.isArray(src[k]) && dst[k] && typeof dst[k] === 'object') {
        mergeDeep(dst[k], src[k]);
      } else if (src[k] !== undefined) {
        dst[k] = src[k];
      }
    }
  }
  let saveTimer = null;
  function saveCfg() {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      try { localStorage.setItem('wm_cfg', JSON.stringify(cfg)); } catch (e) { /* 忽略 */ }
    }, 300);
  }

  // ============ 配置方案（预设 / 导入导出） ============
  const PRESET_KEY = 'wm_presets';       // 用户方案：[{ id, name, cfg, updated }]
  const ACTIVE_KEY = 'wm_preset_active'; // 当前选中的方案 id，'' = 自定义
  const DIRTY_KEY = 'wm_preset_dirty';   // '1' = 选中方案后又手动改过，尚未存回方案
  const CFG_VERSION = 1;

  // 出厂内置模板：只读，用来演示各项参数的效果，也能"另存为"自己的方案
  const BUILTIN = [
    {
      id: 'builtin:anti-theft',
      name: '防盗图平铺',
      cfg: {
        mode: 'text',
        text: { content: '仅供本人使用 · 请勿转载', size: 4, unit: '%', color: '#ffffff', opacity: 22, stroke: { on: true, color: '#000000', width: 0.12 }, shadow: { on: false } },
        layout: { position: 'tile', angle: -30, gapX: 55, gapY: 55, stagger: true, margin: 4, marginUnit: '%' }
      }
    },
    {
      id: 'builtin:signature',
      name: '右下角签名',
      cfg: {
        mode: 'text',
        text: { content: '© 你的名字', size: 3, unit: '%', color: '#ffffff', opacity: 75, stroke: { on: true, color: '#000000', width: 0.1 }, shadow: { on: false } },
        layout: { position: 'br', angle: 0, margin: 4, marginUnit: '%' }
      }
    },
    {
      id: 'builtin:logo-center',
      name: '居中半透明 Logo',
      cfg: {
        mode: 'image',
        image: { width: 35, unit: '%', opacity: 18 },
        layout: { position: 'mc', angle: 0, margin: 4, marginUnit: '%' }
      }
    },
    {
      id: 'builtin:dense',
      name: '斜向密铺防裁剪',
      cfg: {
        mode: 'text',
        text: { content: '样品 · 请勿外传', size: 3.2, unit: '%', color: '#000000', opacity: 16, stroke: { on: false }, shadow: { on: false } },
        layout: { position: 'tile', angle: -45, gapX: 30, gapY: 30, stagger: true, margin: 4, marginUnit: '%' }
      }
    }
  ];

  let activePreset = '';    // 当前方案 id
  let presetDirty = false;  // 选中方案后是否又手动改过配置

  function uid() { return 'p' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6); }

  // 用默认配置补齐缺失字段，保证老配置 / 手改的 JSON 也能正常跑
  function normalizeCfg(raw) {
    const base = JSON.parse(JSON.stringify(DEFAULTS));
    if (raw && typeof raw === 'object') mergeDeep(base, raw);
    return base;
  }

  function loadPresets() {
    try {
      const a = JSON.parse(localStorage.getItem(PRESET_KEY) || '[]');
      return Array.isArray(a) ? a.filter((p) => p && typeof p === 'object' && p.id && p.name) : [];
    } catch (e) { return []; }
  }
  function savePresets(list) {
    try { localStorage.setItem(PRESET_KEY, JSON.stringify(list)); return true; }
    catch (e) { toast('方案保存失败：本地存储不可用'); return false; }
  }
  function allPresets() {
    return BUILTIN
      .map((b) => ({ id: b.id, name: b.name, cfg: normalizeCfg(b.cfg), builtin: true }))
      .concat(loadPresets().map((p) => ({ id: p.id, name: p.name, cfg: normalizeCfg(p.cfg), updated: p.updated, builtin: false })));
  }
  function findPreset(id) {
    if (!id) return null;
    return allPresets().filter((p) => p.id === id)[0] || null;
  }
  function setActive(id) {
    activePreset = id || '';
    try { localStorage.setItem(ACTIVE_KEY, activePreset); } catch (e) { /* 忽略 */ }
  }
  function setDirty(on) {
    presetDirty = !!on;
    try { localStorage.setItem(DIRTY_KEY, presetDirty ? '1' : ''); } catch (e) { /* 忽略 */ }
  }

  function renderPresetSelect() {
    const sel = $('#presetSelect');
    if (!sel) return;
    const cur = activePreset;
    const opt = (v, label) => { const o = document.createElement('option'); o.value = v; o.textContent = label; return o; };

    sel.innerHTML = '';
    sel.appendChild(opt('', '自定义（未保存）'));

    const gb = document.createElement('optgroup');
    gb.label = '内置模板';
    BUILTIN.forEach((b) => gb.appendChild(opt(b.id, b.name)));
    sel.appendChild(gb);

    const mine = loadPresets();
    if (mine.length) {
      const gm = document.createElement('optgroup');
      gm.label = '我的方案';
      mine.forEach((p) => gm.appendChild(opt(p.id, p.name)));
      sel.appendChild(gm);
    }

    sel.value = cur;
    if (sel.value !== cur) sel.value = '';   // 方案已被删除时回落到"自定义"

    if (presetDirty && cur) {
      const o = sel.options[sel.selectedIndex];
      if (o && o.value === cur) o.textContent += ' · 已改动';
    }

    const p = findPreset(cur);
    const lock = !p || p.builtin;            // 内置模板不可覆盖 / 改名 / 删除
    $('#btnPresetUpdate').disabled = lock;
    $('#btnPresetRename').disabled = lock;
    $('#btnPresetDelete').disabled = lock;
  }

  // 配置被改动：同步界面 + 标记"已改动"
  function onCfgChanged() {
    if (activePreset && !presetDirty) { setDirty(true); renderPresetSelect(); }
    syncUI(); scheduleRender(); saveCfg();
  }

  function applyPreset(id, silent) {
    const p = findPreset(id);
    if (!p) return;
    cfg = normalizeCfg(p.cfg);
    setActive(id);
    setDirty(false);
    syncUI(); scheduleRender(); saveCfg(); renderPresetSelect();
    if (cfg.mode === 'image' && !state.logo) toast('已切到「' + p.name + '」，Logo 图片需重新选择');
    else if (!silent) toast('已应用方案：' + p.name);
  }

  function uniqueName(list, name) {
    let n = name, i = 2;
    while (list.some((p) => p.name === n)) { n = name + ' ' + i; i++; }
    return n;
  }

  function presetSaveAs() {
    const list = loadPresets();
    const name = (window.prompt('给这套配置起个名字：', '方案 ' + (list.length + 1)) || '').trim();
    if (!name) return;
    const p = { id: uid(), name: uniqueName(list, name), cfg: JSON.parse(JSON.stringify(cfg)), updated: Date.now() };
    list.push(p);
    if (!savePresets(list)) return;
    setActive(p.id);
    setDirty(false);
    renderPresetSelect();
    toast('已保存为「' + p.name + '」');
  }

  function presetUpdate() {
    const p = findPreset(activePreset);
    if (!p || p.builtin) return;
    if (!window.confirm('用当前配置覆盖「' + p.name + '」？')) return;
    const list = loadPresets();
    for (let i = 0; i < list.length; i++) {
      if (list[i].id === p.id) { list[i].cfg = JSON.parse(JSON.stringify(cfg)); list[i].updated = Date.now(); break; }
    }
    if (!savePresets(list)) return;
    setDirty(false);
    renderPresetSelect();
    toast('已覆盖保存「' + p.name + '」');
  }

  function presetRename() {
    const p = findPreset(activePreset);
    if (!p || p.builtin) return;
    const name = (window.prompt('重命名方案：', p.name) || '').trim();
    if (!name || name === p.name) return;
    const list = loadPresets();
    for (let i = 0; i < list.length; i++) {
      if (list[i].id === p.id) { list[i].name = uniqueName(list.filter((x) => x.id !== p.id), name); break; }
    }
    if (!savePresets(list)) return;
    renderPresetSelect();
    toast('已重命名为「' + name + '」');
  }

  function presetDelete() {
    const p = findPreset(activePreset);
    if (!p || p.builtin) return;
    if (!window.confirm('删除方案「' + p.name + '」？此操作不可撤销。')) return;
    const list = loadPresets().filter((x) => x.id !== p.id);
    if (!savePresets(list)) return;
    setActive('');
    setDirty(false);
    renderPresetSelect();
    toast('已删除「' + p.name + '」');
  }

  function downloadJSON(filename, text) {
    const url = URL.createObjectURL(new Blob([text], { type: 'application/json;charset=utf-8' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  function dateStamp() {
    const d = new Date();
    const p = (n) => (n < 10 ? '0' : '') + n;
    return d.getFullYear() + p(d.getMonth() + 1) + p(d.getDate());
  }

  function presetExport() {
    const p = findPreset(activePreset);
    const name = (p && !p.builtin) ? p.name : (p ? p.name + '（内置）' : '当前配置');
    const payload = {
      _type: 'wm-preset',
      version: CFG_VERSION,
      name: name,
      exportedAt: new Date().toISOString(),
      cfg: JSON.parse(JSON.stringify(cfg))
    };
    downloadJSON('水印配置-' + name + '-' + dateStamp() + '.json', JSON.stringify(payload, null, 2));
    toast('已导出 JSON');
  }

  function presetImport(file) {
    const r = new FileReader();
    r.onload = () => {
      let data;
      try { data = JSON.parse(String(r.result)); }
      catch (e) { toast('不是合法的 JSON 文件'); return; }

      let incoming = [];
      if (Array.isArray(data)) incoming = data;
      else if (data && Array.isArray(data.presets)) incoming = data.presets;
      else if (data && typeof data === 'object') incoming = [data];

      const list = loadPresets();
      let added = 0, lastId = '';
      incoming.forEach((it) => {
        if (!it || typeof it !== 'object') return;
        const raw = it.cfg || (it.mode || it.layout || it.text ? it : null);
        if (!raw) return;
        const p = { id: uid(), name: '', cfg: normalizeCfg(raw), updated: Date.now() };
        p.name = uniqueName(list, String(it.name || '导入方案').trim() || '导入方案');
        list.push(p);
        lastId = p.id;
        added++;
      });

      if (!added) { toast('文件里没有识别到配置项'); return; }
      if (!savePresets(list)) return;
      applyPreset(lastId, true);
      toast('已导入 ' + added + ' 套方案');
    };
    r.onerror = () => toast('文件读取失败');
    r.readAsText(file);
  }

  function withAlpha(hex, a) {
    const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex || '');
    if (!m) return hex;
    return 'rgba(' + parseInt(m[1], 16) + ',' + parseInt(m[2], 16) + ',' + parseInt(m[3], 16) + ',' + a + ')';
  }

  function extOf(name) {
    const i = String(name).lastIndexOf('.');
    return i < 0 ? '' : name.slice(i + 1).toLowerCase();
  }
  function baseOf(name) {
    const i = String(name).lastIndexOf('.');
    return i < 0 ? name : name.slice(0, i);
  }
  function mimeOf(ext) {
    if (ext === 'jpg' || ext === 'jpeg') return 'image/jpeg';
    if (ext === 'png') return 'image/png';
    if (ext === 'webp') return 'image/webp';
    return null;
  }

  // ============ 图片导入 ============
  function addFiles(fileList) {
    const files = Array.from(fileList || []).filter((f) => /^image\//.test(f.type) || /\.(jpe?g|png|webp|bmp|gif)$/i.test(f.name));
    if (!files.length) { toast('没有识别到图片文件'); return; }
    files.forEach((f) => {
      const url = URL.createObjectURL(f);
      const img = new Image();
      const item = { id: 'i' + Date.now() + Math.random().toString(36).slice(2, 7), name: f.name, file: f, url: url, img: img, w: 0, h: 0 };
      img.onload = () => {
        item.w = img.naturalWidth;
        item.h = img.naturalHeight;
        if (state.current < 0 || state.items[state.current] === item) renderPreview();
        updateMeta();
      };
      img.src = url;
      state.items.push(item);
      if (state.current < 0) state.current = 0;
    });
    renderThumbs();
    renderPreview();
    toast('已添加 ' + files.length + ' 张图片');
  }

  function renderThumbs() {
    thumbList.innerHTML = '';
    imgCount.textContent = state.items.length + ' 张';
    emptyTip.style.display = state.items.length ? 'none' : 'block';
    state.items.forEach((item, i) => {
      const div = document.createElement('div');
      div.className = 'thumb' + (i === state.current ? ' active' : '');
      div.innerHTML =
        '<img src="' + item.url + '" alt="">' +
        '<div class="del" title="移除">×</div>' +
        '<div class="tname">' + escapeHtml(item.name) + '</div>';
      div.addEventListener('click', () => selectItem(i));
      div.querySelector('.del').addEventListener('click', (e) => {
        e.stopPropagation();
        removeItem(i);
      });
      thumbList.appendChild(div);
    });
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }

  // 移动端：三栏改为分页，这里统一提供切换能力（宽屏下 setView 无副作用）
  function isNarrow() {
    return window.matchMedia('(max-width: 900px)').matches;
  }
  function setView(name) {
    const layout = document.querySelector('.layout');
    if (!layout) return;
    layout.setAttribute('data-view', name);
    document.querySelectorAll('.view-tab').forEach((t) => {
      const on = t.dataset.view === name;
      t.classList.toggle('is-active', on);
      t.setAttribute('aria-selected', on ? 'true' : 'false');
    });
    // 面板从隐藏变可见后容器尺寸才有效，需重算预览
    if (name === 'preview') requestAnimationFrame(renderPreview);
  }

  function selectItem(i) {
    state.current = i;
    renderThumbs();
    renderPreview();
    // 手机上选完图自动跳到预览，省一次点击
    if (isNarrow()) setView('preview');
  }

  function removeItem(i) {
    const it = state.items[i];
    if (it) URL.revokeObjectURL(it.url);
    state.items.splice(i, 1);
    if (state.current >= state.items.length) state.current = state.items.length - 1;
    renderThumbs();
    renderPreview();
  }

  // ============ 水印渲染核心 ============
  // 所有尺寸都通过 unitOf() 换算，因此预览（缩小）与导出（原尺寸）视觉完全一致
  function buildUnit(ctx, W, H, s) {
    const base = Math.min(W, H);
    const unitOf = (v, unit) => (unit === '%' ? (base * v) / 100 : v * s);
    const rad = (cfg.layout.angle * Math.PI) / 180;

    if (cfg.mode === 'text') {
      const t = cfg.text;
      const fs = Math.max(1, unitOf(t.size, t.unit));
      const lh = fs * (t.lineHeight || 1.3);
      const lines = String(t.content || '').split('\n');
      if (!lines.length || !lines.join('').trim()) return null;
      const font = (t.italic ? 'italic ' : '') + (t.bold ? 'bold ' : 'normal ') + fs + 'px ' + t.family;
      ctx.font = font;
      let tw = 0;
      for (const ln of lines) tw = Math.max(tw, ctx.measureText(ln).width);
      const th = lh * lines.length;
      const ex = t.stroke.on ? fs * t.stroke.width : 0;
      const bw = Math.abs(tw * Math.cos(rad)) + Math.abs(th * Math.sin(rad)) + ex * 2;
      const bh = Math.abs(tw * Math.sin(rad)) + Math.abs(th * Math.cos(rad)) + ex * 2;

      const draw = (cx, cy) => {
        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(rad);
        ctx.font = font;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.globalAlpha = t.opacity / 100;
        if (t.shadow.on) {
          ctx.shadowColor = withAlpha(t.shadow.color, 0.9);
          ctx.shadowBlur = t.shadow.blur * s;
        } else {
          ctx.shadowColor = 'transparent';
          ctx.shadowBlur = 0;
        }
        const total = lh * lines.length;
        for (let i = 0; i < lines.length; i++) {
          const y = -total / 2 + lh * (i + 0.5);
          if (t.stroke.on) {
            ctx.lineWidth = fs * t.stroke.width;
            ctx.strokeStyle = withAlpha(t.stroke.color, t.opacity / 100);
            ctx.lineJoin = 'round';
            ctx.miterLimit = 2;
            ctx.strokeText(lines[i], 0, y);
          }
          ctx.fillStyle = t.color;
          ctx.fillText(lines[i], 0, y);
        }
        ctx.restore();
      };
      return { bw, bh, draw };
    }

    // 图片水印
    const logo = state.logo;
    if (!logo || !logo.naturalWidth) return null;
    const iw = Math.max(1, unitOf(cfg.image.width, cfg.image.unit));
    const ih = iw * (logo.naturalHeight / logo.naturalWidth);
    const bw = Math.abs(iw * Math.cos(rad)) + Math.abs(ih * Math.sin(rad));
    const bh = Math.abs(iw * Math.sin(rad)) + Math.abs(ih * Math.cos(rad));
    const draw = (cx, cy) => {
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(rad);
      ctx.globalAlpha = cfg.image.opacity / 100;
      ctx.drawImage(logo, -iw / 2, -ih / 2, iw, ih);
      ctx.restore();
    };
    return { bw, bh, draw };
  }

  function drawWatermarks(ctx, W, H, origW) {
    const s = W / origW;
    const unit = buildUnit(ctx, W, H, s);
    if (!unit) return;
    const L = cfg.layout;
    const base = Math.min(W, H);
    const margin = L.marginUnit === '%' ? (base * L.margin) / 100 : L.margin * s;

    if (L.position === 'tile') {
      const stepX = Math.max(4, unit.bw * (1 + L.gapX / 100));
      const stepY = Math.max(4, unit.bh * (1 + L.gapY / 100));
      let row = 0;
      for (let y = -stepY; y <= H + stepY; y += stepY) {
        const off = L.stagger && row % 2 === 1 ? stepX / 2 : 0;
        for (let x = -stepX; x <= W + stepX; x += stepX) {
          unit.draw(x + off, y);
        }
        row++;
      }
    } else {
      const p = L.position;
      let cx;
      if (p.charAt(1) === 'l') cx = margin + unit.bw / 2;
      else if (p.charAt(1) === 'r') cx = W - margin - unit.bw / 2;
      else cx = W / 2;
      let cy;
      if (p.charAt(0) === 't') cy = margin + unit.bh / 2;
      else if (p.charAt(0) === 'b') cy = H - margin - unit.bh / 2;
      else cy = H / 2;
      unit.draw(cx, cy);
    }
  }

  // ============ 预览 ============
  let rafId = null;
  function scheduleRender() {
    if (rafId) return;
    rafId = requestAnimationFrame(() => { rafId = null; renderPreview(); });
  }

  function renderPreview() {
    const item = state.items[state.current];
    if (!item || !item.w) {
      canvas.classList.add('hidden');
      previewEmpty.style.display = 'block';
      metaName.textContent = '—';
      metaSize.textContent = '—';
      return;
    }
    canvas.classList.remove('hidden');
    previewEmpty.style.display = 'none';

    const availW = Math.max(80, previewWrap.clientWidth - 28);
    const availH = Math.max(80, previewWrap.clientHeight - 28);
    const scale = Math.min(1, availW / item.w, availH / item.h);
    const W = Math.max(1, Math.round(item.w * scale));
    const H = Math.max(1, Math.round(item.h * scale));

    canvas.width = W;
    canvas.height = H;
    canvas.style.width = W + 'px';
    canvas.style.height = H + 'px';

    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, W, H);
    ctx.drawImage(item.img, 0, 0, W, H);
    if (state.showWM) drawWatermarks(ctx, W, H, item.w);

    updateMeta();
  }

  function updateMeta() {
    const item = state.items[state.current];
    if (!item) { metaName.textContent = '—'; metaSize.textContent = '—'; return; }
    metaName.textContent = item.name;
    const ext = resolveExt(item);
    metaSize.textContent = item.w + ' × ' + item.h + '  →  导出 ' + ext.toUpperCase();
  }

  function resolveExt(item) {
    if (cfg.output.format !== 'original') return cfg.output.format;
    const e = extOf(item.name);
    return mimeOf(e) ? e : 'png';
  }

  // ============ 导出 ============
  function toBlob(canvas, mime, q) {
    return new Promise((resolve, reject) => {
      canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('导出失败'))), mime, mime === 'image/png' ? undefined : q);
    });
  }

  // file:// 场景下极少数浏览器会污染 canvas，这里做一次检测并降级为 dataURL
  async function ensureSafe(item) {
    if (item.safe) return;
    try {
      const c = document.createElement('canvas');
      c.width = c.height = 1;
      c.getContext('2d').drawImage(item.img, 0, 0, 1, 1);
      c.toDataURL('image/png');
      item.safe = true;
    } catch (e) {
      const dataUrl = await new Promise((res, rej) => {
        const fr = new FileReader();
        fr.onload = () => res(fr.result);
        fr.onerror = rej;
        fr.readAsDataURL(item.file);
      });
      const im = new Image();
      await new Promise((res, rej) => { im.onload = res; im.onerror = rej; im.src = dataUrl; });
      URL.revokeObjectURL(item.url);
      item.url = dataUrl;
      item.img = im;
      item.w = im.naturalWidth;
      item.h = im.naturalHeight;
      item.safe = true;
      renderThumbs();
    }
  }

  async function renderItem(item) {
    await ensureSafe(item);
    const W = item.w || item.img.naturalWidth;
    const H = item.h || item.img.naturalHeight;
    const ext = resolveExt(item);
    const mime = mimeOf(ext) || 'image/png';

    const c = document.createElement('canvas');
    c.width = W;
    c.height = H;
    const ctx = c.getContext('2d');
    if (mime === 'image/jpeg') { ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, W, H); }
    ctx.drawImage(item.img, 0, 0, W, H);
    drawWatermarks(ctx, W, H, W);
    const blob = await toBlob(c, mime, cfg.output.quality);
    return { blob, name: makeName(item.name, ext) };
  }

  function makeName(name, ext) {
    const b = baseOf(name);
    const a = cfg.output.affix || '';
    return (cfg.output.nameRule === 'prefix' ? a + b : b + a) + '.' + ext;
  }

  function download(blob, name) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 4000);
  }

  function setProgress(ratio) {
    progress.classList.remove('hidden');
    progressBar.style.width = Math.round(ratio * 100) + '%';
  }
  function hideProgress() {
    setTimeout(() => { progress.classList.add('hidden'); progressBar.style.width = '0'; }, 600);
  }

  async function exportCurrent() {
    if (state.busy) return;
    const item = state.items[state.current];
    if (!item) { toast('请先添加并选择一张图片'); return; }
    state.busy = true;
    exportTip.textContent = '正在生成…';
    try {
      const { blob, name } = await renderItem(item);
      download(blob, name);
      exportTip.textContent = '已导出：' + name;
      toast('导出成功');
    } catch (e) {
      console.error(e);
      exportTip.textContent = '导出失败，请重试';
      toast('导出失败：' + e.message);
    }
    state.busy = false;
  }

  async function exportAll() {
    if (state.busy) return;
    if (!state.items.length) { toast('请先添加图片'); return; }
    state.busy = true;
    const files = [];
    const used = Object.create(null);
    try {
      for (let i = 0; i < state.items.length; i++) {
        exportTip.textContent = '处理中 ' + (i + 1) + ' / ' + state.items.length;
        setProgress(i / state.items.length);
        await sleep(0);
        const { blob, name } = await renderItem(state.items[i]);
        let finalName = name;
        if (used[finalName]) {
          const b = baseOf(name), e = extOf(name);
          let n = 2;
          while (used[b + '(' + n + ').' + e]) n++;
          finalName = b + '(' + n + ').' + e;
        }
        used[finalName] = true;
        files.push({ name: finalName, data: new Uint8Array(await blob.arrayBuffer()) });
      }
      setProgress(1);
      exportTip.textContent = '正在打包…';
      await sleep(0);
      const zip = makeZip(files);
      const stamp = new Date().toISOString().slice(0, 10);
      download(zip, 'watermarked_' + stamp + '.zip');
      exportTip.textContent = '已完成，共 ' + files.length + ' 张';
      toast('批量导出完成：' + files.length + ' 张');
    } catch (e) {
      console.error(e);
      exportTip.textContent = '导出失败，请重试';
      toast('导出失败：' + e.message);
    }
    hideProgress();
    state.busy = false;
  }

  // ============ ZIP 打包（store 模式，无压缩，纯前端实现） ============
  const CRC_TABLE = (function () {
    const t = new Uint32Array(256);
    for (let i = 0; i < 256; i++) {
      let c = i;
      for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      t[i] = c >>> 0;
    }
    return t;
  })();

  function crc32(u8) {
    let c = 0xffffffff;
    for (let i = 0; i < u8.length; i++) c = CRC_TABLE[(c ^ u8[i]) & 0xff] ^ (c >>> 8);
    return (c ^ 0xffffffff) >>> 0;
  }

  function makeZip(files) {
    const enc = new TextEncoder();
    const now = new Date();
    const year = Math.max(1980, now.getFullYear());
    const dosTime = (now.getHours() << 11) | (now.getMinutes() << 5) | (now.getSeconds() >> 1);
    const dosDate = ((year - 1980) << 9) | ((now.getMonth() + 1) << 5) | now.getDate();

    const locals = [];
    const centrals = [];
    let offset = 0;

    files.forEach(function (f) {
      const nameBytes = enc.encode(f.name);
      const crc = crc32(f.data);
      const size = f.data.length;

      const lh = new Uint8Array(30 + nameBytes.length);
      const dv = new DataView(lh.buffer);
      dv.setUint32(0, 0x04034b50, true);
      dv.setUint16(4, 20, true);
      dv.setUint16(6, 0x0800, true);   // UTF-8 文件名
      dv.setUint16(8, 0, true);        // store
      dv.setUint16(10, dosTime, true);
      dv.setUint16(12, dosDate, true);
      dv.setUint32(14, crc, true);
      dv.setUint32(18, size, true);
      dv.setUint32(22, size, true);
      dv.setUint16(26, nameBytes.length, true);
      dv.setUint16(28, 0, true);
      lh.set(nameBytes, 30);
      locals.push(lh, f.data);

      const ch = new Uint8Array(46 + nameBytes.length);
      const cv = new DataView(ch.buffer);
      cv.setUint32(0, 0x02014b50, true);
      cv.setUint16(4, 20, true);
      cv.setUint16(6, 20, true);
      cv.setUint16(8, 0x0800, true);
      cv.setUint16(10, 0, true);
      cv.setUint16(12, dosTime, true);
      cv.setUint16(14, dosDate, true);
      cv.setUint32(16, crc, true);
      cv.setUint32(20, size, true);
      cv.setUint32(24, size, true);
      cv.setUint16(28, nameBytes.length, true);
      cv.setUint32(42, offset, true);
      ch.set(nameBytes, 46);
      centrals.push(ch);

      offset += lh.length + size;
    });

    const centralSize = centrals.reduce((a, b) => a + b.length, 0);
    const eocd = new Uint8Array(22);
    const ev = new DataView(eocd.buffer);
    ev.setUint32(0, 0x06054b50, true);
    ev.setUint16(8, files.length, true);
    ev.setUint16(10, files.length, true);
    ev.setUint32(12, centralSize, true);
    ev.setUint32(16, offset, true);

    const all = locals.concat(centrals, [eocd]);
    const total = all.reduce((a, b) => a + b.length, 0);
    const out = new Uint8Array(total);
    let p = 0;
    for (const part of all) { out.set(part, p); p += part.length; }
    return new Blob([out], { type: 'application/zip' });
  }

  // ============ 界面状态同步 ============
  function syncUI() {
    // 输入控件回填
    document.querySelectorAll('[data-cfg]').forEach((el) => {
      const v = getPath(cfg, el.dataset.cfg);
      if (v === undefined) return;
      if (el.type === 'checkbox') el.checked = !!v;
      else el.value = v;
    });

    // 模式分组
    document.querySelectorAll('.seg').forEach((b) => b.classList.toggle('active', b.dataset.mode === cfg.mode));
    $('#groupText').classList.toggle('hidden', cfg.mode !== 'text');
    $('#groupImage').classList.toggle('hidden', cfg.mode !== 'image');

    // 位置
    const isTile = cfg.layout.position === 'tile';
    document.querySelectorAll('#grid9 button').forEach((b) => b.classList.toggle('active', !isTile && b.dataset.pos === cfg.layout.position));
    document.querySelector('.tile-btn').classList.toggle('active', isTile);
    $('#tileOptions').classList.toggle('hidden', !isTile);
    $('#marginOptions').classList.toggle('hidden', isTile);

    // 子选项
    $('#strokeOptions').classList.toggle('hidden', !cfg.text.stroke.on);
    $('#shadowOptions').classList.toggle('hidden', !cfg.text.shadow.on);
    $('#qualityRow').classList.toggle('hidden', cfg.output.format === 'png');

    // 数值标签
    $('#textOpacityVal').textContent = cfg.text.opacity + '%';
    $('#strokeWidthVal').textContent = Number(cfg.text.stroke.width).toFixed(2);
    $('#shadowBlurVal').textContent = cfg.text.shadow.blur;
    $('#logoOpacityVal').textContent = cfg.image.opacity + '%';
    $('#gapXVal').textContent = cfg.layout.gapX + '%';
    $('#gapYVal').textContent = cfg.layout.gapY + '%';
    $('#angleVal').textContent = cfg.layout.angle + '°';
    $('#qualityVal').textContent = Math.round(cfg.output.quality * 100);
  }

  // ============ 事件绑定 ============
  function bind() {
    // 通用配置输入
    document.querySelectorAll('[data-cfg]').forEach((el) => {
      el.addEventListener('input', () => {
        const t = el.dataset.type;
        let v;
        if (el.type === 'checkbox') v = el.checked;
        else if (t === 'number') v = parseFloat(el.value);
        else v = el.value;
        if (t === 'number' && (v === null || isNaN(v))) return;
        setPath(cfg, el.dataset.cfg, v);
        syncUI();
        scheduleRender();
        saveCfg();
      });
    });

    // 模式切换
    document.querySelectorAll('.seg').forEach((b) => {
      b.addEventListener('click', () => {
        if (cfg.mode === 'image' && b.dataset.mode === 'image' && !state.logo) pickLogo();
        cfg.mode = b.dataset.mode;
        onCfgChanged();
      });
    });

    // 位置
    const setPos = (pos) => {
      cfg.layout.position = pos;
      onCfgChanged();
    };
    document.querySelectorAll('#grid9 button').forEach((b) => b.addEventListener('click', () => setPos(b.dataset.pos)));
    document.querySelector('.tile-btn').addEventListener('click', () => setPos('tile'));

    // 角度快捷
    document.querySelectorAll('[data-angle]').forEach((b) => {
      b.addEventListener('click', () => {
        cfg.layout.angle = parseFloat(b.dataset.angle);
        const el = $('#angle');
        el.value = cfg.layout.angle;
        onCfgChanged();
      });
    });

    // 快捷颜色
    document.querySelectorAll('#colorSwatches button').forEach((b) => {
      b.addEventListener('click', () => {
        cfg.text.color = b.dataset.color;
        $('#textColor').value = b.dataset.color;
        onCfgChanged();
      });
    });

    // 导入
    dropzone.addEventListener('click', () => fileInput.click());
    fileInput.addEventListener('change', () => { addFiles(fileInput.files); fileInput.value = ''; });
    $('#btnAdd').addEventListener('click', () => fileInput.click());
    $('#btnClearAll').addEventListener('click', () => {
      if (!state.items.length) return;
      state.items.forEach((i) => URL.revokeObjectURL(i.url));
      state.items = [];
      state.current = -1;
      renderThumbs(); renderPreview();
    });

    // 拖拽
    ['dragenter', 'dragover'].forEach((ev) =>
      document.addEventListener(ev, (e) => { e.preventDefault(); dropzone.classList.add('over'); })
    );
    ['dragleave', 'drop'].forEach((ev) =>
      document.addEventListener(ev, (e) => { e.preventDefault(); dropzone.classList.remove('over'); })
    );
    document.addEventListener('drop', (e) => {
      if (e.dataTransfer && e.dataTransfer.files.length) addFiles(e.dataTransfer.files);
    });

    // 粘贴
    document.addEventListener('paste', (e) => {
      const items = e.clipboardData && e.clipboardData.items;
      if (!items) return;
      const files = [];
      for (const it of items) {
        if (it.kind === 'file' && /^image\//.test(it.type)) { const f = it.getAsFile(); if (f) files.push(f); }
      }
      if (files.length) addFiles(files);
    });

    // Logo
    $('#btnPickLogo').addEventListener('click', pickLogo);
    logoInput.addEventListener('change', () => {
      const f = logoInput.files && logoInput.files[0];
      logoInput.value = '';
      if (!f) return;
      const url = URL.createObjectURL(f);
      const im = new Image();
      im.onload = () => {
        if (state.logo && state.logo._url) URL.revokeObjectURL(state.logo._url);
        state.logo = im;
        im._url = url;
        const box = $('#logoPreview');
        box.innerHTML = '';
        const thumb = document.createElement('img');
        thumb.src = url;
        box.appendChild(thumb);
        scheduleRender();
      };
      im.onerror = () => toast('Logo 图片加载失败');
      im.src = url;
    });
    $('#btnClearLogo').addEventListener('click', () => {
      if (state.logo && state.logo._url) URL.revokeObjectURL(state.logo._url);
      state.logo = null;
      $('#logoPreview').innerHTML = '未选择';
      scheduleRender();
    });

    // 预览开关
    $('#togglePreview').addEventListener('change', (e) => { state.showWM = e.target.checked; scheduleRender(); });

    // 导出
    $('#btnExportOne').addEventListener('click', exportCurrent);
    $('#btnExportAll').addEventListener('click', exportAll);

    // 恢复默认
    $('#btnReset').addEventListener('click', () => {
      cfg = JSON.parse(JSON.stringify(DEFAULTS));
      setActive('');
      setDirty(false);
      syncUI(); scheduleRender(); saveCfg(); renderPresetSelect();
      toast('已恢复默认设置');
    });

    // 配置方案
    $('#presetSelect').addEventListener('change', (e) => {
      const v = e.target.value;
      if (!v) { setActive(''); setDirty(false); renderPresetSelect(); return; }
      applyPreset(v);
    });
    $('#btnPresetSave').addEventListener('click', presetSaveAs);
    $('#btnPresetUpdate').addEventListener('click', presetUpdate);
    $('#btnPresetRename').addEventListener('click', presetRename);
    $('#btnPresetDelete').addEventListener('click', presetDelete);
    $('#btnPresetExport').addEventListener('click', presetExport);
    $('#btnPresetImport').addEventListener('click', () => $('#presetFile').click());
    $('#presetFile').addEventListener('change', (e) => {
      const f = e.target.files && e.target.files[0];
      if (f) presetImport(f);
      e.target.value = '';
    });

    // 窗口缩放重绘
    let rt = null;
    window.addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(renderPreview, 120); });
  }

  function pickLogo() { logoInput.click(); }

  // 移动端视图切换：图片 / 预览 / 设置
  function initViewTabs() {
    document.querySelectorAll('.view-tab').forEach((t) => {
      t.addEventListener('click', () => setView(t.dataset.view));
    });
  }

  // ============ 启动 ============
  syncUI();
  bind();
  initViewTabs();
  // 恢复上次的方案：改过但没存回方案的，保留改动并标记"已改动"
  (function initPreset() {
    let saved = '', dirty = '';
    try {
      saved = localStorage.getItem(ACTIVE_KEY) || '';
      dirty = localStorage.getItem(DIRTY_KEY) || '';
    } catch (e) { /* 忽略 */ }
    if (saved && findPreset(saved)) {
      if (dirty === '1') { activePreset = saved; setDirty(true); renderPresetSelect(); }
      else applyPreset(saved, true);
    } else {
      setActive('');
      renderPresetSelect();
    }
  })();
  renderThumbs();
  renderPreview();
})();
