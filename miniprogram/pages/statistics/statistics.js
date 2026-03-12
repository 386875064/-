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

  // 管理员权限校验（替换为Supabase，保留原有逻辑）
  checkAdminPermission() {
    wx.showLoading({ title: '权限校验中...' });
    // 从缓存获取OpenID（替代app.getOpenID）
    const currentOpenid = wx.getStorageSync('userOpenid');

    if (!currentOpenid) {
      wx.hideLoading();
      wx.showToast({ title: '获取用户信息失败', icon: 'none' });
      wx.redirectTo({ url: '/pages/checkin/checkin' });
      return;
    }
    console.log('当前用户OpenID：', currentOpenid);

    const app = getApp();
    const { supabaseUrl, supabaseKey } = app.globalData;

    // 查询管理员表
    wx.request({
      url: `${supabaseUrl}/rest/v1/admins?openid=eq.${currentOpenid}`,
      method: 'GET',
      header: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`
      },
      dataType: 'json',
      responseType: 'text',
      success: (res) => {
        wx.hideLoading();
        console.log('查询到的管理员：', res.data);
        if (res.statusCode === 200 && res.data && res.data.length > 0) {
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
  },

  // 加载统计数据（核心修改：新增用户表查询，匹配OpenID到昵称）
  loadStatistics() {
    wx.showLoading({ title: '统计数据中...' });
    const app = getApp();
    const { supabaseUrl, supabaseKey } = app.globalData;
    const todayDate = this.data.todayDate;

    // 第一步：获取所有小组
    wx.request({
      url: `${supabaseUrl}/rest/v1/groups?order=create_time.asc`,
      method: 'GET',
      header: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`
      },
      dataType: 'json',
      responseType: 'text',
      success: (groupsRes) => {
        if (groupsRes.statusCode !== 200 || !groupsRes.data || groupsRes.data.length === 0) {
          wx.hideLoading();
          this.setData({ statisticsList: [] });
          return;
        }
        const groups = groupsRes.data;

        // 第二步：获取今日打卡记录（按date字段过滤）
        wx.request({
          url: `${supabaseUrl}/rest/v1/checkin_records?date=eq.${todayDate}`,
          method: 'GET',
          header: {
            'apikey': supabaseKey,
            'Authorization': `Bearer ${supabaseKey}`
          },
          dataType: 'json',
          responseType: 'text',
          success: (checkinRes) => {
            const checkinRecords = checkinRes.statusCode === 200 ? (checkinRes.data || []) : [];
            console.log('今日打卡记录：', checkinRecords);

            // 第三步：新增 - 获取所有用户信息，建立OpenID→昵称映射
            wx.request({
              url: `${supabaseUrl}/rest/v1/users`, // 用户表接口
              method: 'GET',
              header: {
                'apikey': supabaseKey,
                'Authorization': `Bearer ${supabaseKey}`
              },
              dataType: 'json',
              responseType: 'text',
              success: (userRes) => {
                wx.hideLoading();
                const userList = userRes.statusCode === 200 ? (userRes.data || []) : [];
                // 构建OpenID到昵称的映射表
                const openidToNickname = {};
                userList.forEach(user => {
                  openidToNickname[user.openid] = user.nickname || '未知用户';
                });

                // 分组统计（适配Supabase字段名 + 新增昵称映射）
                const statisticsList = groups.map(group => {
                  // 按group_id匹配（替代原groupId）
                  const groupCheckin = checkinRecords.filter(record => record.group_id === group.id);
                  const checkinCount = groupCheckin.length;
                  const uncheckinCount = 0; // 可后续扩展：关联用户表计算未打卡人数
                  const total = checkinCount + uncheckinCount;
                  const rate = total === 0 ? 0 : Math.round((checkinCount / total) * 100);
                  const checkinOpenids = groupCheckin.map(record => record.openid);
                  // 新增：将OpenID转换为昵称
                  const checkinNicknames = groupCheckin.map(record => {
                    return openidToNickname[record.openid] || `未知用户(${record.openid.slice(-6)})`;
                  });

                  return {
                    groupId: group.id, // 适配原逻辑的groupId
                    groupName: group.group_name,
                    checkinCount,
                    uncheckinCount,
                    rate,
                    checkinOpenids, // 保留OpenID（备用）
                    checkinNicknames, // 新增：打卡用户昵称列表
                    showList: false
                  };
                });

                this.setData({ statisticsList });
              },
              fail: (err) => {
                wx.hideLoading();
                console.error('获取用户列表失败：', err);
                wx.showToast({ title: '匹配昵称失败', icon: 'none' });
                // 兜底：仅显示OpenID
                const statisticsList = groups.map(group => {
                  const groupCheckin = checkinRecords.filter(record => record.group_id === group.id);
                  const checkinCount = groupCheckin.length;
                  const uncheckinCount = 0;
                  const total = checkinCount + uncheckinCount;
                  const rate = total === 0 ? 0 : Math.round((checkinCount / total) * 100);
                  const checkinOpenids = groupCheckin.map(record => record.openid);

                  return {
                    groupId: group.id,
                    groupName: group.group_name,
                    checkinCount,
                    uncheckinCount,
                    rate,
                    checkinOpenids,
                    checkinNicknames: checkinOpenids, // 兜底显示OpenID
                    showList: false
                  };
                });
                this.setData({ statisticsList });
              }
            });
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

  // 刷新统计数据（保留原有逻辑）
  refreshStatistics() {
    this.loadStatistics();
    wx.showToast({ title: '刷新成功', icon: 'success', duration: 1000 });
  },

  // 展开/收起打卡名单（完全保留原有逻辑）
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