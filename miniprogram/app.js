App({
  globalData: {
    // Supabase 配置（直接使用你的密钥）
    supabaseUrl: 'https://jbzqgdpcudgzsucyxpiy.supabase.co',
    supabaseKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpienFnZHBjdWRnenN1Y3l4cGl5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMwNTYxNDksImV4cCI6MjA4ODYzMjE0OX0.3oEpnfQhAxtQ0dLVrTUfPJXHssuwAzRB2I7DnkLJM4g',
    bucketName: 'checkin-media', // 存储图片/音频的桶名（无需修改）
    // 小程序配置（已填入你的信息）
    appId: 'wxfe9718c0ae86fd13',
    appSecret: 'bbad1fd25dd8a705fa9a4125e6b5ebf8'
  },

  onLaunch() {
    // 自动初始化测试用 openid（无需手动登录）
    if (!wx.getStorageSync('userOpenid')) {
      wx.setStorageSync('userOpenid', `test_openid_${Date.now()}`);
    }
  }
});