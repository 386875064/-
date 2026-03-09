// app.js
App({
  globalData: {
    openid: ''
  },

  onLaunch() {
    if (!wx.cloud) {
      console.error('请使用 2.2.3 或以上的基础库以使用云能力');
    } else {
      wx.cloud.init({
        env: 'cloud1-3gdd5rno61968b62',
        traceUser: true,
      });
    }

    this.getOpenID().then(openid => {
      this.globalData.openid = openid;
      console.log('云环境连接成功！你的OpenID：', openid);
    }).catch(err => {
      console.error('获取OpenID失败：', err);
    });
  },

  // 获取OpenID
  getOpenID() {
    return new Promise((resolve, reject) => {
      wx.cloud.callFunction({
        name: 'login',
        success: (res) => {
          resolve(res.result.openid);
        },
        fail: (err) => {
          reject(err);
        }
      });
    });
  },

  // 加载所有小组（供注册时选）
  loadAllGroups() {
    return new Promise((resolve, reject) => {
      const db = wx.cloud.database();
      db.collection('groups').get({
        success: (res) => resolve(res.data),
        fail: (err) => reject(err)
      });
    });
  },

  // 用户注册（新增选小组步骤）
  getUserInfo() {
    return new Promise((resolve, reject) => {
      this.getOpenID().then(openid => {
        const db = wx.cloud.database();
        // 查询用户是否已存在
        db.collection('users').where({ openid }).get({
          success: (res) => {
            if (res.data.length > 0) {
              // 已注册：直接返回（含已选小组）
              resolve(res.data[0]);
            } else {
              // 第一步：弹框输入名字
              wx.showModal({
                title: '首次注册',
                content: '请输入你的打卡昵称（一旦注册不可修改）',
                editable: true,
                placeholderText: '例如：张三-技术部',
                confirmText: '下一步选小组',
                success: (nameRes) => {
                  if (!nameRes.confirm || !nameRes.content.trim()) {
                    reject('取消注册，无法打卡');
                    return;
                  }
                  const nickname = nameRes.content.trim();

                  // 第二步：加载小组并让用户选择
                  this.loadAllGroups().then(groups => {
                    if (groups.length === 0) {
                      reject('暂无可用小组，请联系管理员创建');
                      return;
                    }
                    // 组装小组选择的选项
                    const groupItems = groups.map(group => ({
                      label: group.groupName,
                      value: group.groupId
                    }));
                    // 弹框选小组
                    wx.showActionSheet({
                      itemList: groups.map(g => g.groupName),
                      title: '选择你的打卡小组（一旦选择仅管理员可改）',
                      success: (groupRes) => {
                        const selectedGroup = groups[groupRes.tapIndex];
                        // 第三步：存入用户表（含名字+小组）
                        const userData = {
                          openid,
                          nickname,
                          groupId: selectedGroup.groupId,
                          groupName: selectedGroup.groupName,
                          avatar: '',
                          createTime: db.serverDate()
                        };
                        db.collection('users').add({
                          data: userData,
                          success: () => {
                            wx.showToast({ title: '注册成功！', icon: 'success' });
                            resolve(userData);
                          },
                          fail: (err) => reject('注册失败：' + err.errMsg)
                        });
                      },
                      fail: (err) => reject('取消选小组，注册失败')
                    });
                  }).catch(err => reject('加载小组失败：' + err.errMsg));
                },
                fail: (err) => reject('注册弹框失败：' + err.errMsg)
              });
            }
          },
          fail: (err) => reject('查询用户失败：' + err.errMsg)
        });
      }).catch(err => reject('获取OpenID失败：' + err.errMsg));
    });
  }
});