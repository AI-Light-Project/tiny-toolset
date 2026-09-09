/**
 * 工具注册表 —— 添加新工具的唯一入口
 *
 * 新增工具时：复制 tools/_template 为 tools/<your-tool>，
 * 然后在这里追加一条记录即可，首页会自动出现卡片。
 *
 * 注意：注册表用 JS 而非 JSON，是为了让 file:// 直接双击打开首页时
 * 也能正常加载（fetch 读本地 JSON 会被浏览器的 CORS 策略拦截）。
 */
window.TOOLS = [
  {
    id: 'image-watermark',
    name: '图片水印工具',
    desc: '给图片批量添加文字或 Logo 水印，支持九宫格定位与平铺防盗图，导出时保持原始分辨率。',
    icon: '💧',
    illustration: 'assets/img/droplet.png',
    category: '图片处理',
    tags: ['水印', '批量处理', 'Canvas', '隐私保护'],
    path: 'tools/image-watermark/index.html',
    version: '1.0.0',
    updated: '2026-09-08',
    features: [
      '文字水印 / 图片 Logo 水印两种模式',
      '自定义字体、字号、颜色、透明度、旋转角度',
      '九宫格定位 + 平铺全图（防截图盗用）',
      '批量处理并打包为 ZIP 下载',
      'JPG / PNG / WebP 导入与导出',
      '水印按图片短边百分比自适应缩放'
    ]
  }
  // 下一款工具加在这里 ↓
  // {
  //   id: 'your-tool',
  //   name: '工具名称',
  //   desc: '一句话说明这个工具做什么。',
  //   icon: '🛠️',
  //   illustration: 'assets/img/xxx.png',  // 可选：卡片插画（建议 256x256 透明 PNG，见 assets/img/CREDITS.md）
  //   category: '分类名',
  //   tags: ['标签1', '标签2'],
  //   path: 'tools/your-tool/index.html',
  //   version: '0.1.0',
  //   updated: '2026-01-01',
  //   features: ['要点一', '要点二']
  // }
];
