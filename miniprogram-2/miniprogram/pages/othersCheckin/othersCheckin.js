// pages/othersCheckin/othersCheckin.js
Page({
  data: {
    list: []
  },

  onLoad() {
    this.getCheckinRecords();
  },

  // 获取所有打卡记录（保留原有逻辑）
  getCheckinRecords() {
    wx.showLoading({ title: '加载中...' });
    const db = wx.cloud.database();
    db.collection('checkin_records')
      .orderBy('checkinTime', 'desc')
      .get()
      .then(res => {
        wx.hideLoading();
        this.setData({ list: res.data || [] });
      })
      .catch(err => {
        wx.hideLoading();
        wx.showToast({ title: '加载失败', icon: 'none' });
        console.error('打卡记录加载错误：', err);
      });
  },

  // 音频播放（回退到 innerAudioContext，去掉播放中状态，保证能播放）
  playAudio(e) {
    const audioUrl = e.currentTarget.dataset.url;
    if (!audioUrl) {
      wx.showToast({ title: '音频链接无效', icon: 'none' });
      return;
    }

    // 原生音频播放（兼容所有设备）
    const innerAudioContext = wx.createInnerAudioContext();
    innerAudioContext.src = audioUrl;
    innerAudioContext.play();
    
    // 播放错误提示
    innerAudioContext.onError((err) => {
      wx.showToast({ title: '音频播放失败', icon: 'none' });
      console.error('音频错误：', err);
    });
  },

  // 图片预览（最简逻辑，100%生效）
  previewImage(e) {
    const current = e.currentTarget.dataset.imgurl;
    const urls = e.currentTarget.dataset.imglist;

    // 强制兜底，避免空值
    if (!current) {
      wx.showToast({ title: '图片链接无效', icon: 'none' });
      return;
    }
    const finalUrls = urls && Array.isArray(urls) ? urls : [current];

    wx.previewImage({
      current: current,
      urls: finalUrls,
      fail: () => {
        wx.showToast({ title: '预览失败，请重试', icon: 'none' });
      }
    });
  }
});