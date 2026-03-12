Page({
  data: {
    list: [],
    playingAudioId: '',
    currentAudio: null,
    openid: '',
    showLikerModal: false,
    likerList: [],
    userMap: {},
    audioProgress: {
      currentTime: 0,
      percent: 0
    },
    progressTimer: null
  },

  onLoad: function(options) {
    var openid = wx.getStorageSync('userOpenid') || '';
    this.setData({ openid: openid });
    this.preloadUserMap(function() {
      this.getCheckinRecords();
    }.bind(this));
  },

  // 预加载用户昵称映射（解决点赞列表显示昵称）
  preloadUserMap: function(callback) {
    var app = getApp();
    var supabaseUrl = app.globalData.supabaseUrl;
    var supabaseKey = app.globalData.supabaseKey;

    wx.request({
      url: supabaseUrl + '/rest/v1/users?select=nickname,openid',
      method: 'GET',
      header: {
        apikey: supabaseKey,
        Authorization: 'Bearer ' + supabaseKey
      },
      dataType: 'json',
      success: function(res) {
        var userMap = {};
        if (res.data && res.data.length > 0) {
          for (var i = 0; i < res.data.length; i++) {
            var user = res.data[i];
            userMap[user.openid] = user.nickname || '未知用户';
          }
        }
        this.setData({ userMap: userMap });
        callback && callback();
      }.bind(this),
      fail: function() {
        this.setData({ userMap: {} });
        callback && callback();
      }
    });
  },

  // 获取打卡记录（核心修复：JS 里过滤无效图片）
  getCheckinRecords: function() {
    wx.showLoading({ title: '加载中...' });
    var app = getApp();
    var supabaseUrl = app.globalData.supabaseUrl;
    var supabaseKey = app.globalData.supabaseKey;
    var openid = this.data.openid;
    var userMap = this.data.userMap;

    wx.request({
      url: supabaseUrl + '/rest/v1/checkin_records',
      method: 'GET',
      header: {
        apikey: supabaseKey,
        Authorization: 'Bearer ' + supabaseKey
      },
      dataType: 'json',
      success: function(res) {
        wx.hideLoading();
        if (!res.data || res.data.length === 0) {
          this.setData({ list: [] });
          return;
        }

        var list = [];
        for (var i = 0; i < res.data.length; i++) {
          var item = res.data[i];
          var likedUserOpenids = JSON.parse(item.liked_users || '[]');
          var record = {};

          // 基础信息（含小组名称）
          record.id = item.id || Math.random().toString(36).slice(2);
          record.nickname = item.nickname || '未知昵称';
          record.groupName = item.group_name || '未分组';
          record.checkinTime = item.checkin_time || '';
          record.checkinText = item.checkin_text || '无';
          record.audioPath = item.audio_path || '';
          record.audioDuration = item.audio_duration || 0;
          
          // 核心修复：JS 里过滤无效图片（替代 WXML 的 includes）
          var rawImagePaths = item.image_paths ? JSON.parse(item.image_paths) : [];
          record.imagePaths = rawImagePaths.filter(function(img) {
            // ES5 兼容写法：用 indexOf 替代 includes，过滤空值和400错误链接
            return img && img.length > 0 && img.indexOf('400') === -1;
          });

          record.likes = item.likes || 0;
          record.isLiked = likedUserOpenids.indexOf(openid) > -1;
          record.liked_users = item.liked_users || '[]';
          record.create_time = item.create_time || 0;

          // 转换点赞人openid为昵称
          var likerNicknames = [];
          for (var j = 0; j < likedUserOpenids.length; j++) {
            likerNicknames.push(userMap[likedUserOpenids[j]] || likedUserOpenids[j]);
          }
          record.likerNicknames = likerNicknames;

          list.push(record);
        }

        // 按时间排序
        list.sort(function(a, b) {
          return (b.create_time || 0) - (a.create_time || 0);
        });

        this.setData({ list: list });
      }.bind(this),
      fail: function() {
        wx.hideLoading();
        wx.showToast({ title: '加载失败', icon: 'none' });
      }
    });
  },

  // 音频播放/暂停 + 进度条（修复2秒中断问题）
  toggleAudio: function(e) {
    var id = e.currentTarget.dataset.id;
    var url = e.currentTarget.dataset.url;
    var playingAudioId = this.data.playingAudioId;
    var currentAudio = this.data.currentAudio;
    var progressTimer = this.data.progressTimer;

    // 清除进度定时器
    if (progressTimer) {
      clearInterval(progressTimer);
      this.setData({ progressTimer: null });
    }

    // 重置进度条
    this.setData({
      audioProgress: {
        currentTime: 0,
        percent: 0
      }
    });

    if (playingAudioId === id) {
      // 暂停播放
      if (currentAudio) {
        currentAudio.pause();
        this.setData({ playingAudioId: '' });
      }
      return;
    }

    // 停止之前的音频
    if (currentAudio) {
      currentAudio.stop();
      currentAudio.offTimeUpdate();
      currentAudio.destroy();
    }

    // 创建新音频上下文
    var audio = wx.createInnerAudioContext();
    audio.src = url;
    audio.play();

    // 监听播放进度
    audio.onTimeUpdate(function() {
      var duration = audio.duration || 0;
      var currentTime = audio.currentTime || 0;
      var percent = duration > 0 ? (currentTime / duration) * 100 : 0;
      
      this.setData({
        audioProgress: {
          currentTime: currentTime,
          percent: percent
        }
      });
    }.bind(this));

    // 播放结束
    audio.onEnded(function() {
      if (this.data.progressTimer) {
        clearInterval(this.data.progressTimer);
      }
      this.setData({
        playingAudioId: '',
        currentAudio: null,
        audioProgress: {
          currentTime: 0,
          percent: 0
        },
        progressTimer: null
      });
      audio.destroy();
    }.bind(this));

    // 播放错误
    audio.onError(function() {
      if (this.data.progressTimer) {
        clearInterval(this.data.progressTimer);
      }
      this.setData({
        playingAudioId: '',
        currentAudio: null,
        audioProgress: {
          currentTime: 0,
          percent: 0
        },
        progressTimer: null
      });
      audio.destroy();
      wx.showToast({ title: '音频播放失败', icon: 'none' });
    }.bind(this));

    this.setData({
      playingAudioId: id,
      currentAudio: audio
    });
  },

  // 点赞/取消点赞（实时显示昵称）
  toggleLike: function(e) {
    var id = e.currentTarget.dataset.id;
    var openid = this.data.openid;
    var list = this.data.list;
    var userMap = this.data.userMap;

    if (!openid) {
      wx.showToast({ title: '请先登录', icon: 'none' });
      return;
    }

    var recordIndex = -1;
    var currentRecord = null;
    for (var i = 0; i < list.length; i++) {
      if (list[i].id === id) {
        recordIndex = i;
        currentRecord = list[i];
        break;
      }
    }
    if (recordIndex === -1) return;

    var newLikedUsers = JSON.parse(currentRecord.liked_users || '[]');
    var newLikes = currentRecord.likes || 0;
    var isLikedNow = currentRecord.isLiked;
    var currentUserNickname = userMap[openid] || openid;

    if (isLikedNow) {
      // 取消点赞
      var idx = newLikedUsers.indexOf(openid);
      if (idx > -1) {
        newLikedUsers.splice(idx, 1);
      }
      newLikes -= 1;
      wx.showToast({ title: '取消点赞', icon: 'none' });
    } else {
      // 点赞
      newLikedUsers.push(openid);
      newLikes += 1;
      wx.showToast({ title: '点赞成功', icon: 'none' });
    }

    // 更新列表数据
    var newList = [];
    for (var j = 0; j < list.length; j++) {
      var tmp = {};
      tmp.id = list[j].id;
      tmp.nickname = list[j].nickname;
      tmp.groupName = list[j].groupName;
      tmp.checkinTime = list[j].checkinTime;
      tmp.checkinText = list[j].checkinText;
      tmp.audioPath = list[j].audioPath;
      tmp.audioDuration = list[j].audioDuration;
      tmp.imagePaths = list[j].imagePaths;
      tmp.likes = list[j].likes;
      tmp.isLiked = list[j].isLiked;
      tmp.liked_users = list[j].liked_users;
      tmp.likerNicknames = list[j].likerNicknames;
      tmp.create_time = list[j].create_time;

      if (j === recordIndex) {
        tmp.likes = newLikes;
        tmp.isLiked = !isLikedNow;
        tmp.liked_users = JSON.stringify(newLikedUsers);
        
        // 实时更新昵称列表
        var newLikerNicknames = [];
        for (var k = 0; k < newLikedUsers.length; k++) {
          newLikerNicknames.push(userMap[newLikedUsers[k]] || newLikedUsers[k]);
        }
        tmp.likerNicknames = newLikerNicknames;
      }

      newList.push(tmp);
    }

    this.setData({ list: newList });

    // 同步到云端
    var app = getApp();
    var supabaseUrl = app.globalData.supabaseUrl;
    var supabaseKey = app.globalData.supabaseKey;

    wx.request({
      url: supabaseUrl + '/rest/v1/checkin_records?id=eq.' + id,
      method: 'PATCH',
      header: {
        apikey: supabaseKey,
        Authorization: 'Bearer ' + supabaseKey,
        'Content-Type': 'application/json'
      },
      data: {
        likes: newLikes,
        liked_users: JSON.stringify(newLikedUsers)
      },
      fail: function() {
        wx.showToast({ title: '操作失败', icon: 'none' });
      }
    });
  },

  // 查看点赞人员列表
  showLikers: function(e) {
    var id = e.currentTarget.dataset.id;
    var list = this.data.list;

    var target = null;
    for (var i = 0; i < list.length; i++) {
      if (list[i].id === id) {
        target = list[i];
        break;
      }
    }
    if (!target) {
      wx.showToast({ title: '数据异常', icon: 'none' });
      return;
    }

    this.setData({
      showLikerModal: true,
      likerList: target.likerNicknames || []
    });
  },

  // 关闭点赞弹窗
  closeLikerModal: function() {
    this.setData({ showLikerModal: false });
  },

  // 图片预览（修复嵌套循环+数组传递报错）
  previewImage: function(e) {
    var recordId = e.currentTarget.dataset.recordId;
    var imgIndex = e.currentTarget.dataset.index;
    var list = this.data.list;

    // 查找对应打卡记录
    var targetRecord = null;
    for (var i = 0; i < list.length; i++) {
      if (list[i].id === recordId) {
        targetRecord = list[i];
        break;
      }
    }

    if (!targetRecord || !targetRecord.imagePaths || targetRecord.imagePaths.length === 0) {
      wx.showToast({ title: '无有效图片', icon: 'none' });
      return;
    }

    // 预览图片（已在JS里过滤，直接使用）
    var currentImg = targetRecord.imagePaths[imgIndex] || targetRecord.imagePaths[0];
    wx.previewImage({
      current: currentImg,
      urls: targetRecord.imagePaths
    });
  },

  // 下拉刷新
  onPullDownRefresh: function() {
    this.preloadUserMap(function() {
      this.getCheckinRecords();
      wx.stopPullDownRefresh();
    }.bind(this));
  },

  // 页面卸载清理资源（避免内存泄漏）
  onUnload: function() {
    var currentAudio = this.data.currentAudio;
    var progressTimer = this.data.progressTimer;

    if (progressTimer) {
      clearInterval(progressTimer);
    }
    if (currentAudio) {
      currentAudio.stop();
      currentAudio.offTimeUpdate();
      currentAudio.destroy();
    }
    this.setData({
      playingAudioId: '',
      currentAudio: null,
      progressTimer: null,
      audioProgress: {
        currentTime: 0,
        percent: 0
      }
    });
  }
});