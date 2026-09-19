/**
 * 工具注册表 + 分类体系 —— 首页数据的唯一来源
 *
 * 新增工具时：复制 tools/_template 为 tools/<your-tool>，
 * 然后在这里追加一条记录（并给它归属的 categoryId）即可。
 *
 * 注意：注册表用 JS 而非 JSON，是为了让 file:// 直接双击打开首页时
 * 也能正常加载（fetch 读本地 JSON 会被浏览器的 CORS 策略拦截）。
 */

/* 站点元信息（首页「关于」等处使用） */
window.HUB_META = {
  name: '工具箱',
  tagline: '纯前端 · 离线可用 · 数据不出本机',
  version: '0.0.1',
  repo: 'https://github.com/AI-Light-Project/tiny-toolset'
};

/**
 * 分类体系（精简版：图片处理已上线，文字 / AI / 开发为预留位）
 * color 对应 theme.css 里的 --cat-1 ~ --cat-4
 */
window.CATEGORIES = [
  { id: 'image', name: '图片工具', icon: '🖼️', color: 1, desc: '图片处理、水印、压缩' },
  { id: 'text',  name: '文字工具', icon: '✍️', color: 2, desc: '文本处理与格式转换' },
  { id: 'ai',    name: 'AI 工具',  icon: '🤖', color: 3, desc: '智能辅助与本地模型应用' },
  { id: 'dev',   name: '开发工具', icon: '🛠️', color: 4, desc: '开发者日常效率' }
];

window.TOOLS = [
  {
    id: 'image-watermark',
    name: '图片水印工具',
    desc: '给图片批量添加文字或 Logo 水印，支持九宫格定位与平铺防盗图，导出时保持原始分辨率。',
    icon: '💧',
    illustration: 'assets/img/droplet.png',
    category: '图片处理',
    categoryId: 'image',
    tags: ['水印', '批量处理', 'Canvas', '隐私保护'],
    path: 'tools/image-watermark/',
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
  },
  {
    id: 'llm-kill-line',
    name: '大语言模型斩杀线',
    desc: '把各家大模型的「成本 × 表现」画成散点图，点中任意一个模型即可找出所有更便宜且更强的替代者。',
    icon: '🎯',
    category: 'AI 工具',
    categoryId: 'ai',
    tags: ['数据可视化', 'LLM', '选型对比', '散点图'],
    path: 'tools/llm-kill-line/',
    version: '1.0.0',
    updated: '2026-09-19',
    features: [
      '272 个模型的成本 × 性能散点图（内置快照，可一键抓取实时数据）',
      'X 轴可切混合价 / 输入价 / 输出价 / 每任务成本，Y 轴 12 种评测基准',
      '按厂商多选筛选 + 搜索，颜色区分厂商并带图例',
      '点击模型画出斩杀十字线，自动列出「更便宜且更强」的竞品',
      '支持对数刻度、滚轮缩放、拖拽平移、悬停明细'
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
  //   categoryId: 'text',                  // 归属分类，对应上方 CATEGORIES 的 id
  //   tags: ['标签1', '标签2'],
  //   path: 'tools/your-tool/',
  //   version: '0.1.0',
  //   updated: '2026-01-01',
  //   features: ['要点一', '要点二']
  // }
];
