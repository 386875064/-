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

  // 加载小组列表（替换为Supabase，保留日志+loading配对）
  loadGroups() {
    console.log('开始加载小组列表');
    const app = getApp();
    const { supabaseUrl, supabaseKey } = app.globalData;

    wx.showLoading({ title: '加载小组...' });
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
        console.log('加载小组成功：', res.data);
        wx.hideLoading();
        this.setData({ groupList: res.data || [] });
      },
      fail: (err) => {
        console.error('加载小组失败：', err);
        wx.hideLoading();
        wx.showToast({ title: '加载失败', icon: 'none' });
        // 兜底：显示空列表
        this.setData({ groupList: [] });
      }
    });
  },

  // 输入小组名称（保留原有逻辑）
  onGroupNameInput(e) {
    this.setData({ newGroupName: e.detail.value.trim() });
    console.log('输入的小组名称：', this.data.newGroupName);
  },

  // 新增小组（替换云函数为Supabase API）
  addGroup() {
    console.log('===== 点击了新增小组按钮 =====');
    const newGroupName = this.data.newGroupName;
    if (!newGroupName) {
      wx.showToast({ title: '请输入小组名称', icon: 'none' });
      return;
    }

    const app = getApp();
    const { supabaseUrl, supabaseKey } = app.globalData;
    // 生成唯一小组ID（替代云开发的自动ID）
    const groupId = 'g_' + Date.now() + '_' + Math.random().toString(36).substr(2, 8);

    wx.showLoading({ title: '添加中...' });
    wx.request({
      url: `${supabaseUrl}/rest/v1/groups`,
      method: 'POST',
      header: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation'
      },
      data: {
        id: groupId,
        group_name: newGroupName,
        create_time: new Date().toISOString()
      },
      dataType: 'json',
      responseType: 'text',
      success: (res) => {
        wx.hideLoading();
        console.log('新增小组成功：', res.data);
        if (res.statusCode === 201) {
          wx.showToast({ title: '添加成功！', icon: 'success' });
          this.setData({ newGroupName: '' });
          this.loadGroups(); // 刷新列表
        } else {
          wx.showToast({ title: '添加失败', icon: 'none' });
        }
      },
      fail: (err) => {
        wx.hideLoading();
        console.error('新增小组失败：', err);
        wx.showToast({ title: '添加失败', icon: 'none' });
      }
    });
  },

  // 删除小组（替换云函数为Supabase API）
  deleteGroup(e) {
    console.log('===== 点击了删除小组按钮 =====');
    const groupId = e.currentTarget.dataset.groupid;
    console.log('要删除的小组ID：', groupId);

    if (!groupId) {
      wx.showToast({ title: '小组ID异常', icon: 'none' });
      return;
    }

    wx.showModal({
      title: '确认删除',
      content: '删除后该小组的打卡数据不会删除，仅删除小组信息，是否确定？',
      cancelText: '取消',
      confirmText: '确定删除',
      success: (res) => {
        if (res.confirm) {
          const app = getApp();
          const { supabaseUrl, supabaseKey } = app.globalData;

          wx.showLoading({ title: '删除中...' });
          wx.request({
            // Supabase删除接口：用ID过滤 + 设置DELETE方法
            url: `${supabaseUrl}/rest/v1/groups?id=eq.${groupId}`,
            method: 'DELETE',
            header: {
              'apikey': supabaseKey,
              'Authorization': `Bearer ${supabaseKey}`,
              'Prefer': 'return=representation'
            },
            dataType: 'json',
            responseType: 'text',
            success: (res) => {
              wx.hideLoading();
              console.log('删除小组成功：', res);
              if (res.statusCode === 204 || res.statusCode === 200) {
                wx.showToast({ title: '删除成功！', icon: 'success' });
                this.loadGroups(); // 刷新列表
              } else {
                wx.showToast({ title: '删除失败', icon: 'none' });
              }
            },
            fail: (err) => {
              wx.hideLoading();
              console.error('删除小组失败：', err);
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