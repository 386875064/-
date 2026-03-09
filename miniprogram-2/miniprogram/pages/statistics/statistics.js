// pages/statistics/statistics.js
Page({
  data: {
    todayDate: '',
    statisticsList: [],
    isAdmin: false
  },

  onLoad() {
    console.log('===== 打卡统计页面加载 =====');
    // 格式化今日日期
    const today = new Date();
    const year = today.getFullYear();
    const month = (today.getMonth() + 1).toString().padStart(2, '0');
    const day = today.getDate().toString().padStart(2, '0');
    this.setData({ todayDate: `${year}-${month}-${day}` });

    // 校验管理员权限
    this.checkAdminPermission();
  },

  onShow() {
    if (this.data.isAdmin) {
      this.loadStatistics();
    }
  },

  // 管理员权限校验（完整无错）
  checkAdminPermission() {
    wx.showLoading({ title: '权限校验中...' });
    const app = getApp();

    // 调用app的getOpenID方法
    app.getOpenID().then(currentOpenid => {
      console.log('当前用户OpenID：', currentOpenid);

      if (!currentOpenid) {
        wx.hideLoading();
        wx.showToast({ title: '获取用户信息失败', icon: 'none' });
        wx.redirectTo({ url: '/pages/checkin/checkin' });
        return;
      }

      const db = wx.cloud.database();
      db.collection('admins').where({
        openid: currentOpenid
      }).get({
        success: (res) => {
          console.log('查询到的管理员：', res.data);
          wx.hideLoading();
          if (res.data.length > 0) {
            this.setData({ isAdmin: true });
            this.loadStatistics();
          } else {
            wx.showToast({ title: '你无管理员权限', icon: 'none' });
            setTimeout(() => {
              wx.redirectTo({ url: '/pages/checkin/checkin' });
            }, 1500);
          }
        },
        fail: (err) => {
          wx.hideLoading();
          console.error('权限校验失败：', err);
          wx.showToast({ title: '权限校验失败', icon: 'none' });
          wx.redirectTo({ url: '/pages/checkin/checkin' });
        }
      });
    }).catch(err => {
      wx.hideLoading();
      console.error('获取OpenID失败：', err);
      wx.showToast({ title: '获取用户信息失败', icon: 'none' });
      wx.redirectTo({ url: '/pages/checkin/checkin' });
    });
  },

  // 加载统计数据
  loadStatistics() {
    wx.showLoading({ title: '统计数据中...' });
    const db = wx.cloud.database();
    const _ = db.command;
    const todayStart = new Date(this.data.todayDate).getTime();
    const todayEnd = todayStart + 24 * 60 * 60 * 1000 - 1;

    // 获取所有小组
    db.collection('groups').get({
      success: (groupsRes) => {
        const groups = groupsRes.data;
        if (groups.length === 0) {
          wx.hideLoading();
          this.setData({ statisticsList: [] });
          return;
        }

        // 获取今日打卡记录
        db.collection('checkin_records').where({
          checkinTime: _.gte(todayStart).and(_.lte(todayEnd))
        }).get({
          success: (checkinRes) => {
            wx.hideLoading();
            const checkinRecords = checkinRes.data;

            // 分组统计
            const statisticsList = groups.map(group => {
              const groupCheckin = checkinRecords.filter(record => record.groupId === group.groupId);
              const checkinCount = groupCheckin.length;
              const uncheckinCount = 0; // 后续可优化
              const total = checkinCount + uncheckinCount;
              const rate = total === 0 ? 0 : Math.round((checkinCount / total) * 100);
              const checkinOpenids = groupCheckin.map(record => record.openid);

              return {
                groupId: group.groupId,
                groupName: group.groupName,
                checkinCount,
                uncheckinCount,
                rate,
                checkinOpenids,
                showList: false
              };
            });

            this.setData({ statisticsList });
          },
          fail: (err) => {
            wx.hideLoading();
            console.error('获取打卡记录失败：', err);
            wx.showToast({ title: '统计失败', icon: 'none' });
          }
        });
      },
      fail: (err) => {
        wx.hideLoading();
        console.error('获取小组列表失败：', err);
        wx.showToast({ title: '统计失败', icon: 'none' });
      }
    });
  },

  // 刷新统计数据
  refreshStatistics() {
    this.loadStatistics();
    wx.showToast({ title: '刷新成功', icon: 'success', duration: 1000 });
  },

  // 展开/收起打卡名单
  toggleCheckinList(e) {
    const groupId = e.currentTarget.dataset.groupid;
    const statisticsList = this.data.statisticsList.map(item => {
      if (item.groupId === groupId) {
        item.showList = !item.showList;
      }
      return item;
    });
    this.setData({ statisticsList });
  }
});