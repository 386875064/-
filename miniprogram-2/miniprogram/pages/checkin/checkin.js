// pages/checkin/checkin.js
// 引入适配后的 uniCloud 方法
const { db, uploadFile } = require('../../utils/uniCloud.js');

Page({
  /**
   * 页面的初始数据
   */
  data: {
    nickname: '',    // 用户昵称
    groupName: '',   // 小组名
    imagePaths: [],  // 选择的图片本地路径
    audioPath: '',   // 录制的音频本地路径
    checkinText: ''  // 打卡文字内容（可选）
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad(options) {},

  /**
   * 输入框事件处理
   */
  // 输入昵称
  inputNickname(e) {
    this.setData({ nickname: e.detail.value });
  },

  // 输入小组名
  inputGroupName(e) {
    this.setData({ groupName: e.detail.value });
  },

  // 输入打卡文字
  inputCheckinText(e) {
    this.setData({ checkinText: e.detail.value });
  },

  /**
   * 选择图片
   */
  chooseImage() {
    wx.chooseImage({
      count: 9,                  // 最多选择9张
      sizeType: ['original', 'compressed'], // 原图/压缩图
      sourceType: ['album', 'camera'],      // 相册/相机
      success: (res) => {
        // 把选择的图片路径追加到数组
        this.setData({
          imagePaths: [...this.data.imagePaths, ...res.tempFilePaths]
        });
        wx.showToast({ title: `选择了${res.tempFilePaths.length}张图片`, icon: 'none' });
      },
      fail: (err) => {
        wx.showToast({ title: '选择图片失败', icon: 'none' });
        console.error('选择图片错误：', err);
      }
    });
  },

  /**
   * 录制音频
   */
  recordAudio() {
    const recorderManager = wx.getRecorderManager();
    
    // 配置录音参数（mp3格式，低码率节省空间）
    recorderManager.start({
      format: 'mp3',
      bitRate: 16000,
      sampleRate: 16000
    });

    wx.showModal({
      title: '录音提示',
      content: '点击「确定」结束录音',
      showCancel: false,
      success: () => {
        recorderManager.stop();
      }
    });

    // 录音结束回调
    recorderManager.onStop((res) => {
      this.setData({ audioPath: res.tempFilePath });
      wx.showToast({ title: '录音完成', icon: 'success' });
    });

    // 录音错误回调
    recorderManager.onError((err) => {
      wx.showToast({ title: '录音失败', icon: 'none' });
      console.error('录音错误：', err);
    });
  },

  /**
   * 上传图片到 uniCloud 云存储
   */
  async uploadImages() {
    const imageFileIDs = [];
    if (this.data.imagePaths.length === 0) return imageFileIDs;

    wx.showLoading({ title: '上传图片中...' });
    try {
      // 遍历本地图片路径，逐个上传
      for (const path of this.data.imagePaths) {
        // 生成唯一的云存储路径（避免重名）
        const cloudPath = `checkin/images/${Date.now()}_${Math.random().toString(36).substr(2, 10)}.png`;
        // 调用 uniCloud 上传方法
        const uploadResult = await uploadFile(path, cloudPath);
        
        // 验证上传结果，保存 fileID
        if (uploadResult && uploadResult.fileID) {
          imageFileIDs.push(uploadResult.fileID);
        } else {
          console.warn('图片上传返回异常：', uploadResult);
        }
      }
      wx.hideLoading();
      wx.showToast({ title: `成功上传${imageFileIDs.length}张图片`, icon: 'success' });
      return imageFileIDs;
    } catch (err) {
      wx.hideLoading();
      wx.showToast({ title: '图片上传失败', icon: 'none' });
      console.error('图片上传错误：', err);
      return [];
    }
  },

  /**
   * 上传音频到 uniCloud 云存储
   */
  async uploadAudio() {
    if (!this.data.audioPath) return '';

    wx.showLoading({ title: '上传音频中...' });
    try {
      // 生成唯一的云存储路径
      const cloudPath = `checkin/audio/${Date.now()}.mp3`;
      // 调用 uniCloud 上传方法
      const uploadResult = await uploadFile(this.data.audioPath, cloudPath);
      
      wx.hideLoading();
      if (uploadResult && uploadResult.fileID) {
        wx.showToast({ title: '音频上传成功', icon: 'success' });
        return uploadResult.fileID;
      } else {
        wx.showToast({ title: '音频上传返回异常', icon: 'none' });
        return '';
      }
    } catch (err) {
      wx.hideLoading();
      wx.showToast({ title: '音频上传失败', icon: 'none' });
      console.error('音频上传错误：', err);
      return '';
    }
  },

  /**
   * 提交打卡（核心方法）
   */
  async submitCheckin() {
    // 1. 校验必填项
    if (!this.data.nickname.trim()) {
      return wx.showToast({ title: '请输入昵称', icon: 'none' });
    }
    if (!this.data.groupName.trim()) {
      return wx.showToast({ title: '请输入小组名', icon: 'none' });
    }

    wx.showLoading({ title: '提交打卡中...' });
    try {
      // 2. 上传图片和音频
      const imageFileIDs = await this.uploadImages();
      const audioFileID = await this.uploadAudio();

      // 3. 组装打卡数据
      const checkinData = {
        nickname: this.data.nickname.trim(),
        groupName: this.data.groupName.trim(),
        checkinText: this.data.checkinText.trim() || '无',
        imageFileIDs: imageFileIDs,       // 图片文件ID数组
        audioFileID: audioFileID,         // 音频文件ID
        checkinTime: new Date().toLocaleString(), // 本地打卡时间
        createTime: new Date().getTime()  // 时间戳（用于排序）
      };

      // 4. 存储打卡数据到 uniCloud 数据库
      const dbResult = await db.collection('checkin_records').add({
        data: checkinData
      });

      // 5. 提交成功处理
      wx.hideLoading();
      wx.showToast({ title: '打卡成功！', icon: 'success', duration: 2000 });
      console.log('打卡数据存储成功：', dbResult);

      // 6. 跳转到打卡列表页
      setTimeout(() => {
        wx.navigateTo({
          url: '/pages/othersCheckin/othersCheckin'
        });
      }, 1500);

      // 7. 清空表单
      this.setData({
        nickname: '',
        groupName: '',
        imagePaths: [],
        audioPath: '',
        checkinText: ''
      });
    } catch (err) {
      // 错误处理
      wx.hideLoading();
      wx.showToast({ title: '打卡失败，请重试', icon: 'none' });
      console.error('打卡提交错误：', err);
    }
  },

  /**
   * 生命周期函数--监听页面初次渲染完成
   */
  onReady() {},

  /**
   * 生命周期函数--监听页面显示
   */
  onShow() {},

  /**
   * 生命周期函数--监听页面隐藏
   */
  onHide() {},

  /**
   * 生命周期函数--监听页面卸载
   */
  onUnload() {},

  /**
   * 页面相关事件处理函数--监听用户下拉动作
   */
  onPullDownRefresh() {},

  /**
   * 页面上拉触底事件的处理函数
   */
  onReachBottom() {},

  /**
   * 用户点击右上角分享
   */
  onShareAppMessage() {}
});