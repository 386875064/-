// pages/userManager/userManager.js
Page({
  data: {
    userList: [],
    loading: true,
    groupList: [],
    selectedGroupIndex: {}
  },

  onLoad() {
    this.checkAdminAuth();
    this.loadGroupList();
    this.getUserList();
  },

  checkAdminAuth() {
    wx.cloud.callFunction({
      name: 'login',
      success: res => {
        const openid = res.result.openid;
        const db = wx.cloud.database();
        db.collection('admins').where({ openid }).get().then(res => {
          if (res.data.length === 0) {
            wx.showToast({ title: '非管理员禁止访问', icon: 'none' });
            setTimeout(() => wx.navigateBack(), 1500);
          }
        });
      },
      fail: () => {
        wx.showToast({ title: '权限校验失败', icon: 'none' });
        wx.navigateBack();
      }
    });
  },

  // 加载小组+对齐选中值（核心修复）
  loadGroupList() {
    const db = wx.cloud.database();
    db.collection('groups').get().then(res => {
      const groups = res.data || [];
      const groupNames = groups.map(g => g.groupName);
      this.setData({ groupList: groupNames }, () => {
        // 重新计算选中下标
        if (this.data.userList.length > 0) {
          let selectedGroupIndex = {};
          this.data.userList.forEach(user => {
            let index = groupNames.findIndex(name => name === user.groupName);
            selectedGroupIndex[user._id] = index >= 0 ? index : 0;
          });
          this.setData({ selectedGroupIndex });
        }
      });
    }).catch(() => {
      wx.showToast({ title: '加载小组失败', icon: 'none' });
    });
  },

  getUserList() {
    this.setData({ loading: true });
    const db = wx.cloud.database();
    db.collection('users').get().then(res => {
      let userList = res.data || [];
      let selectedGroupIndex = {};
      
      // 初始化选中下标
      userList.forEach(user => {
        let index = this.data.groupList.findIndex(name => name === user.groupName);
        selectedGroupIndex[user._id] = index >= 0 ? index : 0;
      });

      this.setData({
        userList,
        selectedGroupIndex,
        loading: false
      });
    }).catch(() => {
      this.setData({ loading: false });
      wx.showToast({ title: '加载用户失败', icon: 'none' });
    });
  },

  inputNewNickname(e) {
    const userId = e.currentTarget.dataset.userid;
    this.setData({ ['nick_' + userId]: e.detail.value });
  },

  onGroupChange(e) {
    const userId = e.currentTarget.dataset.userid;
    this.setData({ ['selectedGroupIndex.' + userId]: e.detail.value });
  },

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

  updateUserGroup(e) {
    const userId = e.currentTarget.dataset.userid;
    const index = this.data.selectedGroupIndex[userId];
    const groupName = this.data.groupList[index];
    if (!groupName) {
      wx.showToast({ title: '请选择有效小组', icon: 'none' });
      return;
    }
    wx.showModal({
      content: `确定修改小组为：${groupName}？`,
      success: res => {
        if (res.confirm) {
          this.doUpdateGroup(userId, groupName);
        }
      }
    });
  },

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

  doUpdateNick(userId, newNick) {
    wx.cloud.callFunction({
      name: 'updateUserNickname',
      data: { userId, newNickname: newNick },
      success: res => {
        if (res.result.success) {
          wx.showToast({ title: '昵称修改成功' });
          this.getUserList();
        } else {
          wx.showToast({ title: res.result.errMsg, icon: 'none' });
        }
      },
      fail: () => {
        wx.showToast({ title: '调用失败', icon: 'none' });
      }
    });
  },

  doUpdateGroup(userId, groupName) {
    wx.cloud.callFunction({
      name: 'updateUserGroup',
      data: { userId, groupName },
      success: res => {
        if (res.result.success) {
          wx.showToast({ title: '小组修改成功' });
          this.getUserList();
        } else {
          wx.showToast({ title: res.result.errMsg, icon: 'none' });
        }
      },
      fail: () => {
        wx.showToast({ title: '调用失败', icon: 'none' });
      }
    });
  },

  doDeleteUser(userId) {
    wx.cloud.callFunction({
      name: 'deleteUser',
      data: { userId },
      success: res => {
        if (res.result.success) {
          wx.showToast({ title: '删除成功' });
          this.getUserList();
        } else {
          wx.showToast({ title: res.result.errMsg, icon: 'none' });
        }
      },
      fail: () => {
        wx.showToast({ title: '调用失败', icon: 'none' });
      }
    });
  }
});