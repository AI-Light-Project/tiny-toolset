const watermark = require('../../utils/watermark.js');

Page({
  data: {
    images: [],          // 仅用于模板渲染：{path, w, h}
    current: 0,
    hasImage: false,
    mode: 'text',        // 'text' | 'image'

    text: {
      content: '仅个人使用',
      family: 'sans-serif',
      size: 5,
      unit: '%',
      opacity: 60,
      italic: false,
      bold: false,
      color: '#ffffff',
      lineHeight: 1.3,
      shadow: { on: true, color: '#000000', blur: 2 },
      stroke: { on: false, color: '#000000', width: 0.04 }
    },
    imageWm: { path: '', w: 0, h: 0, width: 18, unit: '%', opacity: 90 },
    layout: {
      position: 'br',
      angle: -30,
      margin: 4,
      marginUnit: '%',
      gapX: 40,
      gapY: 40,
      stagger: false,
      tile: false
    },
    showWM: true,

    colors: ['#ffffff', '#000000', '#ff4d8d', '#22d3ee', '#fde047', '#fb923c'],
    families: ['sans-serif', 'serif', 'monospace'],
    familyLabels: ['无衬线', '衬线', '等宽'],
    posList: [['tl', 'tc', 'tr'], ['ml', 'mc', 'mr'], ['bl', 'bc', 'br']],

    busy: false,
    progress: 0,
    progressText: ''
  },

  onLoad() {
    this._images = [];   // 完整对象（含 canvas Image），不入 setData
    this._logo = null;
  },

  onReady() {
    this.initCanvas();
  },

  async initCanvas() {
    const prev = await this.getCanvas('#previewCanvas');
    this.previewCanvas = prev.canvas;
    this.previewCtx = this.previewCanvas.getContext('2d');
    this.previewRect = { w: prev.width || 320, h: prev.height || 240 };
    const exp = await this.getCanvas('#exportCanvas');
    this.exportCanvas = exp.canvas;
    this.exportCtx = this.exportCanvas.getContext('2d');
    const info = (wx.getWindowInfo ? wx.getWindowInfo() : wx.getSystemInfoSync());
    this.dpr = info.pixelRatio || 2;
    if (this._images[this.data.current]) this.renderPreview();
  },

  getCanvas(selector) {
    return new Promise((resolve) => {
      wx.createSelectorQuery().in(this).select(selector)
        .fields({ node: true, size: true })
        .exec((res) => resolve(res[0]));
    });
  },

  // ---------- 选图 ----------
  async chooseImage() {
    try {
      const res = await wx.chooseMedia({
        count: 9, mediaType: ['image'], sourceType: ['album', 'camera'], sizeType: ['original']
      });
      for (const f of res.tempFiles) {
        const img = await watermark.loadImage(this.previewCanvas, f.tempFilePath);
        this._images.push({ path: f.tempFilePath, w: img.width, h: img.height, img });
      }
      this.syncImages(0);
    } catch (e) {
      if (e && e.errMsg && e.errMsg.indexOf('cancel') < 0) {
        wx.showToast({ title: '选图失败', icon: 'none' });
      }
    }
  },

  async chooseLogo() {
    try {
      const res = await wx.chooseMedia({ count: 1, mediaType: ['image'], sourceType: ['album'], sizeType: ['original'] });
      const f = res.tempFiles[0];
      const img = await watermark.loadImage(this.previewCanvas, f.tempFilePath);
      this._logo = img;
      this.setData({
        'imageWm.path': f.tempFilePath,
        'imageWm.w': img.width,
        'imageWm.h': img.height
      }, () => this.renderPreview());
    } catch (e) { /* 用户取消 */ }
  },

  selectImage(e) {
    const i = e.currentTarget.dataset.index;
    this.setData({ current: i }, () => this.renderPreview());
  },

  syncImages(current) {
    this.setData({
      images: this._images.map((x) => ({ path: x.path, w: x.w, h: x.h })),
      current,
      hasImage: true
    }, () => this.renderPreview());
  },

  // ---------- 渲染 ----------
  buildCfg() {
    const d = this.data;
    return {
      mode: d.mode,
      text: d.text,
      image: { width: d.imageWm.width, unit: d.imageWm.unit, opacity: d.imageWm.opacity },
      layout: d.layout
    };
  },

  renderPreview() {
    const item = this._images[this.data.current];
    if (!item || !item.img || !this.previewCtx) return;
    const ctx = this.previewCtx;
    const canvas = this.previewCanvas;

    // 预览画布物理尺寸（CSS px），等比缩放图片塞入
    const rect = this.previewRect || { w: 320, h: 240 };
    const scale = Math.min(1, rect.w / item.w, rect.h / item.h);
    const W = Math.max(1, Math.round(item.w * scale));
    const H = Math.max(1, Math.round(item.h * scale));

    canvas.width = W * this.dpr;
    canvas.height = H * this.dpr;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.scale(this.dpr, this.dpr);
    ctx.clearRect(0, 0, W, H);
    ctx.drawImage(item.img, 0, 0, W, H);

    if (this.data.showWM) {
      const cfg = this.buildCfg();
      const logo = this.data.mode === 'image' ? this._logo : null;
      watermark.drawWatermarks(ctx, W, H, item.w, cfg, logo);
    }
  },

  // ---------- 设置变更 ----------
  onMode(e) {
    const mode = e.currentTarget.dataset.mode;
    if (mode === 'image' && !this._logo) {
      wx.showToast({ title: '请先选择 Logo', icon: 'none' });
    }
    this.setData({ mode }, () => this.renderPreview());
  },
  onContent(e) { this.setData({ 'text.content': e.detail.value }, () => this.renderPreview()); },
  onFamily(e) {
    const fam = this.data.families[e.currentTarget.dataset.i];
    this.setData({ 'text.family': fam }, () => this.renderPreview());
  },
  onTextSize(e) { this.setData({ 'text.size': e.detail.value }, () => this.renderPreview()); },
  onTextOpacity(e) { this.setData({ 'text.opacity': e.detail.value }, () => this.renderPreview()); },
  onLayoutAngle(e) { this.setData({ 'layout.angle': e.detail.value }, () => this.renderPreview()); },
  onMargin(e) { this.setData({ 'layout.margin': e.detail.value }, () => this.renderPreview()); },
  onGapX(e) { this.setData({ 'layout.gapX': e.detail.value }, () => this.renderPreview()); },
  onGapY(e) { this.setData({ 'layout.gapY': e.detail.value }, () => this.renderPreview()); },
  onColor(e) { this.setData({ 'text.color': e.currentTarget.dataset.color }, () => this.renderPreview()); },
  onItalic(e) { this.setData({ 'text.italic': e.detail.value }, () => this.renderPreview()); },
  onBold(e) { this.setData({ 'text.bold': e.detail.value }, () => this.renderPreview()); },
  onShadow(e) { this.setData({ 'text.shadow.on': e.detail.value }, () => this.renderPreview()); },
  onStroke(e) { this.setData({ 'text.stroke.on': e.detail.value }, () => this.renderPreview()); },

  onImageWidth(e) { this.setData({ 'imageWm.width': e.detail.value }, () => this.renderPreview()); },
  onImageOpacity(e) { this.setData({ 'imageWm.opacity': e.detail.value }, () => this.renderPreview()); },

  onTile(e) { this.setData({ 'layout.tile': e.detail.value }, () => this.renderPreview()); },
  onStagger(e) { this.setData({ 'layout.stagger': e.detail.value }, () => this.renderPreview()); },
  onShowWM(e) { this.setData({ showWM: e.detail.value }, () => this.renderPreview()); },
  onPosition(e) {
    this.setData({ 'layout.position': e.currentTarget.dataset.p, 'layout.tile': false }, () => this.renderPreview());
  },

  // ---------- 导出 ----------
  async saveCurrent() {
    if (!this._images.length) { wx.showToast({ title: '请先选择图片', icon: 'none' }); return; }
    await this.processAndSave([this.data.current]);
  },
  async saveAll() {
    if (!this._images.length) { wx.showToast({ title: '请先选择图片', icon: 'none' }); return; }
    await this.processAndSave(this._images.map((_, i) => i));
  },

  async processAndSave(indexes) {
    if (this.data.busy) return;
    const authed = await this.ensureAlbumAuth();
    if (!authed) { wx.showToast({ title: '未授权相册', icon: 'none' }); return; }
    this.setData({ busy: true, progress: 0, progressText: '处理中 0%' });
    try {
      let saved = 0;
      for (let i = 0; i < indexes.length; i++) {
        const item = this._images[indexes[i]];
        const tmp = await this.renderToTemp(item);
        await this.saveToAlbum(tmp);
        saved++;
        const pct = Math.round(((i + 1) / indexes.length) * 100);
        this.setData({ progress: pct, progressText: `处理中 ${pct}%` });
      }
      wx.showToast({ title: `已保存 ${saved} 张`, icon: 'success' });
    } catch (e) {
      wx.showToast({ title: '保存失败', icon: 'none' });
    } finally {
      this.setData({ busy: false });
    }
  },

  renderToTemp(item) {
    return new Promise((resolve, reject) => {
      const canvas = this.exportCanvas;
      const ctx = this.exportCtx;
      const W = item.w, H = item.h;
      canvas.width = W;
      canvas.height = H;
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, W, H);
      ctx.drawImage(item.img, 0, 0, W, H);
      if (this.data.showWM) {
        const cfg = this.buildCfg();
        const logo = this.data.mode === 'image' ? this._logo : null;
        watermark.drawWatermarks(ctx, W, H, W, cfg, logo);
      }
      wx.canvasToTempFilePath({
        canvas, x: 0, y: 0, width: W, height: H, destWidth: W, destHeight: H,
        fileType: 'png',
        success: (r) => resolve(r.tempFilePath),
        fail: reject
      });
    });
  },

  saveToAlbum(filePath) {
    return new Promise((resolve, reject) => {
      wx.saveImageToPhotosAlbum({
        filePath,
        success: resolve,
        fail: (e) => {
          if (e.errMsg && e.errMsg.indexOf('auth') >= 0) {
            wx.showModal({ title: '需要相册权限', content: '请在设置中允许保存到相册', showCancel: false });
          }
          reject(e);
        }
      });
    });
  },

  ensureAlbumAuth() {
    return new Promise((resolve) => {
      wx.getSetting({
        success: (res) => {
          const s = res.authSetting['scope.writePhotosAlbum'];
          if (s === false) {
            wx.showModal({
              title: '需要相册权限', content: '保存图片需要授权相册', confirmText: '去设置',
              success: (m) => m.confirm
                ? wx.openSetting({ success: () => resolve(true), fail: () => resolve(false) })
                : resolve(false)
            });
          } else if (!s) {
            wx.authorize({ scope: 'scope.writePhotosAlbum', success: () => resolve(true), fail: () => resolve(false) });
          } else resolve(true);
        },
        fail: () => resolve(false)
      });
    });
  }
});
