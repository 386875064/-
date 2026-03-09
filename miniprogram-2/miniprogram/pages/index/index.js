// pages/index/index.js
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
    // 1. 先获取当前用户openid
    this.getOpenid();
    // 2. 同时加载小组列表
    this.loadGroupList();
  },

  // 1. 获取用户openid
  getOpenid() {
    wx.cloud.callFunction({
      name: 'login', 
      success: (res) => {
        const openid = res.result.openid;
        this.setData({ openid });
        // 检查是否已注册
        this.checkIsRegistered(openid);
        // 检查是否是管理员
        this.checkIsAdmin(openid);
      },
      fail: (err) => {
        wx.showToast({ title: '获取用户信息失败：' + err.errMsg, icon: 'none' });
        console.error('获取openid失败：', err);
      }
    });
  },

  // 加载小组列表（从数据库动态读取）
  loadGroupList() {
    wx.showLoading({ title: '加载小组列表...' });
    const db = wx.cloud.database();
    db.collection('groups')
      .orderBy('createTime', 'asc') // 按创建时间排序
      .get()
      .then((res) => {
        wx.hideLoading();
        if (res.data && res.data.length > 0) {
          // 提取小组名称列表
          const groupNames = res.data.map(item => item.groupName);
          this.setData({
            groupList: groupNames,
            groupData: res.data // 保存完整小组数据（含ID）
          });
        } else {
          // 兜底：如果数据库没有小组，显示默认值
          this.setData({
            groupList: ['默认小组'],
            groupData: [{ groupName: '默认小组', _id: 'g_default' }]
          });
          wx.showToast({ title: '暂无小组数据，使用默认小组', icon: 'none' });
        }
      })
      .catch((err) => {
        wx.hideLoading();
        wx.showToast({ title: '加载小组失败：' + err.errMsg, icon: 'none' });
        console.error('加载小组列表失败：', err);
        // 兜底
        this.setData({
          groupList: ['默认小组'],
          groupData: [{ groupName: '默认小组', _id: 'g_default' }]
        });
      });
  },

  // 检查用户是否已注册
  checkIsRegistered(openid) {
    const db = wx.cloud.database();
    db.collection('users')
      .where({
        _openid: openid // 云开发自动生成的_openid字段
      })
      .get()
      .then((res) => {
        if (res.data.length > 0) {
          this.setData({ isRegistered: true });
        } else {
          this.setData({ isRegistered: false });
        }
      })
      .catch((err) => {
        wx.showToast({ title: '检查注册状态失败：' + err.errMsg, icon: 'none' });
        console.error('检查注册状态失败：', err);
      });
  },

  // 检查是否是管理员
  checkIsAdmin(openid) {
    const db = wx.cloud.database();
    db.collection('admins')
      .where({
        openid: openid
      })
      .get()
      .then((res) => {
        if (res.data.length > 0) {
          this.setData({ isAdmin: true });
        }
      })
      .catch((err) => {
        console.error('检查管理员失败：', err);
      });
  },

  // ===== 注册相关方法 =====
  // 打开注册弹窗
  showRegisterModal() {
    this.setData({ showRegisterModal: true });
  },

  // 关闭注册弹窗
  closeRegisterModal() {
    this.setData({ 
      showRegisterModal: false,
      nickname: '',
      groupIndex: -1
    });
  },

  // 输入昵称
  inputNickname(e) {
    this.setData({ nickname: e.detail.value });
  },

  // 选择小组
  selectGroup(e) {
    this.setData({ groupIndex: e.detail.value });
  },

  // 执行注册（修复_openid手动赋值问题）
  doRegister() {
    const { nickname, groupIndex, groupData, openid } = this.data;
    // 基础校验
    if (!nickname.trim()) {
      wx.showToast({ title: '请输入昵称', icon: 'none' });
      return;
    }
    if (groupIndex === -1 || !groupData[groupIndex]) {
      wx.showToast({ title: '请选择所属小组', icon: 'none' });
      return;
    }

    // 获取选中的小组信息
    const selectedGroup = groupData[groupIndex];

    wx.showLoading({ title: '注册中...' });
    const db = wx.cloud.database();
    // 写入用户表（去掉手动设置_openid，由云开发自动生成）
    db.collection('users')
      .add({
        data: {
          nickname: nickname.trim(),
          groupName: selectedGroup.groupName, // 小组名称
          groupId: selectedGroup._id, // 小组ID（关联groups表）
          createTime: db.serverDate(),
          updateTime: db.serverDate()
        }
      })
      .then(() => {
        wx.hideLoading();
        wx.showToast({ title: '注册成功！', icon: 'success' });
        // 关闭弹窗，更新注册状态
        this.setData({
          showRegisterModal: false,
          isRegistered: true
        });
      })
      .catch((err) => {
        wx.hideLoading();
        wx.showToast({ title: '注册失败：' + err.errMsg, icon: 'none' });
        console.error('注册失败详情：', err);
      });
  },

  // ===== 功能跳转方法 =====
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