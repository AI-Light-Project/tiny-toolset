// 小程序版工具箱 —— 与 Web 版（tools-hub）共用同一套工具定义语义
App({
  globalData: {
    // 工具注册表：加新工具时在此追加，并同步到 app.json 的 pages
    tools: [
      {
        id: 'watermark',
        name: '图片水印',
        desc: '批量添加文字 / Logo 水印，支持九宫格定位与平铺防截图',
        icon: '🖼️',
        path: '/pages/watermark/watermark'
      }
    ]
  }
});
