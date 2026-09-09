# 工具箱 · 微信小程序版（weapp）

`tools-hub` 的微信小程序版本，与 Web 版（`index.html`、各 `tools/*`）共用同一套工具语义。
当前分支 `wechat-miniprogram`，首个移植工具为**图片水印**。

## 运行方式

1. 打开「微信开发者工具」→ 导入项目 → 目录选择本文件夹 `tools-hub/weapp/`。
2. AppID 选择「测试号」即可（`project.config.json` 已填 `touristappid`），或填入自己的小程序 AppID。
3. 编译后首页为工具列表，进入「图片水印」即可使用。

> 需要真机/相册权限：保存图片会请求 `scope.writePhotosAlbum`，首次保存时按提示授权。

## 目录结构

```
weapp/
├── app.js / app.json / app.wxss      全局配置与暗色品牌样式
├── project.config.json / sitemap.json
├── pages/
│   ├── index/                        首页：从 globalData.tools 渲染工具卡片
│   └── watermark/                    图片水印工具页（WXML/JS/WXSS/JSON）
├── utils/
│   └── watermark.js                  水印渲染核心（与 Web 版行为一致）
└── README.md
```

## 图片水印工具

功能对齐 Web 版：

- 模式：文字水印 / 图片（Logo）水印
- 文字：内容、字体（无衬线/衬线/等宽）、字号、不透明度、旋转、斜体、加粗、描边、阴影、颜色（预设色板）
- 位置：九宫格（tl/tc/tr · ml/mc/mr · bl/bc/br）+ 平铺全图防截图（可调间距、交错排列）
- 批量：一次选最多 9 张，逐张处理并保存到相册
- 选图后在预览区实时渲染，所见即所得；导出按原图分辨率重绘，画质无损

渲染核心 `utils/watermark.js` 由 Web 版 `tools/image-watermark/app.js` 的
`buildUnit` / `drawWatermarks` 移植而来，所有尺寸经 `unitOf()` 换算，
因此**预览缩放与导出原尺寸视觉一致**，与 Web 端行为相同。

## 与 Web 版的关键差异（移植注意点）

| 维度 | Web 版 | 小程序版 |
| --- | --- | --- |
| 渲染 | Canvas 2D（DOM canvas） | Canvas 2D（`type="2d"`，需 `SelectorQuery` 取 node） |
| 图片加载 | `new Image()` / `FileReader` | `canvas.createImage()`（异步） |
| 取图 | `<input type=file>` | `wx.chooseMedia` |
| 导出 | `canvas.toBlob` + 自实现 ZIP | `wx.canvasToTempFilePath` → `wx.saveImageToPhotosAlbum` |
| 存储 | `localStorage` 配置 | 可改为 `wx.setStorageSync`（本脚手架暂未持久化配置） |
| 包体积 | 无限制 | 主包 ≤ 2MB（建议大工具走分包） |

## 后续 TODO（待办）

- [ ] 配置持久化（`wx.setStorageSync`）
- [ ] 导出 JPEG 质量可选、WebP 支持
- [ ] 自定义字体（`wx.loadFont`）替换预设字体族
- [ ] 分享给好友 / 生成海报
- [ ] 更多工具迁移（注册表追加 `app.js` 的 `globalData.tools` 并在 `app.json` 加页面）
- [ ] 大图/多图走分包，避免主包超限
