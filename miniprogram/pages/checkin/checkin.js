Page({
  data: {
    nickname: '',
    groupName: '',
    imagePaths: [],
    audioPath: '',
    checkinText: '',
    openid: '',
    audioDuration: 0,
    minAudioDuration: 5,
    isRecording: false,
    recordingTime: 0,
    timer: null,
    isAudioEnough: false
  },

  onLoad(options) {
    const openid = wx.getStorageSync('userOpenid');
    this.setData({ openid });
    this.getUserInfo(openid);

    this.recorderManager = wx.getRecorderManager();
    this.recorderManager.onStop((res) => {
      this.stopRecordingTimer();
      const duration = res.duration / 1000;
      const isAudioEnough = duration >= this.data.minAudioDuration;
      this.setData({
        isRecording: false,
        audioPath: isAudioEnough ? res.tempFilePath : '',
        audioDuration: duration,
        isAudioEnough: isAudioEnough
      });
      if (isAudioEnough) {
        wx.showToast({ title: `录音成功 ${duration}秒`, icon: 'success' });
      } else {
        wx.showToast({ title: `录音不足${this.data.minAudioDuration}秒`, icon: 'none' });
      }
    });
  },

  getUserInfo(openid) {
    const app = getApp();
    const { supabaseUrl, supabaseKey } = app.globalData;
    wx.request({
      url: `${supabaseUrl}/rest/v1/users?openid=eq.${openid}`,
      method: 'GET',
      header: { apikey: supabaseKey, Authorization: `Bearer ${supabaseKey}` },
      success: (res) => {
        if (res.data && res.data.length > 0) {
          const user = res.data[0];
          this.setData({
            nickname: user.nickname || '',
            groupName: user.group_name || ''
          });
        }
      }
    });
  },

  startRecord() {
    this.setData({ audioPath: '', audioDuration: 0, recordingTime: 0, isAudioEnough: false });
    this.recorderManager.start({ format: 'mp3', duration: 60000 });
    this.setData({ isRecording: true });
    this.startRecordingTimer();
  },

  stopRecord() {
    if (this.data.isRecording) this.recorderManager.stop();
  },

  startRecordingTimer() {
    clearInterval(this.data.timer);
    const timer = setInterval(() => {
      this.setData({ recordingTime: this.data.recordingTime + 1 });
      if (this.data.recordingTime >= 60) this.stopRecord();
    }, 1000);
    this.setData({ timer });
  },

  stopRecordingTimer() {
    clearInterval(this.data.timer);
  },

  recordAudio() {
    this.data.isRecording ? this.stopRecord() : this.startRecord();
  },

  chooseImage() {
    wx.chooseImage({
      count: 9,
      sizeType: ['compressed'],
      sourceType: ['album', 'camera'],
      success: (res) => {
        this.setData({ imagePaths: [...this.data.imagePaths, ...res.tempFilePaths] });
      }
    })
  },

  deleteImage(e) {
    const idx = e.currentTarget.dataset.index;
    this.setData({ imagePaths: this.data.imagePaths.filter((_, i) => i != idx) });
  },

  deleteAudio() {
    this.setData({ audioPath: '', audioDuration: 0, isAudioEnough: false });
  },

  inputNickname(e) { this.setData({ nickname: e.detail.value }) },
  inputGroupName(e) { this.setData({ groupName: e.detail.value }) },
  inputCheckinText(e) { this.setData({ checkinText: e.detail.value }) },

  uploadFile(filePath, fileType) {
    return new Promise((resolve, reject) => {
      const app = getApp();
      const { supabaseUrl, supabaseKey, bucketName } = app.globalData;
      const key = `${Date.now()}-${Math.random().toString(36).slice(2)}.${fileType}`;

      wx.uploadFile({
        url: `${supabaseUrl}/storage/v1/object/${bucketName}/${key}`,
        filePath: filePath,
        name: 'file',
        header: { apikey: supabaseKey, Authorization: `Bearer ${supabaseKey}` },
        success: () => {
          const url = `${supabaseUrl}/storage/v1/object/public/${bucketName}/${key}`;
          resolve(url);
        },
        fail: reject
      })
    })
  },

  async uploadAllFiles() {
    let images = [];
    for (let p of this.data.imagePaths) {
      let u = await this.uploadFile(p, 'jpg');
      images.push(u);
    }
    let audio = '';
    if (this.data.audioPath) {
      audio = await this.uploadFile(this.data.audioPath, 'mp3');
    }
    return { imageUrls: images, audioUrl: audio };
  },

  async submitCheckin() {
    if (!this.data.nickname) return wx.showToast({ title: '请输入昵称', icon: 'none' });
    if (!this.data.groupName) return wx.showToast({ title: '请输入小组', icon: 'none' });
    if (!this.data.audioPath) return wx.showToast({ title: '请录音', icon: 'none' });
    if (!this.data.isAudioEnough) return wx.showToast({ title: '录音太短', icon: 'none' });

    wx.showLoading({ title: '提交中...' });

    const { imageUrls, audioUrl } = await this.uploadAllFiles();
    const app = getApp();
    const { supabaseUrl, supabaseKey } = app.globalData;

    const body = {
      openid: this.data.openid,
      nickname: this.data.nickname,
      group_name: this.data.groupName,
      checkin_text: this.data.checkinText || '无',
      image_paths: JSON.stringify(imageUrls),
      audio_path: audioUrl,
      audio_duration: this.data.audioDuration,
      checkin_time: new Date().toLocaleString(),
      create_time: Date.now()
    };

    wx.request({
      url: `${supabaseUrl}/rest/v1/checkin_records`,
      method: 'POST',
      header: {
        apikey: supabaseKey,
        Authorization: `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json'
      },
      data: body,
      success: (res) => {
        wx.hideLoading();
        wx.showToast({ title: '打卡成功', icon: 'success' });
        this.setData({ imagePaths: [], audioPath: '', checkinText: '' });
        setTimeout(() => {
          wx.navigateTo({ url: '/pages/othersCheckin/othersCheckin' });
        }, 1500);
      },
      fail: () => {
        wx.hideLoading();
        wx.showToast({ title: '提交失败', icon: 'none' });
      }
    })
  },

  onUnload() {
    this.stopRecordingTimer();
  }
});