Page({
  data: {
    isRegistered: false, // 是否已注册
    isAdmin: false, // 是否管理员
    showRegisterModal: false, // 注册弹窗是否显示
    nickname: '', // 注册昵称
    groupList: [], // 动态读取的小组列表
    groupData: [], // 完整的小组数据（含ID）
    groupIndex: -1, // 选中的小组索引
    openid: '' // 当前用户openid
  },

  onLoad() {
    const app = getApp();
    // 优先读取缓存的 OpenID，解决刷新登录失败问题
    const cachedOpenid = wx.getStorageSync('userOpenid');
    if (cachedOpenid) {
      this.setData({ openid: cachedOpenid });
      this.checkIsRegistered(cachedOpenid);
      this.checkIsAdmin(cachedOpenid);
    } else {
      // 异步监听 OpenID 加载完成
      const timer = setInterval(() => {
        if (app.globalData.userOpenid) {
          clearInterval(timer);
          this.setData({ openid: app.globalData.userOpenid });
          this.checkIsRegistered(app.globalData.userOpenid);
          this.checkIsAdmin(app.globalData.userOpenid);
        }
      }, 200);
    }
    // 加载小组列表
    this.loadGroupList();
  },

  // 1. 获取用户openid（备用逻辑，优先用缓存）
  getOpenid() {
    const WX_APPID = 'wxfe9718c0ae86fd13';
    const WX_SECRET = 'bbad1fd25dd8a705fa9a4125e6b5ebf8';

    wx.login({
      success: (res) => {
        if (res.code) {
          wx.request({
            url: `https://api.weixin.qq.com/sns/jscode2session?appid=${WX_APPID}&secret=${WX_SECRET}&js_code=${res.code}&grant_type=authorization_code`,
            method: 'GET',
            success: (res) => {
              if (res.data.openid) {
                const openid = res.data.openid;
                this.setData({ openid });
                wx.setStorageSync('userOpenid', openid); // 缓存
                this.checkIsRegistered(openid);
                this.checkIsAdmin(openid);
              } else {
                wx.showToast({ title: '获取用户信息失败', icon: 'none' });
              }
            },
            fail: (err) => {
              wx.showToast({ title: '获取用户信息失败：' + err.errMsg, icon: 'none' });
              console.error('获取openid失败：', err);
            }
          });
        }
      },
      fail: (err) => {
        wx.showToast({ title: '登录失败：' + err.errMsg, icon: 'none' });
      }
    });
  },

  // 2. 加载小组列表（修复参数 + loading 配对）
  loadGroupList() {
    const app = getApp();
    const { supabaseUrl, supabaseKey } = app.globalData;

    wx.showLoading({ title: '加载小组列表...' });
    wx.request({
      url: `${supabaseUrl}/rest/v1/groups?order=create_time.asc`,
      method: 'GET',
      header: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`
      },
      dataType: 'json',
      responseType: 'text',
      success: (res) => {
        wx.hideLoading();
        if (res.statusCode === 200 && res.data && res.data.length > 0) {
          const groupNames = res.data.map(item => item.group_name || item.groupName);
          this.setData({
            groupList: groupNames,
            groupData: res.data
          });
        } else {
          this.setData({
            groupList: ['默认小组'],
            groupData: [{ group_name: '默认小组', id: 'g_default' }]
          });
          wx.showToast({ title: '暂无小组数据，使用默认小组', icon: 'none' });
        }
      },
      fail: (err) => {
        wx.hideLoading();
        wx.showToast({ title: '加载小组失败：' + err.errMsg, icon: 'none' });
        console.error('加载小组列表失败：', err);
        this.setData({
          groupList: ['默认小组'],
          groupData: [{ group_name: '默认小组', id: 'g_default' }]
        });
      }
    });
  },

  // 3. 检查用户是否已注册
  checkIsRegistered(openid) {
    if (!openid) {
      wx.showToast({ title: '用户未登录', icon: 'none' });
      return;
    }
    const app = getApp();
    const { supabaseUrl, supabaseKey } = app.globalData;

    wx.request({
      url: `${supabaseUrl}/rest/v1/users?openid=eq.${openid}`,
      method: 'GET',
      header: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`
      },
      dataType: 'json',
      responseType: 'text',
      success: (res) => {
        if (res.statusCode === 200 && res.data && res.data.length > 0) {
          this.setData({ isRegistered: true });
        } else {
          this.setData({ isRegistered: false });
        }
      },
      fail: (err) => {
        wx.showToast({ title: '检查注册状态失败：' + err.errMsg, icon: 'none' });
        console.error('检查注册状态失败：', err);
      }
    });
  },

  // 4. 检查是否是管理员
  checkIsAdmin(openid) {
    if (!openid) return;
    const app = getApp();
    const { supabaseUrl, supabaseKey } = app.globalData;

    wx.request({
      url: `${supabaseUrl}/rest/v1/admins?openid=eq.${openid}`,
      method: 'GET',
      header: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`
      },
      dataType: 'json',
      responseType: 'text',
      success: (res) => {
        if (res.statusCode === 200 && res.data && res.data.length > 0) {
          this.setData({ isAdmin: true });
        }
      },
      fail: (err) => {
        console.error('检查管理员失败：', err);
      }
    });
  },

  // ===== 注册相关方法 =====
  showRegisterModal() {
    this.setData({ showRegisterModal: true });
  },

  closeRegisterModal() {
    this.setData({ 
      showRegisterModal: false,
      nickname: '',
      groupIndex: -1
    });
  },

  inputNickname(e) {
    this.setData({ nickname: e.detail.value });
  },

  selectGroup(e) {
    this.setData({ groupIndex: e.detail.value });
  },

  doRegister() {
    const app = getApp();
    const { supabaseUrl, supabaseKey } = app.globalData;
    const { nickname, groupIndex, groupData, openid } = this.data;

    if (!nickname.trim()) {
      wx.showToast({ title: '请输入昵称', icon: 'none' });
      return;
    }
    if (groupIndex === -1 || !groupData[groupIndex]) {
      wx.showToast({ title: '请选择所属小组', icon: 'none' });
      return;
    }
    if (!openid) {
      wx.showToast({ title: '请先登录', icon: 'none' });
      return;
    }

    const selectedGroup = groupData[groupIndex];
    wx.showLoading({ title: '注册中...' });
    wx.request({
      url: `${supabaseUrl}/rest/v1/users`,
      method: 'POST',
      header: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation'
      },
      data: {
        openid: openid,
        nickname: nickname.trim(),
        group_name: selectedGroup.group_name || selectedGroup.groupName,
        group_id: selectedGroup.id || selectedGroup._id,
        create_time: new Date().toISOString(),
        update_time: new Date().toISOString()
      },
      dataType: 'json',
      responseType: 'text',
      success: (res) => {
        wx.hideLoading();
        if (res.statusCode === 201) {
          wx.showToast({ title: '注册成功！', icon: 'success' });
          this.setData({
            showRegisterModal: false,
            isRegistered: true
          });
        } else {
          wx.showToast({ title: '注册失败：' + res.errMsg, icon: 'none' });
        }
      },
      fail: (err) => {
        wx.hideLoading();
        wx.showToast({ title: '注册失败：' + err.errMsg, icon: 'none' });
        console.error('注册失败详情：', err);
      }
    });
  },

  // ===== 功能跳转 =====
  goToCheckin() {
    wx.navigateTo({ url: '/pages/checkin/checkin' });
  },

  goToOthersCheckin() {
    wx.navigateTo({ url: '/pages/othersCheckin/othersCheckin' });
  },

  goToGroupManager() {
    wx.navigateTo({ url: '/pages/groupManager/groupManager' });
  },

  goToStatistics() {
    wx.navigateTo({ url: '/pages/statistics/statistics' });
  },

  goToUserManager() {
    wx.navigateTo({ url: '/pages/userManager/userManager' });
  }
});