Page({
  data: {
    userList: [],
    loading: true,
    groupList: [], // 存储小组名称列表
    groupData: [], // 存储完整小组数据（id + name）
    selectedGroupIndex: {}
  },

  onLoad() {
    this.checkAdminAuth();
    this.loadGroupList();
    this.getUserList();
  },

  // 管理员权限校验（替换为Supabase）
  checkAdminAuth() {
    // 从缓存获取OpenID
    const openid = wx.getStorageSync('userOpenid');
    if (!openid) {
      wx.showToast({ title: '获取用户信息失败', icon: 'none' });
      setTimeout(() => wx.navigateBack(), 1500);
      return;
    }

    const app = getApp();
    const { supabaseUrl, supabaseKey } = app.globalData;

    // 查询管理员表
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
        if (res.statusCode !== 200 || !res.data || res.data.length === 0) {
          wx.showToast({ title: '非管理员禁止访问', icon: 'none' });
          setTimeout(() => wx.navigateBack(), 1500);
        }
      },
      fail: () => {
        wx.showToast({ title: '权限校验失败', icon: 'none' });
        wx.navigateBack();
      }
    });
  },

  // 加载小组列表（适配Supabase，分离名称和完整数据）
  loadGroupList() {
    const app = getApp();
    const { supabaseUrl, supabaseKey } = app.globalData;

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
        if (res.statusCode === 200 && res.data) {
          const groupData = res.data;
          const groupList = groupData.map(g => g.group_name); // 只取名称，适配原下拉选择
          this.setData({ groupList, groupData }, () => {
            // 重新计算已加载用户的选中下标
            if (this.data.userList.length > 0) {
              let selectedGroupIndex = {};
              this.data.userList.forEach(user => {
                let index = groupList.findIndex(name => name === user.group_name);
                selectedGroupIndex[user.id] = index >= 0 ? index : 0;
              });
              this.setData({ selectedGroupIndex });
            }
          });
        }
      },
      fail: () => {
        wx.showToast({ title: '加载小组失败', icon: 'none' });
      }
    });
  },

  // 获取用户列表（替换云数据库查询）
  getUserList() {
    this.setData({ loading: true });
    const app = getApp();
    const { supabaseUrl, supabaseKey } = app.globalData;

    wx.request({
      url: `${supabaseUrl}/rest/v1/users?order=create_time.desc`,
      method: 'GET',
      header: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`
      },
      dataType: 'json',
      responseType: 'text',
      success: (res) => {
        let userList = res.statusCode === 200 ? (res.data || []) : [];
        let selectedGroupIndex = {};
        
        // 初始化选中下标（适配Supabase的user.id）
        userList.forEach(user => {
          let index = this.data.groupList.findIndex(name => name === user.group_name);
          selectedGroupIndex[user.id] = index >= 0 ? index : 0;
        });

        this.setData({
          userList,
          selectedGroupIndex,
          loading: false
        });
      },
      fail: () => {
        this.setData({ loading: false });
        wx.showToast({ title: '加载用户失败', icon: 'none' });
      }
    });
  },

  // 输入新昵称（保留原有逻辑，适配user.id）
  inputNewNickname(e) {
    const userId = e.currentTarget.dataset.userid;
    this.setData({ ['nick_' + userId]: e.detail.value });
  },

  // 小组选择变更（保留原有逻辑）
  onGroupChange(e) {
    const userId = e.currentTarget.dataset.userid;
    this.setData({ ['selectedGroupIndex.' + userId]: e.detail.value });
  },

  // 修改昵称确认（保留交互，替换为Supabase API）
  updateNickname(e) {
    const userId = e.currentTarget.dataset.userid;
    const newNick = this.data['nick_' + userId];
    if (!newNick) {
      wx.showToast({ title: '请输入新昵称', icon: 'none' });
      return;
    }
    wx.showModal({
      content: `确定修改昵称为：${newNick}？`,
      success: res => {
        if (res.confirm) {
          this.doUpdateNick(userId, newNick);
        }
      }
    });
  },

  // 修改小组确认（保留交互，替换为Supabase API）
  updateUserGroup(e) {
    const userId = e.currentTarget.dataset.userid;
    const index = this.data.selectedGroupIndex[userId];
    const groupName = this.data.groupList[index];
    if (!groupName) {
      wx.showToast({ title: '请选择有效小组', icon: 'none' });
      return;
    }
    // 获取选中小组的ID
    const selectedGroup = this.data.groupData.find(g => g.group_name === groupName);
    const groupId = selectedGroup ? selectedGroup.id : '';
    
    wx.showModal({
      content: `确定修改小组为：${groupName}？`,
      success: res => {
        if (res.confirm) {
          this.doUpdateGroup(userId, groupName, groupId);
        }
      }
    });
  },

  // 删除用户确认（保留交互，替换为Supabase API）
  deleteUser(e) {
    const userId = e.currentTarget.dataset.userid;
    const nickname = e.currentTarget.dataset.nickname;
    wx.showModal({
      title: '警告',
      content: `确定删除 ${nickname}？不可恢复！`,
      confirmColor: '#ff3b30',
      success: res => {
        if (res.confirm) {
          this.doDeleteUser(userId);
        }
      }
    });
  },

  // 执行修改昵称（Supabase PATCH接口）
  doUpdateNick(userId, newNick) {
    const app = getApp();
    const { supabaseUrl, supabaseKey } = app.globalData;

    wx.request({
      url: `${supabaseUrl}/rest/v1/users?id=eq.${userId}`,
      method: 'PATCH',
      header: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json'
      },
      data: { nickname: newNick },
      dataType: 'json',
      responseType: 'text',
      success: () => {
        wx.showToast({ title: '昵称修改成功' });
        this.getUserList(); // 刷新列表
      },
      fail: () => {
        wx.showToast({ title: '修改失败', icon: 'none' });
      }
    });
  },

  // 执行修改小组（Supabase PATCH接口）
  doUpdateGroup(userId, groupName, groupId) {
    const app = getApp();
    const { supabaseUrl, supabaseKey } = app.globalData;

    wx.request({
      url: `${supabaseUrl}/rest/v1/users?id=eq.${userId}`,
      method: 'PATCH',
      header: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json'
      },
      data: { 
        group_name: groupName,
        group_id: groupId // 同步更新group_id
      },
      dataType: 'json',
      responseType: 'text',
      success: () => {
        wx.showToast({ title: '小组修改成功' });
        this.getUserList(); // 刷新列表
      },
      fail: () => {
        wx.showToast({ title: '修改失败', icon: 'none' });
      }
    });
  },

  // 执行删除用户（Supabase DELETE接口）
  doDeleteUser(userId) {
    const app = getApp();
    const { supabaseUrl, supabaseKey } = app.globalData;

    wx.request({
      url: `${supabaseUrl}/rest/v1/users?id=eq.${userId}`,
      method: 'DELETE',
      header: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`
      },
      dataType: 'json',
      responseType: 'text',
      success: () => {
        wx.showToast({ title: '删除成功' });
        this.getUserList(); // 刷新列表
      },
      fail: () => {
        wx.showToast({ title: '删除失败', icon: 'none' });
      }
    });
  }
});