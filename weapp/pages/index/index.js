const app = getApp();

Page({
  data: {
    tools: []
  },
  onLoad() {
    this.setData({ tools: app.globalData.tools || [] });
  },
  openTool(e) {
    const path = e.currentTarget.dataset.path;
    if (path) wx.navigateTo({ url: path });
  }
});
