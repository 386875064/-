Page({
  data: {
    newGroupName: '',
    groupList: []
  },

  onLoad() {
    console.log('===== 小组管理页面加载 =====');
    this.loadGroups();
  },

  onShow() {
    console.log('===== 小组管理页面显示 =====');
    this.loadGroups();
  },

  // 修复loading配对 + 加日志
  loadGroups() {
    console.log('开始加载小组列表');
    wx.showLoading({ title: '加载小组...' });
    const db = wx.cloud.database();
    db.collection('groups').get({
      success: (res) => {
        console.log('加载小组成功：', res.data);
        wx.hideLoading(); // 必须配对
        this.setData({ groupList: res.data });
      },
      fail: (err) => {
        console.error('加载小组失败：', err);
        wx.hideLoading(); // 必须配对
        wx.showToast({ title: '加载失败', icon: 'none' });
      }
    });
  },

  onGroupNameInput(e) {
    this.setData({ newGroupName: e.detail.value.trim() });
    console.log('输入的小组名称：', this.data.newGroupName);
  },

  // 新增小组：加日志+确保loading配对
  addGroup() {
    console.log('===== 点击了新增小组按钮 ====='); // 看是否触发
    if (!this.data.newGroupName) {
      wx.showToast({ title: '请输入小组名称', icon: 'none' });
      return;
    }

    wx.showLoading({ title: '添加中...' });
    console.log('调用云函数新增小组，名称：', this.data.newGroupName);
    wx.cloud.callFunction({
      name: 'groupOperate', // 确认云函数名和部署的一致！
      data: {
        action: 'add',
        groupName: this.data.newGroupName
      },
      success: (res) => {
        wx.hideLoading();
        console.log('云函数返回：', res.result);
        if (res.result.success) {
          wx.showToast({ title: '添加成功！', icon: 'success' });
          this.setData({ newGroupName: '' });
          this.loadGroups();
        } else {
          wx.showToast({ title: res.result.msg, icon: 'none' });
        }
      },
      fail: (err) => {
        wx.hideLoading();
        console.error('云函数调用失败：', err);
        wx.showToast({ title: '添加失败', icon: 'none' });
      }
    });
  },

  // 删除小组：加日志+确保loading配对
  deleteGroup(e) {
    console.log('===== 点击了删除小组按钮 ====='); // 看是否触发
    const groupId = e.currentTarget.dataset.groupid;
    console.log('要删除的小组ID：', groupId);

    wx.showModal({
      title: '确认删除',
      content: '删除后该小组的打卡数据不会删除，仅删除小组信息，是否确定？',
      cancelText: '取消',
      confirmText: '确定删除',
      success: (res) => {
        if (res.confirm) {
          wx.showLoading({ title: '删除中...' });
          console.log('调用云函数删除小组，ID：', groupId);
          wx.cloud.callFunction({
            name: 'groupOperate', // 确认云函数名和部署的一致！
            data: {
              action: 'delete',
              groupId: groupId
            },
            success: (res) => {
              wx.hideLoading();
              console.log('云函数返回：', res.result);
              if (res.result.success) {
                wx.showToast({ title: '删除成功！', icon: 'success' });
                this.loadGroups();
              } else {
                wx.showToast({ title: res.result.msg, icon: 'none' });
              }
            },
            fail: (err) => {
              wx.hideLoading();
              console.error('云函数调用失败：', err);
              wx.showToast({ title: '删除失败', icon: 'none' });
            }
          });
        } else {
          console.log('用户取消删除');
        }
      }
    });
  }
});