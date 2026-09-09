// 水印渲染核心 —— 与 Web 版 tools/image-watermark/app.js 的 buildUnit / drawWatermarks 行为一致。
// 区别：小程序 canvas 2d 的 ctx 与 Web CanvasRenderingContext2D 基本同构，但图片需经 canvas.createImage() 异步加载。
// 所有尺寸都通过 unitOf() 换算（% 基于短边，px 乘以 s = 绘制宽 / 原宽），
// 因此预览（缩小）与导出（原尺寸）视觉完全一致。

function withAlpha(hex, alpha) {
  const h = String(hex || '#000000').replace('#', '');
  const r = parseInt(h.substring(0, 2), 16) || 0;
  const g = parseInt(h.substring(2, 4), 16) || 0;
  const b = parseInt(h.substring(4, 6), 16) || 0;
  return 'rgba(' + r + ',' + g + ',' + b + ',' + alpha + ')';
}

// 在给定 ctx 上构建水印单元，返回 {bw, bh, draw(cx, cy)} 或 null（无内容）
function buildUnit(ctx, W, H, s, cfg, logo) {
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

  // 图片 / Logo 水印
  if (!logo || !logo.width) return null;
  const iw = Math.max(1, unitOf(cfg.image.width, cfg.image.unit));
  const ih = iw * (logo.height / logo.width);
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

// 把一个水印（按 cfg 当前配置）绘制到 ctx 覆盖的 W×H 区域
function drawWatermarks(ctx, W, H, origW, cfg, logo) {
  const s = W / origW;
  const unit = buildUnit(ctx, W, H, s, cfg, logo);
  if (!unit) return;
  const L = cfg.layout;
  const position = L.tile ? 'tile' : L.position;
  const base = Math.min(W, H);
  const margin = L.marginUnit === '%' ? (base * L.margin) / 100 : L.margin * s;

  if (position === 'tile') {
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
    const p = position;
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

// 异步加载图片为 canvas 可用的 Image 对象
function loadImage(canvas, src) {
  return new Promise((resolve, reject) => {
    const img = canvas.createImage();
    img.onload = () => resolve(img);
    img.onerror = (e) => reject(e);
    img.src = src;
  });
}

module.exports = { withAlpha, buildUnit, drawWatermarks, loadImage };
